import { assertEquals } from '@std/assert'
import { isJSONRPCResponse } from './response.ts'

Deno.test('isJSONRPCResponse', () => {
    assertEquals(
        isJSONRPCResponse({
            jsonrpc: '2.0',
            id: 'foo',
            result: null,
        }),
        true,
    )

    assertEquals(
        isJSONRPCResponse({
            jsonrpc: '1.0',
            id: 'foo',
            result: 'bar',
        }),
        false,
    )

    assertEquals(
        isJSONRPCResponse({
            jsonrpc: '2.0',
            id: 'foo',
            error: null,
        }),
        false,
    )

    assertEquals(
        isJSONRPCResponse(null),
        false,
    )
})
