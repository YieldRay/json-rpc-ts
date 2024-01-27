# json-rpc-ts

[![deno.land/x](https://shield.deno.dev/x/json_rpc_ts)](https://deno.land/x/json_rpc_ts)
[![codecov](https://codecov.io/gh/YieldRay/json-rpc-ts/graph/badge.svg?token=BabjRkI8jk)](https://codecov.io/gh/YieldRay/json-rpc-ts)
[![ci](https://github.com/yieldray/json-rpc-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/yieldray/json-rpc-ts/actions/workflows/ci.yml)

A strictly typed json-rpc(2.0) implementation, zero dependency, minimal abstraction, with simple api

> Specification <https://www.jsonrpc.org/specification>

Example to use the client

```ts
const requestForResponse = (json: string) =>
    fetch('http://localhost:6800/jsonrpc', {
        method: 'POST',
        body: json,
    }).then((res) => res.text())

const client = new JSONRPCClient<{
    'aria2.addUri': (
        urls: string[],
        options?: object,
        position?: number,
    ) => string
    'aria2.remove': (gid: string) => string
    'system.listMethods': () => string[]
}>(requestForResponse)

const resultGid: string = await client.request('aria2.addUri', [
    ['https://example.net/index.html'],
    {},
    0,
])
```

Example to use the server

```ts
const server = new JSONRPCServer({
    upper: (str: string) => str.toUpperCase(),
    lower: (str: string) => str.toLowerCase(),
    plus: ([a, b]: [number, number]) => a + b,
    minus: ([a, b]: [number, number]) => a - b,
})

// or:
server.setMethod('trim', (str: string) => str.trim())
server.setMethod('trimStart', (str: string) => str.trimStart())
server.setMethod('trimEnd', (str: string) => str.trimEnd())

const httpServer = Deno.serve(
    async (request) => {
        // server.handleRequest() accept string and returns Promise<string>
        const jsonString = await server.handleRequest(await request.text())

        return new Response(jsonString, {
            headers: { 'content-type': 'application/json' },
        })
    },
)
```

# build for JavaScript

To use this library without typescript, you have to build it to javascript.

```sh
git clone https://github.com/YieldRay/json-rpc-ts.git
cd json-rpc-ts
esbuild --bundle src/index.ts --outdir=dist --format=esm
```
