import { assertEquals, assertObjectMatch } from 'std/assert/mod.ts'
import { JSONRPCClient, JSONRPCServer } from './index.ts'

Deno.test('JSONRPCClient/JSONRPCServer', async () => {
    const methods = {
        upper: (str: string) => str.toUpperCase(),
        lower: (str: string) => str.toLowerCase(),
        plus: ([a, b]: [number, number]) => a + b,
        minus: ([a, b]: [number, number]) => a - b,
    }

    const server = new JSONRPCServer(methods)

    const client = new JSONRPCClient<typeof methods>((json) =>
        server.handleRequest(json)
    )

    assertEquals(await client.request('upper', 'hello'), 'HELLO')
    assertEquals(await client.request('lower', 'WORLD'), 'world')

    assertObjectMatch(
        await client.request(
            'plus',
            // deno-lint-ignore no-explicit-any
            { error_test: 'not an array, so it should throw' } as any,
        ).catch((e) => e),
        {
            code: -32603,
            message: 'Internal error',
        },
    )

    assertObjectMatch(
        await client.request(
            // deno-lint-ignore no-explicit-any
            'no_such_method' as any,
        ).catch((e) => e),
        {
            code: -32601,
            message: 'Method not found',
        },
    )

    assertEquals(
        await client.batch(
            client.createRequest('upper', 'nihao'),
            client.createNotification('lower', 'anything'),
            client.createRequest('upper', 'shijie'),
            client.createRequest('plus', [1, 2]),
            client.createRequest('minus', [1, 2]),
        ),
        [{
            status: 'fulfilled',
            value: 'NIHAO',
        }, {
            status: 'fulfilled',
            value: 'SHIJIE',
        }, {
            status: 'fulfilled',
            value: 3,
        }, {
            status: 'fulfilled',
            value: -1,
        }],
    )
})

Deno.test({
    name: 'JSONRPCServer/Deno.serve()',
    ignore: Deno.permissions.querySync({ name: 'net' })
        .state !==
        'granted',
    fn: async () => {
        const server = new JSONRPCServer()

        server.setMethod('trim', (str: string) => str.trim())
        server.setMethod('trimStart', (str: string) => str.trimStart())
        server.setMethod('trimEnd', (str: string) => str.trimEnd())

        const httpServer = Deno.serve(
            { port: 8888, onListen() {} },
            async (request) => {
                const url = new URL(request.url)
                if (url.pathname === '/jsonrpc') {
                    return new Response(
                        await server.handleRequest(await request.text()),
                        {
                            headers: { 'content-type': 'application/json' },
                        },
                    )
                }
                return new Response('404', { status: 404 })
            },
        )

        const client = new JSONRPCClient((json) =>
            fetch('http://127.0.0.1:8888/jsonrpc', {
                method: 'POST',
                body: json,
                signal: AbortSignal.timeout(5000),
            }).then((res) => res.text())
        )

        assertEquals(await client.request('trim', ' trim '), 'trim')
        assertEquals(await client.request('trimStart', ' trim '), 'trim ')
        assertEquals(await client.request('trimEnd', ' trim '), ' trim')

        await httpServer.shutdown()
    },
})
