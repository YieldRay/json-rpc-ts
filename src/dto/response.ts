import { isJSONRPCID } from '../id'
import type { JSONRPCID } from '../types'
import { JSONRPCErrorInterface, isJSONRPCError } from './errors'

export class JSONRPCSuccessResponse {
    public jsonrpc = '2.0' as const
    public id: JSONRPCID
    /**
     * The value of this member is determined by the method invoked on the Server.
     */
    public result: NonNullable<any>

    public constructor(object: {
        jsonrpc?: '2.0'
        id: JSONRPCID
        result: any
    }) {
        this.id = object.id
        this.result = object.result
    }

    public toString() {
        return JSON.stringify({
            jsonrpc: this.jsonrpc,
            id: this.id,
            result: this.result,
        })
    }
}

export class JSONRPCErrorResponse {
    public jsonrpc = '2.0' as const
    /**
     * If there was an error in detecting the id in the Request object (e.g. Parse error/Invalid Request), it MUST be Null.
     */
    public id: JSONRPCID
    public error: JSONRPCErrorInterface

    public constructor(object: {
        jsonrpc?: '2.0'
        id: JSONRPCID
        error: JSONRPCErrorInterface
    }) {
        this.id = object.id
        this.error = object.error
    }

    public toString() {
        return JSON.stringify({
            jsonrpc: this.jsonrpc,
            id: this.id,
            error: this.error,
        })
    }
}

export type JSONRPCResponse = JSONRPCSuccessResponse | JSONRPCErrorResponse

export function isJSONRPCResponse(x: unknown): x is JSONRPCResponse {
    if (!x) {
        return false
    }
    if (
        x instanceof JSONRPCSuccessResponse ||
        x instanceof JSONRPCErrorResponse
    ) {
        return true
    }
    if (Reflect.has(x, 'error') && !isJSONRPCError(Reflect.get(x, 'error'))) {
        return false
    }
    return isJSONRPCID(Reflect.get(x, 'id'))
    // there is no need to check `result`, we even allow it to be undefined
}
