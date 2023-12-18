# json-rpc-ts

[![docs](https://shield.deno.dev/deno/docs)](https://doc.deno.land/https://github.com/YieldRay/json-rpc-ts/raw/main/src/index.ts)

A strictly typed json-rpc implemention, zero dependency, minimal abstraction, with simple api

> Specification <https://www.jsonrpc.org/specification>

```ts
const methodSet = {
    upper: (str: string) => str.toUpperCase(),
} as const

const server = new JSONRPCServer(methodSet)

const client = new JSONRPCClient<typeof methodSet>((json) =>
    server.process(json)
)

assertEquals(await client.request('upper', 'hello'), 'HELLO')

assertEquals(
    await client.batch(
        client.createRequest('upper', 'nihao'),
        client.createNotifaction('upper'),
        client.createRequest('upper', 'shijie'),
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
    ],
)
```
