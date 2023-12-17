import { assertEquals } from 'std/assert/mod.ts'
import { isJSONRPCError } from './errors.ts'

Deno.test('isJSONRPCError', () => {
    assertEquals(
        isJSONRPCError({
            id: null,
            code: 6,
            message: 'null',
        }),
        true,
    )

    assertEquals(
        isJSONRPCError({
            code: 6,
            message: 'null',
        }),
        false,
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
