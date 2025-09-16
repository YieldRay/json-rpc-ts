import type { JSONRPCValue, WithOptionalJSONRPCVersion } from '../types.ts'
import { isJSONRPCID, type JSONRPCID } from '../id.ts'

/**
 * You should create this object using a method from `JSONRPCClient`, which generates the ID for you.
 *
 * It is unlikely that you will need to create this object manually.
 */
export class JSONRPCNotification {
    public jsonrpc = '2.0' as const
    /**
     * A String containing the name of the method to be invoked. Method names that begin with the word rpc followed by a period character (U+002E or ASCII 46) are reserved for rpc-internal methods and extensions and MUST NOT be used for anything else.
     */
    public method: string
    /**
     * A Structured value that holds the parameter values to be used during the invocation of the method. This member MAY be omitted.
     */
    public params?: JSONRPCValue

    public constructor(
        object: WithOptionalJSONRPCVersion<JSONRPCNotification>,
    ) {
        this.method = object.method
        this.params = object.params
    }

    public toString(): string {
        return JSON.stringify({
            jsonrpc: this.jsonrpc,
            method: this.method,
            params: this.params,
        })
    }
}

/**
 * You should create this object using a method from `JSONRPCClient`, which generates the ID for you.
 *
 * It is unlikely that you will need to create this object manually.
 * @see https://www.jsonrpc.org/specification#request_object
 */
export class JSONRPCRequest extends JSONRPCNotification {
    /**
     * An identifier established by the Client that MUST contain a String, Number, or NULL value if included. If it is not included it is assumed to be a notification. The value SHOULD normally not be Null and Numbers SHOULD NOT contain fractional parts
     */
    public id: JSONRPCID

    public constructor(object: WithOptionalJSONRPCVersion<JSONRPCRequest>) {
        super(object)
        this.id = object.id
    }

    public override toString(): string {
        return JSON.stringify({
            jsonrpc: this.jsonrpc,
            method: this.method,
            params: this.params,
            id: this.id,
        })
    }
}

/**
 * WARNING: This function checks if `x` is a `JSONRPCNotification` or a `JSONRPCRequest`.
 *
 * To determine if `x` is a `JSONRPCRequest`, you ONLY need to check if `'id' in x`.
 */
export function isJSONRPCRequest(
    x: unknown,
): x is JSONRPCNotification | JSONRPCRequest {
    if (!x || typeof x !== 'object') {
        return false
    }
    if (
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
