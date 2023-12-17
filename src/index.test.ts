import { assertEquals } from 'std/assert/mod.ts'
import { JSONRPCClient, JSONRPCServer } from './index.ts'

Deno.test('JSONRPCClient/JSONRPCServer', async () => {
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
        [{
            status: 'fulfilled',
            value: 'NIHAO',
        }, {
            status: 'fulfilled',
            value: 'SHIJIE',
        }],
    )
})
