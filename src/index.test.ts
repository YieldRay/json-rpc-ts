import { assertEquals, assertObjectMatch } from 'std/assert/mod.ts'
import { JSONRPCClient, JSONRPCServer } from './index.ts'

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
