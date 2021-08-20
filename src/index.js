import { createServer } from './server.js';
import { render, init } from './app.js';

const hostname = Deno.env.get('HOST') ?? '0.0.0.0';
const port = Deno.env.get('PORT') ?? 3000;

init()

const instance = createServer({ render }).listen({ hostname, port }, (err) => {
	if (err) {
		console.log('error', err);
	} else {
		console.log(`Listening on port ${port}`);
	}
});

export { instance };
