import {
    JSONRPCMethodNotFoundError,
    JSONRPCParseError,
    isJSONRPCError,
    JSONRPCInternalError,
    JSONRPCInvalidRequestError,
} from './dto/errors'
import {
    JSONRPCNotification,
    JSONRPCRequest,
    isJSONRPCRequest,
} from './dto/request'
import { JSONRPCErrorResponse, JSONRPCSuccessResponse } from './dto/response'
import { type JSONRPCMethodSet } from './types'

export class JSONRPCServer<MethodSet extends JSONRPCMethodSet> {
    private methodSet: MethodSet

    constructor(methodSet: MethodSet) {
        this.methodSet = methodSet
    }

    /**
     * This function never throws
     */
    private async handleRequest(jsonString: string) {
        let jsonValue: unknown
        try {
            jsonValue = JSON.parse(jsonString)
        } catch (e) {
            return new JSONRPCErrorResponse({
                id: null,
                error: new JSONRPCParseError(),
            })
        }

        if (Array.isArray(jsonValue)) {
            for (const singleJsonValue of jsonValue) {
                // TODO:
                // If there are no Response objects contained within the Response array as it is to be sent to the client, the server MUST NOT return an empty Array and should return nothing at all.
            }
        }

        if (isJSONRPCRequest(jsonValue)) {
            return this.processOneRequest(jsonValue)
        } else {
            if (
                jsonValue &&
                typeof jsonValue === 'object' &&
                'id' in jsonValue
            ) {
                // notification
                return
            }
            return new JSONRPCErrorResponse({
                id: null,
                error: new JSONRPCInvalidRequestError(),
            })
        }
    }

    private async processOneRequest(
        request: JSONRPCNotification | JSONRPCRequest
    ) {
        const { method, params } = request

        const fn: Function | undefined = this.methodSet[method]?.bind(
            this.methodSet
        )

        if ('id' in request) {
            const id = request.id
            if (!fn) {
                return new JSONRPCErrorResponse({
                    id,
                    error: new JSONRPCMethodNotFoundError(),
                })
            }
            try {
                const result = await fn(params)
                return new JSONRPCSuccessResponse({ id, result })
            } catch (error) {
                if (isJSONRPCError(error)) {
                    return new JSONRPCErrorResponse({ id, error })
                } else {
                    return new JSONRPCErrorResponse({
                        id,
                        error: new JSONRPCInternalError(),
                    })
                }
            }
        } else {
            // notification
            if (!fn) {
                return
            }
            fn(params)
            return
        }
    }
}
