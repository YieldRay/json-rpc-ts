import type { JSONRPCErrorInterface } from './dto/errors.ts'

export type JSONRPCValue = PrimitiveValue | StructuredValue

export type PrimitiveValue = string | number | boolean | null

export type StructuredValue = ObjectValue | ArrayValue

export type ObjectValue = {
    [key: string]: JSONRPCValue
}

export type ArrayValue = Array<JSONRPCValue>

/**
 * Any function in method set will accept **single** `params` variable,
 * should otherwise *return/resolve* `JSONRPCValue`,
 * or must *throw/reject* `JSONRPCError`
 *
 * If method throws a value that is not `JSONRPCError`, it will be treated as `JSONRPCInternalError`
 *
 * Note that client is allowed to send no params, meaning that params can also be `undefined`
 */
export interface JSONRPCMethods {
    [method: string]: JSONRPCMethod
}

/**
 * Represent any json rpc method, any detailed method should extend it
 *
 * Note that for a request, `params` MUST be `JSONRPCValue`,
 * however here `params` is `any` (just for simplicity)
 */
export type JSONRPCMethod = (
    // deno-lint-ignore no-explicit-any
    params: any, //! client may send any params to server
) => Promise<JSONRPCValue> | JSONRPCValue

export type WithOptionalJSONRPCVersion<T extends object> =
    & Omit<T, 'jsonrpc'>
    & {
        jsonrpc?: '2.0'
    }

// client only

export interface JSONRPCFulfilledResult<T extends JSONRPCValue = JSONRPCValue>
    extends PromiseFulfilledResult<T> {
    value: T
}

export interface JSONRPCRejectedResult extends PromiseRejectedResult {
    reason: JSONRPCErrorInterface
}

export type JSONRPCSettledResult<T extends JSONRPCValue = JSONRPCValue> =
    | JSONRPCFulfilledResult<T>
    | JSONRPCRejectedResult
