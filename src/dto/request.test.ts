import { assertEquals } from 'std/assert/mod.ts'
import { isJSONRPCRequest } from './request.ts'

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
})
