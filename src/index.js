import { Application } from './deps.ts';
import { handler } from './handler.js';

export const path = Deno.env.get(PATH_ENV) ?? false;
export const host = Deno.env.get(HOST_ENV) ?? '0.0.0.0';
export const port = Deno.env.get(PORT_ENV) ?? (!path && 3000);

// TODO: add compression middleware
const server = new Application().use(handler);

server.addEventListener('listen', () => {
	console.log(`Listening on http://${addr}`);
});

const addr = path || `${host}:${port}`;
server.listen(addr).catch((err) => {
	console.error('error', err);
});

export { server };
