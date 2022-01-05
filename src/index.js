import { app } from './deps.ts';
import { handler } from './handler.js';

export const path = Deno.env.get(PATH_ENV) ?? false;
export const host = Deno.env.get(HOST_ENV) ?? '0.0.0.0';
export const port = Deno.env.get(PORT_ENV) ?? (!path && 3000);

// TODO: add compression middleware
const server = app().use(handler);

const addr = path || `${host}:${port}`;
const instance = server.listen(addr, (err) => {
	if (err) {
		console.error('error', err);
	} else {
		console.log(`Listening on http://${addr}`);
	}
});

export { server, instance };
