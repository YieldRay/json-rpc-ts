import {
    assertEquals,
    assertInstanceOf,
    assertObjectMatch,
} from 'std/assert/mod.ts'
import { JSONRPCServer } from './server.ts'
import { isJSONRPCError } from './dto/errors.ts'

Deno.test(
    'server',
    async () => {
        const server = new JSONRPCServer()

        const trim = (str: string) => str.trim()
        const trimStart = (str: string) => str.trimStart()
        const trimEnd = (str: string) => str.trimEnd()

        server.setMethod('trim', trim)
            .setMethod('trimStart', trimStart)
            .setMethod('trimEnd', trimEnd)

        assertInstanceOf(server.getMethod('trim'), Function)
        assertEquals(server.getMethod('not exist'), undefined)

        assertEquals(
            isJSONRPCError(
                JSON.parse(
                    await server.process(JSON.stringify({
                        id: 1,
                        params: ' trim ',
                    })),
                ).error,
            ),
            true,
        )

        assertEquals(
            isJSONRPCError(
                JSON.parse(await server.process('malformed json')).error,
            ),
            true,
        )

        assertObjectMatch(
            JSON.parse(
                await server.process('[]'),
            ),
            {
                id: null,
                error: {},
            },
        )

        assertEquals(
            await server.process(JSON.stringify([{
                jsonrpc: '2.0',
                method: 'trim',
            }])),
            '',
        )

        assertObjectMatch(
            JSON.parse(
                await server.process(JSON.stringify([{
                    jsonrpc: '2.0',
                    id: 1,
                    params: ' trim ',
                }])),
            )[0],
            {
                id: 1,
                error: {
                    code: -32600,
                    message: 'Invalid Request',
                },
            },
        )

        assertObjectMatch(
            JSON.parse(
                await server.process(JSON.stringify([{
                    id: null,
                    params: ' trim ',
                }])),
            )[0],
            {
                id: null,
                error: {},
            },
        )

        assertObjectMatch(
            JSON.parse(
                await server.process(JSON.stringify([{
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'trim',
                    params: ' trim ',
                }, {
                    id: 2,
                    method: 'trim',
                    params: ' trim ',
                }])),
            ),
            {
                0: { jsonrpc: '2.0', id: 1, result: 'trim' },
                1: {
                    jsonrpc: '2.0',
                    id: 2,
                    error: { code: -32600, message: 'Invalid Request' },
                },
            },
        )
    },
)
