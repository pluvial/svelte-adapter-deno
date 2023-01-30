import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
// import { builtinModules } from 'module';

export default [
	{
		input: 'src/index.js',
		output: {
			file: 'files/index.js',
			format: 'esm'
		},
		plugins: [nodeResolve(), commonjs(), json()],
		external: ['ENV', 'HANDLER', './deps.ts']
		// plugins: [nodeResolve({ preferBuiltins: true }), commonjs(), json()],
		// external: ['ENV', 'HANDLER', './deps.ts', ...builtinModules]
	},
	{
		input: 'src/env.js',
		output: {
			file: 'files/env.js',
			format: 'esm'
		},
		plugins: [nodeResolve(), commonjs(), json()],
		external: ['HANDLER']
		// external: ['HANDLER', ...builtinModules]
	},
	{
		input: 'src/handler.js',
		output: {
			file: 'files/handler.js',
			format: 'esm',
			inlineDynamicImports: true
		},
		plugins: [nodeResolve(), commonjs(), json()],
		external: ['ENV', 'MANIFEST', 'SERVER', './deps.ts']
		// external: ['ENV', 'MANIFEST', 'SERVER', './deps.ts', ...builtinModules]
	}
];
