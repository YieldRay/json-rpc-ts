// deno-lint-ignore-file no-explicit-any
import { isJSONRPCID } from '../id.ts'
/**
 * The error codes from and including -32768 to -32000 are reserved for pre-defined errors. Any code within this range, but not defined explicitly below is reserved for future use. The error codes are nearly the same as those suggested for XML-RPC at the following url: http://xmlrpc-epi.sourceforge.net/specs/rfc.fault_codes.php
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
    data?: any
}

export class JSONRPCError extends Error implements JSONRPCErrorInterface {
    public code: number
    public message: string
    public data?: any

    public constructor(object: JSONRPCErrorInterface) {
        super(object.message)
        this.code = object.code
        this.message = object.message
        this.data = object.data
    }

    public toString() {
        return JSON.stringify({
            code: this.code,
            message: this.message,
            data: this.data,
        })
    }

    public toJSON() {
        return this.toString()
    }
}

export function isJSONRPCError(x: unknown): x is JSONRPCErrorInterface {
    if (!x || typeof x !== 'object') {
        return false
    }
    if (x instanceof JSONRPCError) {
        return true
    }
    if (
        typeof Reflect.get(x, 'code') === 'number' &&
        typeof Reflect.get(x, 'message') === 'string' &&
        isJSONRPCID(Reflect.get(x, 'id'))
    ) {
        return true
    }

    return false
}

export class JSONRPCParseError extends JSONRPCError {
    constructor(data?: any) {
        super({
            code: -32700,
            message: 'Parse error',
            data: data,
        })
    }
}

export class JSONRPCInvalidRequestError extends JSONRPCError {
    constructor(data?: any) {
        super({
            code: -32600,
            message: 'Invalid Request',
            data: data,
        })
    }
}

export class JSONRPCMethodNotFoundError extends JSONRPCError {
    constructor(data?: any) {
        super({
            code: -32601,
            message: 'Method not found',
            data: data,
        })
    }
}

export class JSONRPCInvalidParamsError extends JSONRPCError {
    constructor(data?: any) {
        super({
            code: -32602,
            message: 'Invalid params',
            data: data,
        })
    }
}

export class JSONRPCInternalError extends JSONRPCError {
    constructor(data?: any) {
        super({
            code: -32603,
            message: 'Internal error',
            data: data,
        })
    }
}
