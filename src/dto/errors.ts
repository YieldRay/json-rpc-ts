import type { JSONRPCValue } from '../types.ts'

/**
 * @see https://www.jsonrpc.org/specification#error_object
 * When a rpc call encounters an error, the Response Object MUST contain the error member with a value that is a Object with the following members:
 */
export interface JSONRPCErrorInterface {
    /**
     * A Number that indicates the error type that occurred.
     * This MUST be an integer.
     */
    code: number
    /**
     * A String providing a short description of the error.
     * The message SHOULD be limited to a concise single sentence.
     */
    message: string
    /**
     * A Primitive or Structured value that contains additional information about the error.
     * This may be omitted.
     * The value of this member is defined by the Server (e.g. detailed error information, nested errors etc.).
     */
    data?: JSONRPCValue
}

/**
 * To define your own JSON-RPC error, you can extend this class with your custom error code (in the range -32000 to -32099).
 * @example
 * ```ts
 * // Reserved for implementation-defined server-errors.
 * class MyCustomError extends JSONRPCError {
 *   constructor(data?: JSONRPCValue) {
 *     super({
 *       code: -32001, // -32000 to -32099
 *       message: 'Server error',
 *       data: data,
 *     })
 *   }
 * }
 * ```
 * @see https://www.jsonrpc.org/specification#error_object
 */
export class JSONRPCError extends Error implements JSONRPCErrorInterface {
    /**
     * The error codes from and including -32768 to -32000 are reserved for pre-defined errors. Any code within this range, but not defined explicitly below is reserved for future use. The error codes are nearly the same as those suggested for XML-RPC at the following url: http://xmlrpc-epi.sourceforge.net/specs/rfc.fault_codes.php
     */
    public code: number
    public override message: string
    public data?: JSONRPCValue

    public constructor(object: JSONRPCErrorInterface) {
        super(object.message)
        this.code = object.code
        this.message = object.message
        this.data = object.data
    }
}

/**
 * This function ONLY checks whether `x` is a `JSONRPCErrorInterface`.
 *
 * `JSONRPCErrorInterface` is shared between client and server, but `JSONRPCError` is server-side only.
 */
export function isJSONRPCError(x: unknown): x is JSONRPCErrorInterface {
    if (!x || typeof x !== 'object') {
        return false
    }
    if (
        typeof Reflect.get(x, 'code') === 'number' &&
        typeof Reflect.get(x, 'message') === 'string'
    ) {
        return true
    }

    return false
}

/**
 * Invalid JSON was received by the server.
 * An error occurred on the server while parsing the JSON text.
 * @see https://www.jsonrpc.org/specification#error_object
 */
export class JSONRPCParseError extends JSONRPCError {
    constructor(data?: JSONRPCValue) {
        super({
            code: -32700,
            message: 'Parse error',
            data: data,
        })
    }
}

/**
 * The JSON sent is not a valid Request object.
 * @see https://www.jsonrpc.org/specification#error_object
 */
export class JSONRPCInvalidRequestError extends JSONRPCError {
    constructor(data?: JSONRPCValue) {
        super({
            code: -32600,
            message: 'Invalid Request',
            data: data,
        })
    }
}

/**
 * The method does not exist / is not available.
 * @see https://www.jsonrpc.org/specification#error_object
 */
export class JSONRPCMethodNotFoundError extends JSONRPCError {
    constructor(data?: JSONRPCValue) {
        super({
            code: -32601,
            message: 'Method not found',
            data: data,
        })
    }
}

/**
 * Invalid method parameter(s).
 * @see https://www.jsonrpc.org/specification#error_object
 */
export class JSONRPCInvalidParamsError extends JSONRPCError {
    constructor(data?: JSONRPCValue) {
        super({
            code: -32602,
            message: 'Invalid params',
            data: data,
        })
    }
}

/**
 * Internal JSON-RPC error.
 * @see https://www.jsonrpc.org/specification#error_object
 */
export class JSONRPCInternalError extends JSONRPCError {
    constructor(data?: JSONRPCValue) {
        super({
            code: -32603,
            message: 'Internal error',
            data: data,
        })
    }
}
