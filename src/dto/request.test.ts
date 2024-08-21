import { assertEquals } from '@std/assert'
import {
    isJSONRPCRequest,
    JSONRPCNotification,
    JSONRPCRequest,
} from './request.ts'

Deno.test('request', () => {
    assertEquals(
        new JSONRPCNotification({
            method: 'foo',
        }).toString(),
        /*json*/ `{"jsonrpc":"2.0","method":"foo"}`,
    )

    assertEquals(
        new JSONRPCRequest({
            id: 1,
            method: 'foo',
        }).toString(),
        /*json*/ `{"jsonrpc":"2.0","method":"foo","id":1}`,
    )
})

Deno.test('isJSONRPCRequest', () => {
    assertEquals(
        isJSONRPCRequest({
            jsonrpc: '2.0',
            method: 'foo',
            params: null,
        }),
        true,
    )

    assertEquals(
        isJSONRPCRequest({
            jsonrpc: '2.0',
            id: '2.0',
            method: 'foo',
            params: null,
        }),
        true,
    )

    assertEquals(
        isJSONRPCRequest({
            method: 'foo',
        }),
        false,
    )

    assertEquals(
        isJSONRPCRequest(null),
        false,
    )
})
