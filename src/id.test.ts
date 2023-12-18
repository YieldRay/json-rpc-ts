import { assertEquals } from 'std/assert/mod.ts'
import { isJSONRPCID } from './id.ts'

Deno.test('assertEquals', () => {
    assertEquals(isJSONRPCID(null), true)
    assertEquals(isJSONRPCID(111), true)
    assertEquals(isJSONRPCID('foo'), true)

    assertEquals(isJSONRPCID(false), false)
    assertEquals(isJSONRPCID(undefined), false)
    assertEquals(isJSONRPCID([]), false)
    assertEquals(isJSONRPCID({}), false)
})
