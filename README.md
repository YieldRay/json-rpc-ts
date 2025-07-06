# json-rpc-ts

[![deno.land/x](https://shield.deno.dev/x/json_rpc_ts)](https://deno.land/x/json_rpc_ts)
[![JSR](https://jsr.io/badges/@yieldray/json-rpc-ts)](https://jsr.io/@yieldray/json-rpc-ts)
[![npm](https://img.shields.io/npm/v/@yieldray/json-rpc-ts)](https://www.npmjs.com/package/@yieldray/json-rpc-ts)
[![codecov](https://codecov.io/gh/YieldRay/json-rpc-ts/graph/badge.svg?token=BabjRkI8jk)](https://codecov.io/gh/YieldRay/json-rpc-ts)
[![ci](https://github.com/yieldray/json-rpc-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/yieldray/json-rpc-ts/actions/workflows/ci.yml)

A strictly typed json-rpc(2.0) implementation, zero dependency, minimal abstraction, with a simple API.

> Specification <https://www.jsonrpc.org/specification>

# Installation

For Node.js

```sh
npx jsr add @yieldray/json-rpc-ts # recommended
# or
npm install @yieldray/json-rpc-ts
```

For Deno

```sh
deno add jsr:@yieldray/json-rpc-ts
```

# Examples

Example to use the client:

```ts
import { JSONRPCClient } from '@yieldray/json-rpc-ts'

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

Example to use the server:

```ts
import { JSONRPCServer } from '@yieldray/json-rpc-ts'

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

const handler = async (request: Request): Promise<Response> => {
    // server.handleRequest() accept string and returns Promise<string>
    const jsonString = await server.handleRequest(await request.text())

    return new Response(jsonString, {
        headers: { 'content-type': 'application/json' },
    })
}

const httpServer = Deno.serve(handler)
```

When a server function fails, the server does not throw an exception but instead sends a JSONRPCError to the client, making the error unobservable by default. To handle server errors, you can wrap the server function as follows:

```ts
import {
    JSONRPCInvalidParamsError,
    type JSONRPCMethod,
    type JSONRPCMethods,
    JSONRPCServer,
} from '@yieldray/json-rpc-ts'

function wrapMethod<T, U>(fn: JSONRPCMethod<T, U>): JSONRPCMethod<T, U> {
    return async (arg) => {
        try {
            console.log('Request', arg, fn)
            const result = await fn(arg)
            console.log('Response', result)
            return result
        } catch (e) {
            console.error('Error', e)
            throw e
        }
    }
}

function wrapMethods(methods: JSONRPCMethods): JSONRPCMethods {
    return Object.fromEntries(
        Object.entries(methods).map(([name, fn]) => [
            name,
            typeof fn === 'function' ? wrapMethod(fn.bind(methods)) : fn,
        ]),
    )
}

const methods: JSONRPCMethods = {
    upper: (str: string) => {
        if (typeof str !== 'string') {
            throw new JSONRPCInvalidParamsError(
                'Invalid argument type, expected string',
            )
        }
        // if not JSONRPCxxxError, the client will receive an Internal Error
        return str.toUpperCase()
    },
    lower: (str: string) => str.toLowerCase(),
    plus: ([a, b]: [number, number]) => a + b,
    minus: ([a, b]: [number, number]) => a - b,
}

const server = new JSONRPCServer(wrapMethods(methods))

// or:
const setMethod = <T, U>(name: string, method: JSONRPCMethod<T, U>) =>
    server.setMethod(name, wrapMethod(method))

setMethod('trim', (str: string) => str.trim())
setMethod('trimStart', (str: string) => str.trimStart())
setMethod('trimEnd', (str: string) => str.trimEnd())
```
