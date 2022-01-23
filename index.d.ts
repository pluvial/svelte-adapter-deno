import { Adapter } from '@sveltejs/kit';
import { BuildOptions } from 'esbuild';

interface AdapterOptions {
	out?: string;
	precompress?: boolean;
	serverFile?: string,
	env?: {
		path?: string;
		host?: string;
		port?: string;
	};
	esbuild?: (options: BuildOptions) => Promise<BuildOptions> | BuildOptions;
	deps?: string;
}

declare function plugin(options?: AdapterOptions): Adapter;
export = plugin;
