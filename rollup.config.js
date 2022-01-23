import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default [{
	input: 'src/handler.js',
	output: {
		file: 'files/handler.js',
		format: 'esm',
		sourcemap: true
	},
	plugins: [nodeResolve(), commonjs(), json()],
	external: ['../output/server/app.js', './deps.ts', ...require('module').builtinModules]
}, {
	input: 'src/server.js',
	output: {
		file: 'files/server.js',
		format: 'esm',
		sourcemap: true
	},
	plugins: [nodeResolve(), commonjs(), json()],

	external: ['../output/server/app.js', './deps.ts', './handler.js', ...require('module').builtinModules]
}];
