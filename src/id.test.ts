import { assertEquals } from '@std/assert'
import { getIDFromGenerator, isJSONRPCID } from './id.ts'

Deno.test('assertEquals', () => {
    assertEquals(isJSONRPCID(null), true)
    assertEquals(isJSONRPCID(111), true)
    assertEquals(isJSONRPCID('foo'), true)
    assertEquals(isJSONRPCID(false), false)
    assertEquals(isJSONRPCID(undefined), false)
    assertEquals(isJSONRPCID([]), false)
    assertEquals(isJSONRPCID({}), false)

    const gen = (function* () {
        for (;;) {
            yield 6
        }
    })()
    assertEquals(getIDFromGenerator(gen), 6)
    assertEquals(getIDFromGenerator(gen), 6)
    assertEquals(getIDFromGenerator(gen), 6)

    assertEquals(getIDFromGenerator(() => 6), 6)
})
