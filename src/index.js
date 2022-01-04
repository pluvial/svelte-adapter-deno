import { App } from 'APP';
import { manifest } from 'MANIFEST';
import { createServer } from './server.js';

export const path = Deno.env.get(PATH_ENV) ?? false;
export const host = Deno.env.get(HOST_ENV) ?? '0.0.0.0';
export const port = Deno.env.get(PORT_ENV) ?? (!path && 3000);

const app = new App(manifest);

const addr = path || `${host}:${port}`;
const instance = createServer(app).listen(addr, (err) => {
	if (err) {
		console.error('error', err);
	} else {
		console.log(`Listening on http://${addr}`);
	}
});

export { instance };
