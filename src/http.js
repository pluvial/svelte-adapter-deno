import { readAll } from 'https://deno.land/std@0.106.0/io/mod.ts';

// import type { ServerRequest } from 'https://deno.land/std@0.106.0/http/server.ts';

/**
 * Converts request headers from Headers to a plain key-value object, as used in node
 * @param {Headers} headers Browser/Deno Headers object
 * @returns {object} Plain key-value headers object
 */
export const headers_to_object = (headers) => Object.fromEntries(headers.entries());

/**
 * @param {ServerRequest} req Deno server request object
 * @returns {Promise<null | Uint8Array>} Resolves with the request body raw buffer
 */
export async function getRawBody(req) {
	const { headers } = req;
	// take the first content-type header
	// TODO: is split(',') enough?
	const type = headers.get('content-type')?.split(/,;\s*/)?.[0];
	if (type === null) {
		return null;
	}

	const data = await readAll(req.body);
  return data;
}
