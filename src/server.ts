import {
    JSONRPCMethodNotFoundError,
    JSONRPCParseError,
    JSONRPCInternalError,
    JSONRPCInvalidRequestError,
    isJSONRPCError,
} from './dto/errors'
import {
    JSONRPCNotification,
    JSONRPCRequest,
    isJSONRPCRequest,
} from './dto/request'
import {
    JSONRPCErrorResponse,
    JSONRPCSuccessResponse,
    JSONRPCResponse,
} from './dto/response'
import { isJSONRPCID } from './id'
import { type JSONRPCMethodSet } from './types'

export class JSONRPCServer<MethodSet extends JSONRPCMethodSet> {
    private methodSet: MethodSet

    public getMethod(method: string) {
        const prop = this.methodSet[method]
        if (typeof prop === 'function') {
            return prop.bind(this.methodSet) as Function
        }

        return undefined
    }

    public setMethod<T extends keyof MethodSet>(method: T, fn: MethodSet[T]) {
        Reflect.set(this.methodSet, method, fn)
    }

    constructor(methodSet: MethodSet) {
        this.methodSet = methodSet
    }

    /**
     * Given any string as input, return Response in json string
     * @noexcept
     */
    public async process(input: string): Promise<string> {
        const resp = await this.processAnyRequest(input)
        const output = JSON.stringify(resp)
        return output || ''
    }

    /**
     * Process request or batch request, return coresponding value
     * @noexcept
     */
    public async processAnyRequest(
        jsonString: string
    ): Promise<undefined | JSONRPCResponse | JSONRPCResponse[]> {
        let jsonValue: unknown
        try {
            jsonValue = JSON.parse(jsonString)
        } catch (e) {
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
                    jsonValue.map((r) => this.processOneRequest(r))
                )
                return
            }

            const batchReturnValue: JSONRPCResponse[] = []
            for (const singleJsonValue of jsonValue) {
                const returnValue = await this.processOneJsonValue(
                    singleJsonValue
                )
                if (returnValue) {
                    batchReturnValue.push(returnValue)
                }
                // there SHOULD NOT be any Response objects for notifications
            }
            if (batchReturnValue.length === 0) {
                // If there are no Response objects contained within the Response array as it is to be sent to the client,
                // the server MUST NOT return an empty Array and should return nothing at all.
                return
            }
            return batchReturnValue
        }
        // single request
        return this.processOneJsonValue(jsonValue)
    }

    /**
     * @param jsonValue the parse json value, can be any unknown javascript value
     * @noexcept
     */
    private async processOneJsonValue(
        jsonValue: unknown
    ): Promise<JSONRPCResponse | undefined> {
        if (isJSONRPCRequest(jsonValue)) {
            // request or notification
            return this.processOneRequest(jsonValue)
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
     * WARN: this process JSONRPCNotification or JSONRPCRequest
     * @noexcept
     */
    private async processOneRequest(
        request: JSONRPCNotification | JSONRPCRequest
    ): Promise<JSONRPCResponse | undefined> {
        const { method, params } = request
        const fn = this.getMethod(method)

        if ('id' in request) {
            // request
            const id = request.id
            if (!fn) {
                return new JSONRPCErrorResponse({
                    id,
                    error: new JSONRPCMethodNotFoundError(),
                })
            }
            try {
                // note that here `result` can be anything, including undefined
                // although undefined will make the property disappear in the json object
                // we loosely accept it, so client should make additional check for this
                const result = await fn(params)
                return new JSONRPCSuccessResponse({ id, result })
            } catch (error) {
                return new JSONRPCErrorResponse({
                    id,
                    error:
                        // method in method set should throw JSONRPCError
                        isJSONRPCError(error)
                            ? error
                            : // otherwise it will be treated as internal error
                              new JSONRPCInternalError(),
                })
            }
        }

        // notification
        try {
            fn?.(params)
        } catch {}
    }
}
