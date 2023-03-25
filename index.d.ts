import { Adapter } from '@sveltejs/kit';

declare global {
	const ENV_PREFIX: string;
}

export interface AdapterOptions {
	out?: string;
	precompress?: boolean;
	envPrefix?: string;
	deps?: string;
	rollupHook?: (options: RollupOptions) => RollupOptions | void;
}

export default function plugin(options?: AdapterOptions): Adapter;
