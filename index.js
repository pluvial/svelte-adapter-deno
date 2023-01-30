import { writeFileSync } from 'fs';
import { builtinModules } from 'module';
import { posix } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const files = fileURLToPath(new URL('./files', import.meta.url));

/** @type {import('.').default} */
export default function (opts = {}) {
	const {
		out = 'build',
		precompress = false,
		envPrefix = '',
		deps = fileURLToPath(new URL('./deps.ts', import.meta.url))
	} = opts;

	return {
		name: 'svelte-adapter-deno',

		async adapt(builder) {
			const tmp = builder.getBuildDirectory('deno');

			builder.rimraf(out);
			builder.rimraf(tmp);
			builder.mkdirp(tmp);

			builder.log.minor('Copying assets');
			builder.writeClient(`${out}/client${builder.config.kit.paths.base}`);
			builder.writePrerendered(`${out}/prerendered${builder.config.kit.paths.base}`);

			if (precompress) {
				builder.log.minor('Compressing assets');
				await Promise.all([
					builder.compress(`${out}/client`),
					builder.compress(`${out}/prerendered`)
				]);
			}

			builder.log.minor('Building server');

			builder.writeServer(tmp);

			writeFileSync(
				`${tmp}/manifest.js`,
				`export const manifest = ${builder.generateManifest({ relativePath: './' })};`
			);

			// const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
			const external = [
				...builtinModules
				// dependencies could have deep exports, so we need a regex
				// ...Object.keys(pkg.dependencies ?? {}).map((d) => new RegExp(`^${d}(\\/.*)?$`))
			];

			await esbuild.build({
				// entryPoints: [`${tmp}/index.js`],
				entryPoints: [`${tmp}/index.js`, `${tmp}/manifest.js`],
				outdir: `${out}/server`,
				// outfile: `${out}/server/index.js`,
				// outfile: `${out}/index.js`,
				bundle: true,
				external,
				format: 'esm',
				platform: 'browser',
				sourcemap: 'external',
				target: 'esnext',
				chunkNames: 'chunks/[name]-[hash]'
			});

			builder.copy(files, out, {
				replace: {
					ENV: './env.js',
					HANDLER: './handler.js',
					MANIFEST: './server/manifest.js',
					SERVER: './server/index.js',
					ENV_PREFIX: JSON.stringify(envPrefix)
				}
			});

			builder.log.minor(`Copying deps.ts: ${deps}`);
			builder.copy(deps, `${out}/deps.ts`);
		}
	};
}
