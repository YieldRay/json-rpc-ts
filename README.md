# json-rpc-ts

[![docs](https://shield.deno.dev/deno/docs)](https://doc.deno.land/https://github.com/YieldRay/json-rpc-ts/raw/main/src/index.ts)

A strictly typed json-rpc(2.0) implemention, zero dependency, minimal abstraction, with simple api

> Specification <https://www.jsonrpc.org/specification>

```ts
const methodSet = {
    upper: (str: string) => str.toUpperCase(),
    lower: (str: string) => str.toLowerCase(),
    plus: ([a, b]: [number, number]) => a + b,
    minus: ([a, b]: [number, number]) => a - b,
}

const server = new JSONRPCServer(methodSet)

const client = new JSONRPCClient<typeof methodSet>((json) =>
    server.process(json)
)

assertEquals(await client.request('upper', 'hello'), 'HELLO')

assertEquals(
    await client.batch(
        client.createRequest('upper', 'nihao'),
        // notifaction does not have response, even when response errors
        client.createNotifaction('upper'),
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
