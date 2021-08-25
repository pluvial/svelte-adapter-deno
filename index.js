import { join } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

import {
	createReadStream,
	createWriteStream,
	existsSync,
	// readFileSync,
	statSync,
	writeFileSync
} from 'fs';
import { pipeline } from 'stream';
import glob from 'tiny-glob';
import { promisify } from 'util';
import zlib from 'zlib';

const pipe = promisify(pipeline);

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

		async adapt({ utils, config }) {
			const dirs = {
				files: fileURLToPath(new URL('./files', import.meta.url)),
				static: join(out, 'assets')
			};

			utils.log.minor('Copying assets');
			utils.copy_client_files(dirs.static);
			utils.copy_static_files(dirs.static);

			if (precompress) {
				utils.log.minor('Compressing assets');
				await compress(dirs.static);
			}

			utils.log.minor(`Copying deps.ts: ${deps}`);
			utils.copy(deps, '.svelte-kit/deno/deps.ts');

			utils.log.minor('Building server');
			utils.copy(dirs.files, '.svelte-kit/deno');
			writeFileSync(
				'.svelte-kit/deno/env.js',
				`export const path = Deno.env.get(${JSON.stringify(
					path_env
				)}) ?? false;\nexport const host = Deno.env.get(${JSON.stringify(
					host_env
				)}) ?? '0.0.0.0';\nexport const port = Deno.env.get(${JSON.stringify(
					port_env
				)}) ?? (!path && 3000);`
			);
			/** @type {BuildOptions} */
			const defaultOptions = {
				entryPoints: ['.svelte-kit/deno/index.js'],
				outfile: join(out, 'index.js'),
				bundle: true,
				// external: Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).dependencies || {}),
				format: 'esm',
				// platform: 'browser'
				platform: 'neutral',
				// inject: [join(dirs.files, 'shims.js')],
				define: {
					APP_DIR: `"/${config.kit.appDir}/"`
				},
				sourcemap: 'external'
			};
			const buildOptions = esbuildConfig ? await esbuildConfig(defaultOptions) : defaultOptions;
			await esbuild.build(buildOptions);

			utils.log.minor('Prerendering static pages');
			await utils.prerender({
				dest: `${out}/prerendered`
			});
			if (precompress && existsSync(`${out}/prerendered`)) {
				utils.log.minor('Compressing prerendered pages');
				await compress(`${out}/prerendered`);
			}
		}
	};
}

/**
 * @param {string} directory
 */
async function compress(directory) {
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
