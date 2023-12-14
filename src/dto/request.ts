import type { JSONRPCID } from '../types'
import { isJSONRPCID } from '../id'

export class JSONRPCNotification {
    public jsonrpc = '2.0' as const
    /**
     * A String containing the name of the method to be invoked. Method names that begin with the word rpc followed by a period character (U+002E or ASCII 46) are reserved for rpc-internal methods and extensions and MUST NOT be used for anything else.
     */
    public method: string
    /**
     * A Structured value that holds the parameter values to be used during the invocation of the method. This member MAY be omitted.
     */
    public params?: any

    public constructor(object: {
        jsonrpc?: '2.0'
        method: string
        params?: any
    }) {
        this.method = object.method
        this.params = object.params
    }

    public toString() {
        return JSON.stringify({
            jsonrpc: this.jsonrpc,
            method: this.method,
            params: this.params,
        })
    }
}

export class JSONRPCRequest extends JSONRPCNotification {
    /**
     * An identifier established by the Client that MUST contain a String, Number, or NULL value if included. If it is not included it is assumed to be a notification. The value SHOULD normally not be Null and Numbers SHOULD NOT contain fractional parts
     */
    public id: JSONRPCID

    public constructor(object: {
        jsonrpc?: '2.0'
        method: string
        params?: any
        id: JSONRPCID
    }) {
        super(object)
        this.id = object.id
    }

    public toString() {
        return JSON.stringify({
            jsonrpc: this.jsonrpc,
            method: this.method,
            params: this.params,
            id: this.id,
        })
    }
}

export function isJSONRPCRequest(
    x: unknown,
): x is JSONRPCNotification | JSONRPCRequest {
    if (!x || typeof x !== 'object') {
        return false
    }
    if (x instanceof JSONRPCNotification) {
        return true
    } else if (
        Reflect.get(x, 'jsonrpc') === '2.0' &&
        typeof Reflect.get(x, 'method') === 'string'
    ) {
        if ('id' in x) {
            return isJSONRPCID(x.id)
        }
        return true
    }
    return false
}
