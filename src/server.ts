import {
    isJSONRPCError,
    JSONRPCInternalError,
    JSONRPCInvalidRequestError,
    JSONRPCMethodNotFoundError,
    JSONRPCParseError,
} from './dto/errors.ts'
import {
    isJSONRPCRequest,
    type JSONRPCNotification,
    type JSONRPCRequest,
} from './dto/request.ts'
import {
    JSONRPCErrorResponse,
    type JSONRPCResponse,
    JSONRPCSuccessResponse,
} from './dto/response.ts'
import { isJSONRPCID } from './id.ts'
import type { JSONRPCMethods, JSONRPCValue } from './types.ts'

/**
 * Provide a method set object to the constructor, it should contains
 * a record with it's key is a string and value is a function
 * that handle the rpc calls.
 *
 * See `JSONRPCMethods` for how method in method set should be.
 *
 * Note: avoid using `this` in method!
 *
 * To customize how your server handle request, extend `JSONRPCServer` and
 * overwrite `getMethod` method, using this method, you can forward request
 * params to an existing method in `methods`
 */
export class JSONRPCServer<
    Methods extends JSONRPCMethods = JSONRPCMethods,
> {
    protected methods: Methods

    constructor()
    constructor(methods: Methods)
    constructor(methods?: Methods) {
        this.methods = methods || ({} as Methods)
    }

    /**
     * Override this function, to customize the behavior
     * when method is not in `methods`.
     *
     * You can also use this method to handle dynamic
     * method name if you like, but make sure you manually
     * throw `JSONRPCMethodNotFoundError` when required
     */
    // deno-lint-ignore no-unused-vars no-explicit-any
    public methodNotFound(params: any): JSONRPCValue {
        throw new JSONRPCMethodNotFoundError()
    }

    /**
     * Use this to get method in `methods` by method name
     */
    public getMethod<T extends keyof Methods>(
        method: T,
    ): Methods[T] | undefined {
        const prop = this.methods[method]
        if (typeof prop === 'function') {
            return prop.bind(this.methods) as Methods[T]
        }

        return undefined
    }

    /**
     * Use this to replace or add more methods
     */
    public setMethod<T extends keyof Methods>(
        method: T,
        fn: Methods[T],
    ): this {
        Reflect.set(this.methods, method, fn)
        return this
    }

    /**
     * Given any string as input, return response as json string
     * @noexcept
     */
    public async handleRequest(input: string): Promise<string> {
        const resp = await this.processAnyJsonString(input)
        if (!resp) {
            return ''
        }
        if (Array.isArray(resp)) {
            return `[${resp.map((r) => r.toString()).join(',')}]`
        }
        return resp.toString()
    }

    /**
     * Process request or batch request, return corresponding value
     * @returns Corresponding response object or array or some other thing
     * @noexcept
     */
    private async processAnyJsonString(
        jsonString: string,
    ): Promise<undefined | JSONRPCResponse | JSONRPCResponse[]> {
        let jsonValue: unknown
        try {
            jsonValue = JSON.parse(jsonString)
        } catch (_e) {
            return new JSONRPCErrorResponse({
                id: null,
                error: new JSONRPCParseError(),
            })
        }

        // If the batch rpc call itself fails to be recognized as an valid JSON or as an Array with at least one value,
        // the response from the Server MUST be a single Response object.

        if (Array.isArray(jsonValue)) {
            // batch request
            if (jsonValue.length === 0) {
                return new JSONRPCErrorResponse({
                    id: null,
                    error: new JSONRPCInvalidRequestError(),
                })
            }
            if (jsonValue.every((r) => !('id' in r))) {
                // all the requests are notification
                // just run each method in the event loop
                // and immediately return nothing
                Promise.allSettled(
                    jsonValue.map((r) => this.processSingleRequest(r)),
                )
                // If there are no Response objects contained within the Response array as it is to be sent to the client,
                // the server MUST NOT return an empty Array and should return nothing at all.
                return
            }

            const batchReturnValue: JSONRPCResponse[] = []
            for (const singleJsonValue of jsonValue) {
                const returnValue = await this.processSingleJsonValue(
                    singleJsonValue,
                )
                if (returnValue) {
                    batchReturnValue.push(returnValue)
                }
                // there SHOULD NOT be any Response objects for notifications
            }
            //? `batchReturnValue.length` MUST greater that 0
            // if (batchReturnValue.length === 0) {
            //     return
            // }
            return batchReturnValue
        }
        // single request
        return this.processSingleJsonValue(jsonValue)
    }

    /**
     * @param jsonValue the parse json value, can be any unknown javascript value
     * @returns `JSONRPCResponse` if is request, or `undefined` if is Notification
     * @noexcept
     */
    private async processSingleJsonValue(
        jsonValue: unknown,
    ): Promise<JSONRPCResponse | undefined> {
        if (isJSONRPCRequest(jsonValue)) {
            // request or notification
            return await this.processSingleRequest(jsonValue)
        }

        // jsonValue is not a valid Request object

        if (
            jsonValue &&
            typeof jsonValue === 'object' &&
            'id' in jsonValue &&
            isJSONRPCID(jsonValue.id)
        ) {
            // make best efforts to return corresponding id
            return new JSONRPCErrorResponse({
                id: jsonValue.id,
                error: new JSONRPCInvalidRequestError(),
            })
        }

        return new JSONRPCErrorResponse({
            id: null,
            error: new JSONRPCInvalidRequestError(),
        })
    }

    /**
     * WARN: this process `JSONRPCNotification` or `JSONRPCRequest`
     * @noexcept
     */
    private async processSingleRequest(
        request: JSONRPCNotification | JSONRPCRequest,
    ): Promise<JSONRPCResponse | undefined> {
        const { method, params } = request

        // load method from `methods` or use the `methodNotFound()` function as fallback
        const methodFn = this.getMethod(method) ||
            this.methodNotFound.bind(this)

        if ('id' in request) {
            // request
            const { id } = request

            try {
                // note that here `result` can be anything, including undefined
                // although undefined will make the property disappear in the json object
                // we loosely accept it, so client should make additional check for this
                return new JSONRPCSuccessResponse({
                    id,
                    result: await methodFn(params),
                })
            } catch (error) {
                return new JSONRPCErrorResponse({
                    id,
                    error:
                        // method in method set should throw JSONRPCError
                        isJSONRPCError(error)
                            ? error
                            // otherwise it will be treated as internal error
                            : new JSONRPCInternalError(),
                })
            }
        }

        try {
            await methodFn?.(params)
        } catch {
            // ignore as request is notification
        }
    }
}
