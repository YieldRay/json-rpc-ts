import type { JSONRPCErrorInterface } from './dto/errors.ts'

/**
 * This can be used for constrain of type that can be converted to json
 */
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
 * Note that client is allowed to send no params, meaning that params can also be `undefined`,
 * server may also send result `undefined`
 */
export interface JSONRPCMethods {
    // deno-lint-ignore no-explicit-any
    [method: string]: JSONRPCMethod<any, any>
}

/**
 * Represent any json rpc method, any detailed method should extend it
 */
export type JSONRPCMethod<Params, Result> = (
    params: Params,
) => Promise<Result> | Result

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
