declare module 'ENV' {
	export function env(key: string, fallback?: any): string;

	export const processEnv: Record<string, string>;
}

declare module 'HANDLER' {
	// TODO: this should be an Oak handler instead
	export const handler: import('polka').Middleware;
}

declare module 'MANIFEST' {
	import { SSRManifest } from '@sveltejs/kit';
	export const manifest: SSRManifest;
}

declare module 'SERVER' {
	export { Server } from '@sveltejs/kit';
}

declare namespace App {
	export interface Platform {
		// TODO: this should be something like the Deno global instead

		/**
		 * The original Node request object (https://nodejs.org/api/http.html#class-httpincomingmessage)
		 */
		req: import('http').IncomingMessage;
	}
}
