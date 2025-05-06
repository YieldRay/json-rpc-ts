export type JSONRPCID =
    | string
    | number // SHOULD NOT contain fractional parts
    | null // unknown id

/**
 * Creates a generator that yields incrementing numeric IDs starting from 1.
 */
export function* selfAddIdGenerator(): Generator<number, void, unknown> {
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
        return (g as Iterator<JSONRPCID>).next().value
    } else {
        return (g as () => JSONRPCID)()
    }
}

/**
 * Checks if the given value is a valid JSON-RPC ID.
 * A valid JSON-RPC ID can be a string, a number (without fractional parts), or null.
 */
export function isJSONRPCID(x: unknown): x is JSONRPCID {
    return typeof x === 'string' ||
        (typeof x === 'number' && Number.isInteger(x)) ||
        x === null
}
