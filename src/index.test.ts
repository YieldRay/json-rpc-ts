import {
    assertEquals,
    assertInstanceOf,
    assertObjectMatch,
} from 'std/assert/mod.ts'
import {
    JSONRPCClient,
    JSONRPCFulfilledResult,
    JSONRPCServer,
} from './index.ts'

Deno.test('JSONRPCClient/JSONRPCServer', async () => {
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

    assertEquals(await client.request('lower', 'WORLD'), 'world')

    assertObjectMatch(
        await client.request(
            'plus',
            { error_test: 'not an array, so it should throw' } as any,
        ).catch((e) => e),
        {
            code: -32603,
            message: 'Internal error',
        },
    )

    assertObjectMatch(
        await client.request(
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
            client.createNotifaction('lower', 'anything'),
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
    name: 'JSONRPCClient/aria2',
    // also need to run `aria2c --enable-rpc`
    ignore: Deno.permissions.querySync({ name: 'net', host: 'localhost:6800' })
        .state !==
        'granted',
    fn: async () => {
        const ok = await fetch('http://localhost:6800/jsonrpc', {
            signal: AbortSignal.timeout(500),
        }).then((res) => res.ok).catch(() => false)
        if (!ok) {
            // skip when no aria2c jsonrpc is running
            return
        }

        const client = new JSONRPCClient((json) =>
            fetch('http://localhost:6800/jsonrpc', {
                method: 'POST',
                body: json,
            }).then((res) => res.text())
        )

        assertInstanceOf(await client.request('system.listMethods'), Array)

        assertEquals(await client.notify('system.listMethods'), undefined)

        const [r1, r2] = await client.batch(
            client.createRequest('system.listMethods'),
            client.createRequest('system.listMethods'),
        ) as JSONRPCFulfilledResult[]

        assertObjectMatch(r1, { status: 'fulfilled' })
        assertObjectMatch(r2, { status: 'fulfilled' })
    },
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
                        await server.process(await request.text()),
                        {
                            headers: { 'content-type': 'application/json' },
                        },
                    )
                }
                return new Response('404', { status: 404 })
            },
        )

        const client = new JSONRPCClient((json) =>
            fetch('http://localhost:8888/jsonrpc', {
                method: 'POST',
                body: json,
            }).then((res) => res.text())
        )

        assertEquals(await client.request('trim', ' trim '), 'trim')
        assertEquals(await client.request('trimStart', ' trim '), 'trim ')
        assertEquals(await client.request('trimEnd', ' trim '), ' trim')

        await httpServer.shutdown()
    },
})
