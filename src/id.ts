import type { JSONRPCID } from './types'

export function* selfAddIdGenerator() {
    let count = 0
    for (;;) {
        yield ++count
    }
}

/**
 * This can be but not mean to javascript Generator
 * Just means a source of ID
 */
export type IDGenerator = Iterator<JSONRPCID> | (() => JSONRPCID)

export function getIDFromGenerator(g: IDGenerator): JSONRPCID {
    if (Symbol.iterator in g) {
        return (g as Iterator<JSONRPCID>).next()[0]
    } else {
        return (g as () => JSONRPCID)()
    }
}

export function isJSONRPCID(x: unknown): x is JSONRPCID {
    return typeof x === 'string' || typeof x === 'number' || x === null
}
