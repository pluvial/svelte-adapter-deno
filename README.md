# svelte-adapter-deno-mini

[Adapter](https://kit.svelte.dev/docs#adapters) for SvelteKit apps that generates a standalone Deno server / request handler.

## Usage

Install with `npm i -D svelte-adapter-deno-mini`, then add the adapter to your `svelte.config.js`:

```js
// svelte.config.js
import adapter from 'svelte-adapter-deno-mini';

export default {
  kit: {
    adapter: adapter({
      // default options are shown
      out: 'build',
      deps: './deps.ts' // (relative to adapter-deno package)
    })
  }
};
```

After building the server (`npm run build`), use the following command to start:

```sh
# with the default build directory
deno run --allow-env --allow-read --allow-net build/server.js

# with a custom build directory
deno run --allow-env --allow-read --allow-net path/to/build/server.js
```
You should edit server file to change path and hostname

The server needs at least the following permissions to run:

- `allow-read` - allow file system read access (can be further restricted to include just the necessary directories)
- `allow-net` - allow network access (can be further restricted to include just the necessary domains)

Additionally, `--no-check` can be used if deno complains while typechecking upstream dependencies.

<details>
	<summary>Related Deno issues</summary>

- [Skip type checking for modules outside of user's control #9704](https://github.com/denoland/deno/issues/9704)
- [Make TypeScript diagnostics non-fatal #9737](https://github.com/denoland/deno/issues/9737)
- [Skip type checking by default #11340](https://github.com/denoland/deno/issues/11340)
</details>

## Options

### out

The directory to build the server to. It defaults to `build` — i.e. `deno run --allow-read --allow-net build/server.js` would start the server locally after it has been created.

### serverFile

You can provide your own server file and use `build/handler.js` to handle sveltekit requests. if this option not provided, `build/server.js` will be created

### precompress

Enables precompressing using gzip and brotli for assets and prerendered pages. It defaults to `false`.

### deps

The file re-exporting external runtime dependencies (`deps.ts` by convention in Deno). It defaults to the `deps.ts` included in the package.

## Environment variables

By default, the server will accept connections on `0.0.0.0` using port 3000. These can be customised with the `PORT` and `HOST` environment variables:

```
HOST=127.0.0.1 PORT=4000 deno run --allow-env --allow-read --allow-net build/server.js
```

You can specify different environment variables if necessary using the `env` option.

## Advanced Configuration

### esbuild

As an escape hatch, you may optionally specify a function which will receive the final esbuild options generated by this adapter and returns a modified esbuild configuration. The result of this function will be passed as-is to esbuild. The function can be async.

For example, you may wish to add a plugin:

```js
adapterDeno({
  esbuild(defaultOptions) {
    return {
      ...defaultOptions,
      plugins: []
    };
  }
});
```

The default options for this version are as follows:

```js
{
  entryPoints: ['.svelte-kit/deno/handler.js'],
  outfile: 'build/handler.js',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  sourcemap: 'external'
}
```

## License

[MIT](LICENSE)
