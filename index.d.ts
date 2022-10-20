import { Adapter } from '@sveltejs/kit';

export interface AdapterOptions {
	out?: string;
	precompress?: boolean;
	env?: {
		path?: string;
		host?: string;
		port?: string;
	};
	deps?: string;
}

export default function plugin(options?: AdapterOptions): Adapter;
