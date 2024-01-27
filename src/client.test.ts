import {
    assertEquals,
    assertInstanceOf,
    assertObjectMatch,
} from 'std/assert/mod.ts'
import { JSONRPCClient, JSONRPCClientParseError } from './client.ts'
import { JSONRPCFulfilledResult } from './types.ts'
import { JSONRPCRequest } from './dto/request.ts'
import { JSONRPCErrorResponse, JSONRPCSuccessResponse } from './dto/response.ts'
import { JSONRPCError } from './dto/errors.ts'

Deno.test('client', async () => {
    const client = new JSONRPCClient((json) =>
        new JSONRPCSuccessResponse({
            id: JSON.parse(json).id,
            result: 'bar',
        }).toString()
    )
    assertEquals(await client.request('foo', undefined), 'bar')
    assertEquals(await client.notify('foo', undefined), undefined)
})

Deno.test('client/batch', async () => {
    let client: JSONRPCClient

    client = new JSONRPCClient((json) =>
        JSON.stringify(
            JSON.parse(json).map(({ id }: JSONRPCRequest) =>
                new JSONRPCSuccessResponse({ id, result: 'bar' })
            ),
        )
    )

    assertEquals(await client.batch(client.createRequest('foo', undefined)), [{
        status: 'fulfilled',
        value: 'bar',
    }])

    assertEquals(
        await client.batch(
            client.createRequest('foo', undefined),
        ),
        [{
            status: 'fulfilled',
            value: 'bar',
        }],
    )

    assertEquals(
        await client.batch(
            client.createRequest('foo1', undefined),
            client.createRequest('foo2', undefined),
            client.createRequest('foo3', undefined),
        ),
        [{
            status: 'fulfilled',
            value: 'bar',
        }, {
            status: 'fulfilled',
            value: 'bar',
        }, {
            status: 'fulfilled',
            value: 'bar',
        }],
    )

    assertEquals(
        await client.batch(
            client.createNotification('foo', undefined),
        ),
        [],
    )

    assertEquals(
        await client.batch(
            client.createNotification('foo1', undefined),
            client.createNotification('foo2', undefined),
            client.createNotification('foo3', undefined),
        ),
        [],
    )

    client = new JSONRPCClient(() =>
        `${new JSONRPCErrorResponse({
            id: null,
            error: {
                code: 666,
                message: '666',
            },
        })}`
    )

    assertInstanceOf(
        await client.batch(
            client.createRequest('foo1', undefined),
            client.createRequest('foo2', undefined),
            client.createRequest('foo3', undefined),
        ).catch((e) => e),
        JSONRPCError,
    )

    client = new JSONRPCClient((json) =>
        JSON.stringify(
            JSON.parse(json).map(() =>
                new JSONRPCErrorResponse({
                    id: null,
                    error: {
                        code: 666,
                        message: '666',
                    },
                })
            ),
        )
    )

    assertEquals(
        await client.batch(
            client.createRequest('foo1', undefined),
            client.createRequest('foo2', undefined),
            client.createRequest('foo3', undefined),
        ),
        [{
            status: 'rejected',
            reason: {
                code: 666,
                message: '666',
            },
        }, {
            status: 'rejected',
            reason: {
                code: 666,
                message: '666',
            },
        }, {
            status: 'rejected',
            reason: {
                code: 666,
                message: '666',
            },
        }],
    )
})

Deno.test('client/batch', async () => {
})

Deno.test('client/JSONRPCClientParseError', async () => {
    let client: JSONRPCClient

    client = new JSONRPCClient(() => `malformed json`)

    assertInstanceOf(
        await client.request('foo', undefined).catch((
            e,
        ) => e),
        JSONRPCClientParseError,
    )

    assertInstanceOf(
        await client.batch(client.createRequest('foo', undefined)).catch((
            e,
        ) => e),
        JSONRPCClientParseError,
    )

    assertInstanceOf(
        await new JSONRPCClient(() => `{"incorrect": "response object"}`)
            .request('foo', undefined).catch((
                e,
            ) => e),
        JSONRPCClientParseError,
    )

    assertInstanceOf(
        await new JSONRPCClient(() =>
            `${new JSONRPCSuccessResponse({
                id: Math.random.toString().slice(2),
                result: 6,
            })}`
        )
            .request('foo', undefined).catch((
                e,
            ) => e),
        JSONRPCClientParseError,
    )

    client = new JSONRPCClient(() =>
        JSON.stringify(new Array(10).fill(
            new JSONRPCSuccessResponse({
                id: Math.random.toString().slice(2),
                result: 'bar',
            }),
        ))
    )

    assertInstanceOf(
        await client.batch(
            client.createRequest('foo', undefined),
        ).catch((e) => e),
        JSONRPCClientParseError,
    )

    assertInstanceOf(
        await client.batch(
            client.createRequest('foo1', undefined),
            client.createRequest('foo2', undefined),
            client.createRequest('foo3', undefined),
        ).catch((e) => e),
        JSONRPCClientParseError,
    )

    client = new JSONRPCClient((json) =>
        JSON.stringify(
            JSON.parse(json).map(() => ({ 'malformed': 'response' })),
        )
    )

    assertInstanceOf(
        await client.batch(
            client.createRequest('foo1', undefined),
            client.createRequest('foo2', undefined),
            client.createRequest('foo3', undefined),
        ).catch((e) => e),
        JSONRPCClientParseError,
    )

    client = new JSONRPCClient(() =>
        JSON.stringify(
            {
                jsonrpc: '2.0',
                id: null,
                error: {
                    code: 0,
                    message: 'ERR_MSG',
                },
            },
        )
    )

    assertEquals(
        await client.batch(
            client.createRequest('foo1', undefined),
            client.createRequest('foo2', undefined),
            client.createRequest('foo3', undefined),
        ).catch((e) => e.message),
        'ERR_MSG',
    )

    client = new JSONRPCClient(() =>
        JSON.stringify(
            {
                jsonrpc: '2.0',
                id: null,
                result: 'wrong server',
            },
        )
    )

    assertInstanceOf(
        await client.batch(
            client.createRequest('foo1', undefined),
            client.createRequest('foo2', undefined),
            client.createRequest('foo3', undefined),
        ).catch((e) => e),
        JSONRPCClientParseError,
    )
})

Deno.test({
    name: 'client/aria2',
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

        assertInstanceOf(
            await client.request('system.listMethods', undefined),
            Array,
        )

        assertEquals(
            await client.notify('system.listMethods', undefined),
            undefined,
        )

        const [r1, r2] = await client.batch(
            client.createRequest('system.listMethods', undefined),
            client.createRequest('system.listMethods', undefined),
        ) as JSONRPCFulfilledResult[]

        assertObjectMatch(r1, { status: 'fulfilled' })
        assertObjectMatch(r2, { status: 'fulfilled' })
    },
})
