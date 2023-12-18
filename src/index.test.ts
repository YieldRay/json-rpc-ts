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
            { $: 'not an array, so it should throw' } as any,
        ).catch((e) => e),
        {
            code: -32603,
            message: 'Internal error',
        },
    )

    assertEquals(
        await client.batch(
            client.createRequest('upper', 'nihao'),
            client.createNotifaction('upper', 'anything'),
            client.createRequest('upper', 'shijie'),
        ),
        [{
            status: 'fulfilled',
            value: 'NIHAO',
        }, {
            status: 'fulfilled',
            value: 'SHIJIE',
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
