import type { JSONRPCValue, WithOptionalJSONRPCVersion } from '../types.ts'
import { isJSONRPCID, type JSONRPCID } from '../id.ts'
import { isJSONRPCError, type JSONRPCErrorInterface } from './errors.ts'

/**
 * @see https://www.jsonrpc.org/specification#response_object
 */
export class JSONRPCSuccessResponse {
    public jsonrpc = '2.0' as const
    public id: JSONRPCID
    /**
     * The value of this member is determined by the method invoked on the Server.
     */
    public result: JSONRPCValue

    public constructor(
        object: WithOptionalJSONRPCVersion<JSONRPCSuccessResponse>,
    ) {
        this.id = object.id
        this.result = object.result
    }

    public toString(): string {
        return JSON.stringify({
            jsonrpc: this.jsonrpc,
            id: this.id,
            result: this.result,
        })
    }
}

/**
 * @see https://www.jsonrpc.org/specification#response_object
 */
export class JSONRPCErrorResponse {
    public jsonrpc = '2.0' as const
    /**
     * If there was an error in detecting the id in the Request object (e.g. Parse error/Invalid Request), it MUST be Null.
     */
    public id: JSONRPCID
    public error: JSONRPCErrorInterface

    public constructor(
        object: WithOptionalJSONRPCVersion<JSONRPCErrorResponse>,
    ) {
        this.id = object.id
        this.error = object.error
    }

    public toString(): string {
        return JSON.stringify({
            jsonrpc: this.jsonrpc,
            id: this.id,
            error: {
                code: this.error.code,
                data: this.error.data,
                message: this.error.message,
            },
        })
    }
}

/**
 * @see https://www.jsonrpc.org/specification#response_object
 */
export type JSONRPCResponse = JSONRPCSuccessResponse | JSONRPCErrorResponse

/**
 * Checks whether the given value is a valid JSON-RPC 2.0 Response object.
 */
export function isJSONRPCResponse(x: unknown): x is JSONRPCResponse {
    if (!x || typeof x !== 'object') {
        return false
    }

    if (
        Reflect.get(x, 'jsonrpc') !== '2.0' ||
        (Reflect.has(x, 'error') &&
            !isJSONRPCError(Reflect.get(x, 'error')))
    ) {
        return false
    }
    return isJSONRPCID(Reflect.get(x, 'id'))
}
