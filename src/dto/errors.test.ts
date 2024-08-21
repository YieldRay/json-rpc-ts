import { assertEquals, assertInstanceOf } from '@std/assert'
import {
    isJSONRPCError,
    JSONRPCError,
    JSONRPCInternalError,
    JSONRPCInvalidParamsError,
    JSONRPCInvalidRequestError,
    JSONRPCMethodNotFoundError,
    JSONRPCParseError,
} from './errors.ts'

Deno.test('error', () => {
    assertInstanceOf(new JSONRPCParseError(), JSONRPCError)
    assertInstanceOf(new JSONRPCInvalidRequestError(), JSONRPCError)
    assertInstanceOf(new JSONRPCMethodNotFoundError(), JSONRPCError)
    assertInstanceOf(new JSONRPCInvalidParamsError(), JSONRPCError)
    assertInstanceOf(new JSONRPCInternalError(), JSONRPCError)
})

Deno.test('isJSONRPCError', () => {
    assertEquals(
        isJSONRPCError({
            code: 6,
            message: 'null',
        }),
        true,
    )

    assertEquals(
        isJSONRPCError({
            id: 6,
            message: 'null',
        }),
        false,
    )

    assertEquals(
        isJSONRPCError({
            id: 6,
            code: 6,
            message: null,
        }),
        false,
    )
})
