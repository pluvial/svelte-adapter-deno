import { createReadStream, createWriteStream, existsSync, statSync, writeFileSync } from 'fs';
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
			builder.rimraf(out);

			const dirs = {
				deno: builder.getBuildDirectory('deno')
			};

			builder.log.minor('Copying assets');
			builder.writeClient(`${out}/client`);
			builder.writeServer(`${dirs.deno}/server`);
			builder.writeStatic(`${out}/static`);

			builder.log.minor('Prerendering static pages');
			await builder.prerender({
				dest: `${out}/prerendered`
			});

			writeFileSync(
				`${dirs.deno}/manifest.js`,
				`export const manifest = ${builder.generateManifest({
					relativePath: './server'
				})};\n`
			);

			builder.log.minor(`Copying deps.ts: ${deps}`);
			builder.copy(deps, `${dirs.deno}/deps.ts`);

			builder.log.minor('Building server');

			builder.copy(`${files}/index.js`, `${dirs.deno}/index.js`, {
				replace: {
					APP: './server/app.js',
					MANIFEST: './manifest.js',
					PATH_ENV: JSON.stringify(path_env),
					HOST_ENV: JSON.stringify(host_env),
					PORT_ENV: JSON.stringify(port_env)
				}
			});

			/** @type {BuildOptions} */
			const defaultOptions = {
				entryPoints: [`${dirs.deno}/index.js`],
				outfile: `${out}/index.js`,
				bundle: true,
				// external: Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).dependencies || {}),
				format: 'esm',
				// platform: 'browser'
				platform: 'neutral',
				// inject: [join(dirs.files, 'shims.js')],
				sourcemap: 'external'
			};
			const buildOptions = esbuildConfig ? await esbuildConfig(defaultOptions) : defaultOptions;
			await esbuild.build(buildOptions);

			if (precompress) {
				builder.log.minor('Compressing assets');
				await compress(`${out}/client`);
				await compress(`${out}/static`);
				await compress(`${out}/prerendered`);
			}
		}
	};
}

/**
 * @param {string} directory
 */
async function compress(directory) {
	if (!existsSync(directory)) {
		return;
	}

	const files = await glob('**/*.{html,js,json,css,svg,xml}', {
		cwd: directory,
		dot: true,
		absolute: true,
		filesOnly: true
	});

	await Promise.all(
		files.map((file) => Promise.all([compress_file(file, 'gz'), compress_file(file, 'br')]))
	);
}

/**
 * @param {string} file
 * @param {'gz' | 'br'} format
 */
async function compress_file(file, format = 'gz') {
	const compress =
		format == 'br'
			? zlib.createBrotliCompress({
					params: {
						[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
						[zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
						[zlib.constants.BROTLI_PARAM_SIZE_HINT]: statSync(file).size
					}
			  })
			: zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });

	const source = createReadStream(file);
	const destination = createWriteStream(`${file}.${format}`);

	await pipe(source, compress, destination);
}
