import { init, render } from '../output/server/app.js';
import { path, host, port } from './env.js';
import { createServer } from './server.js';

init();

const addr = path || `${host}:${port}`;
const instance = createServer({ render }).listen(addr, (err) => {
	if (err) {
		console.error('error', err);
	} else {
		console.log(`Listening on http://${addr}`);
	}
});

export { instance };
