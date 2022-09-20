import { createReadStream, createWriteStream, existsSync, statSync, writeFileSync } from 'fs';
import { builtinModules } from 'module';
import { posix } from 'path';
import { pipeline } from 'stream';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import zlib from 'zlib';
import esbuild from 'esbuild';
import glob from 'tiny-glob';

const pipe = promisify(pipeline);

const files = fileURLToPath(new URL('./files', import.meta.url));

/**
 * @typedef {import('esbuild').BuildOptions} BuildOptions
 */

/** @type {import('.')} */
export default function ({
	out = 'build',
	precompress,
	env: { path: path_env = 'SOCKET_PATH', host: host_env = 'HOST', port: port_env = 'PORT' } = {},
	esbuild: esbuildConfig,
	deps = fileURLToPath(new URL('./deps.ts', import.meta.url))
} = {}) {
	return {
		name: 'svelte-adapter-deno',

		async adapt(builder) {
			const tmp = builder.getBuildDirectory('deno');

			builder.rimraf(out);
			builder.rimraf(tmp);

			builder.log.minor('Copying assets');
			builder.writeClient(`${out}/client`);
			builder.writeServer(`${tmp}/server`);
			builder.writePrerendered(`${out}/prerendered`);

			const relativePath = posix.relative(tmp, builder.getServerDirectory());
			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath })};\n`
			);

			builder.log.minor(`Copying deps.ts: ${deps}`);
			builder.copy(deps, `${tmp}/deps.ts`);

			builder.log.minor('Building server');

			builder.copy(`${files}/index.js`, `${tmp}/index.js`, {
				replace: {
					SERVER: `${relativePath}/index.js`,
					MANIFEST: './manifest.js',
					PATH_ENV: JSON.stringify(path_env),
					HOST_ENV: JSON.stringify(host_env),
					PORT_ENV: JSON.stringify(port_env)
				}
			});

			// external: Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).dependencies || {}),
			const external = [...builtinModules];

			/** @type {BuildOptions} */
			const defaultOptions = {
				entryPoints: [`${tmp}/index.js`],
				outfile: `${out}/index.js`,
				bundle: true,
				external,
				format: 'esm',
				// platform: 'browser'
				platform: 'neutral',
				sourcemap: 'external',
				target: 'esnext'
			};
			const buildOptions = esbuildConfig ? await esbuildConfig(defaultOptions) : defaultOptions;
			await esbuild.build(buildOptions);

			if (precompress) {
				builder.log.minor('Compressing assets');
				await builder.compress(`${out}/client`);
				await builder.compress(`${out}/prerendered`);
			}
		}
	};
}
