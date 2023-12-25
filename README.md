# json-rpc-ts

[![deno.land/x](https://shield.deno.dev/x/json_rpc_ts)](https://deno.land/x/json_rpc_ts)
[![codecov](https://codecov.io/gh/YieldRay/json-rpc-ts/graph/badge.svg?token=BabjRkI8jk)](https://codecov.io/gh/YieldRay/json-rpc-ts)
[![ci](https://github.com/yieldray/json-rpc-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/yieldray/json-rpc-ts/actions/workflows/ci.yml)

A strictly typed json-rpc(2.0) implementation, zero dependency, minimal abstraction, with simple api

> Specification <https://www.jsonrpc.org/specification>

```ts
const methodSet = {
    upper: (str: string) => str.toUpperCase(),
    lower: (str: string) => str.toLowerCase(),
    plus: ([a, b]: [number, number]) => a + b,
    minus: ([a, b]: [number, number]) => a - b,
}

// initialize all methods with the constructor
const server = new JSONRPCServer(methodSet)

// or add methods manually
const server = new JSONRPCServer<typeof methodSet>()
server.setMethod('upper', methodSet.upper)
server.setMethod('lower', methodSet.lower)
server.setMethod('plus', methodSet.plus)
server.setMethod('minus', methodSet.minus)

// (optional) provide a generic parameter to enable ts check
const client = new JSONRPCClient<typeof methodSet>((json) =>
    server.process(json)
)

// request, Notification and batch are always async
assertEquals(await client.request('upper', 'hello'), 'HELLO')

assertEquals(
    await client.batch(
        client.createRequest('upper', 'nihao'),
        // Notification does not have response, even when response errors
        client.createNotification('upper'),
        client.createRequest('upper', 'shijie'),
        client.createRequest('plus', [1, 1]),
    ),
    [
        {
            status: 'fulfilled',
            value: 'NIHAO',
        },
        {
            status: 'fulfilled',
            value: 'SHIJIE',
        },
        {
            status: 'fulfilled',
            value: 2,
        },
    ],
)
```

Example to use the client

```ts
const client = new JSONRPCClient((json) =>
    fetch('http://localhost:6800/jsonrpc', {
        method: 'POST',
        body: json,
    }).then((res) => res.text())
)

const aria2cMethods = await client.request('system.listMethods')
```

Example to use the server

```ts
const server = new JSONRPCServer()

server.setMethod('trim', (str: string) => str.trim())
server.setMethod('trimStart', (str: string) => str.trimStart())
server.setMethod('trimEnd', (str: string) => str.trimEnd())

const httpServer = Deno.serve(
    async (request) => {
        const url = new URL(request.url)
        if (url.pathname === '/jsonrpc') {
            return new Response(
                // server.process() accept string and returns Promise<string>
                await server.process(await request.text()),
                {
                    headers: { 'content-type': 'application/json' },
                },
            )
        }
        return new Response('404', { status: 404 })
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
