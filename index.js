import { writeFileSync } from 'fs';
// import { builtinModules } from 'module';
import { fileURLToPath } from 'url';
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

const files = fileURLToPath(new URL('./files', import.meta.url));

/** @type {import('.').default} */
export default function (opts = {}) {
	const {
		out = 'build',
		precompress = false,
		envPrefix = '',
		deps = fileURLToPath(new URL('./deps.ts', import.meta.url)),
		rollupHook = (options) => options,
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

			// we bundle the Vite output so that deployments only need
			// their production dependencies. Anything in devDependencies
			// will get included in the bundled code
			const rollupOptions = {
				input: {
					index: `${tmp}/index.js`,
					manifest: `${tmp}/manifest.js`
				},
				external: [
					// dependencies could have deep exports, so we need a regex
					// ...Object.keys(pkg.dependencies || {}).map((d) => new RegExp(`^${d}(\\/.*)?$`))
				],
				plugins: [nodeResolve({ preferBuiltins: true }), commonjs(), json()]
			};
			const bundle = await rollup(rollupHook(rollupOptions) || rollupOptions);

			await bundle.write({
				dir: `${out}/server`,
				format: 'esm',
				sourcemap: true,
				chunkFileNames: 'chunks/[name]-[hash].js'
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
