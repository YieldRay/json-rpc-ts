import { type JSONRPCMethodSet } from './types'
import { JSONRPCNotification, JSONRPCRequest } from './dto/request'
import {
    JSONRPCErrorResponse,
    JSONRPCResponse,
    isJSONRPCResponse,
} from './dto/response'
import { selfAddIdGenerator, getIDFromGenerator, type IDGenerator } from './id'
import { isJSONRPCError } from './dto/errors'

/**
 * the client cannot parse the server response
 */
export class JSONRPCClientParseError extends Error {
    name = 'JSONRPCClientParseError'
}

/**
 * just wrap the JSON.parse function
 */
function parseJSON(text: string): unknown {
    try {
        return JSON.parse(text)
    } catch {
        throw new JSONRPCClientParseError(`The server send an malformed json`)
    }
}

export class JSONRPCClient<MethodSet extends JSONRPCMethodSet> {
    /**
     * MUST be an infinite iterator
     */
    private idGenerator: IDGenerator
    /**
     * the extern function to request the server for response
     */
    private processor: (input: string) => Promise<string>

    constructor(
        processor: (input: string) => Promise<string>,
        idGenerator?: IDGenerator
    ) {
        this.processor = processor
        this.idGenerator = idGenerator || selfAddIdGenerator()
    }

    public createRequest<T extends keyof MethodSet>(
        method: T extends string ? T : never,
        params?: Parameters<MethodSet[T]>[0]
    ): JSONRPCRequest {
        const id = getIDFromGenerator(this.idGenerator)
        const request = new JSONRPCRequest({
            method,
            params,
            id,
        })
        return request
    }

    public createNotifaction<T extends keyof MethodSet>(
        method: T extends string ? T : never,
        params?: Parameters<MethodSet[T]>[0]
    ): JSONRPCNotification {
        const notification = new JSONRPCNotification({
            method,
            params,
        })
        return notification
    }

    private processOneJsonValue(jsonValue: unknown): JSONRPCResponse {
        if (!isJSONRPCResponse(jsonValue)) {
            throw new JSONRPCClientParseError(
                `The server sent an incorrect response object`
            )
        }
        return jsonValue
    }

    async request<T extends keyof MethodSet>(
        method: T extends string ? T : never,
        params?: Parameters<MethodSet[T]>[0]
    ): Promise<ReturnType<MethodSet[T]>> {
        const request = this.createRequest(method, params)
        // responsed json string
        const jsonString = await this.processor(JSON.stringify(request))
        const jsonValue = parseJSON(jsonString)
        // parsed response
        const response = this.processOneJsonValue(jsonValue)
        if ('error' in response) {
            return Promise.reject(response.error)
        } else {
            return response.result
        }
    }

    async notify<T extends keyof MethodSet>(
        method: T extends string ? T : never,
        params?: Parameters<MethodSet[T]>[0]
    ): Promise<void> {
        const notification = this.createNotifaction(method, params)
        await this.processor(JSON.stringify(notification))
    }

    /**
     * You should use the createRequest or createNotifaction method to
     * create the requests array
     */
    async batch(
        ...requests: Array<JSONRPCRequest | JSONRPCNotification>
    ): Promise<JSONRPCErrorResponse | Array<JSONRPCResponse> | undefined> {
        // responsed json string
        const jsonString = await this.processor(JSON.stringify(requests))
        if (requests.every((r) => !('id' in r))) {
            // all the requests are notification
            return
        }
        // parsed response
        const jsonValue = parseJSON(jsonString)

        if (!Array.isArray(jsonValue)) {
            if (isJSONRPCResponse(jsonValue) && 'error' in jsonValue) {
                // If the batch rpc call itself fails to be recognized as an valid JSON or as an Array with at least one value,
                // the response from the Server MUST be a single Response object.
                return jsonValue
            }

            // requests contains request, so response must be an array
            throw new JSONRPCClientParseError(
                `The server incorrectly handle the batch request`
            )
        }

        const responses: JSONRPCResponse[] = []
        for (const request of requests) {
            if (!('id' in request)) {
                continue
            }
            const { id } = request
            // TODO
            // The Response objects being returned from a batch call MAY be returned in any order within the Array.
            // The Client SHOULD match contexts between the set of Request objects and the resulting set of Response objects based on the id member within each Object.
        }
        return responses
    }
}
