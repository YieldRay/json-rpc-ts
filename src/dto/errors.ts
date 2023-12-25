import type { JSONRPCValue } from '../types.ts'

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
 * This ONLY check if `x` is `JSONRPCErrorInterface`
 *
 * Because it'a shared method between client and server, but `JSONRPCError` is server side only
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

export class JSONRPCParseError extends JSONRPCError {
    constructor(data?: JSONRPCValue) {
        super({
            code: -32700,
            message: 'Parse error',
            data: data,
        })
    }
}

export class JSONRPCInvalidRequestError extends JSONRPCError {
    constructor(data?: JSONRPCValue) {
        super({
            code: -32600,
            message: 'Invalid Request',
            data: data,
        })
    }
}

export class JSONRPCMethodNotFoundError extends JSONRPCError {
    constructor(data?: JSONRPCValue) {
        super({
            code: -32601,
            message: 'Method not found',
            data: data,
        })
    }
}

export class JSONRPCInvalidParamsError extends JSONRPCError {
    constructor(data?: JSONRPCValue) {
        super({
            code: -32602,
            message: 'Invalid params',
            data: data,
        })
    }
}

export class JSONRPCInternalError extends JSONRPCError {
    constructor(data?: JSONRPCValue) {
        super({
            code: -32603,
            message: 'Internal error',
            data: data,
        })
    }
}
