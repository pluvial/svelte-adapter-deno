import { handler } from 'HANDLER';
import { env } from 'ENV';
import { Application } from './deps.ts';

export const path = env('SOCKET_PATH', false);
export const host = env('HOST', '0.0.0.0');
export const port = env('PORT', !path && '3000');

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
