import { type JSONRPCMethodSet } from './types.ts'
import { JSONRPCNotification, JSONRPCRequest } from './dto/request.ts'
import { JSONRPCErrorResponse, JSONRPCSuccessResponse } from './dto/response.ts'
import { isJSONRPCResponse, JSONRPCResponse } from './dto/response.ts'
import {
    getIDFromGenerator,
    type IDGenerator,
    selfAddIdGenerator,
} from './id.ts'

type JSONRPCAnyRequest =
    | JSONRPCNotification
    | JSONRPCRequest
    | Array<JSONRPCNotification | JSONRPCRequest>

/**
 * the client cannot parse the server response
 */
export class JSONRPCClientParseError extends Error {
    name = 'JSONRPCClientParseError'
    request: JSONRPCAnyRequest
    constructor(message: string, request: JSONRPCAnyRequest) {
        super(message)
        this.request = request
    }
}

/**
 * just wrap the JSON.parse function
 */
function parseJSON(
    text: string,
    associatedRequest: JSONRPCAnyRequest,
): unknown {
    try {
        return JSON.parse(text)
    } catch {
        throw new JSONRPCClientParseError(
            `The server send an malformed json`,
            associatedRequest,
        )
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
        idGenerator?: IDGenerator,
    ) {
        this.processor = processor
        this.idGenerator = idGenerator || selfAddIdGenerator()
    }

    public createRequest<T extends keyof MethodSet>(
        method: T extends string ? T : never,
        params?: Parameters<MethodSet[T]>[0],
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
        params?: Parameters<MethodSet[T]>[0],
    ): JSONRPCNotification {
        const notification = new JSONRPCNotification({
            method,
            params,
        })
        return notification
    }

    private processOneJsonValue(
        jsonValue: unknown,
        associatedRequest: JSONRPCAnyRequest,
    ): JSONRPCResponse {
        if (!isJSONRPCResponse(jsonValue)) {
            throw new JSONRPCClientParseError(
                `The server sent an incorrect response object`,
                associatedRequest,
            )
        }
        return jsonValue
    }

    async request<T extends keyof MethodSet>(
        method: T extends string ? T : never,
        params?: Parameters<MethodSet[T]>[0],
    ): Promise<ReturnType<MethodSet[T]>> {
        const request = this.createRequest(method, params)
        // responsed json string
        const jsonString = await this.processor(JSON.stringify(request))
        const jsonValue = parseJSON(jsonString, request)
        // parsed response
        const response = this.processOneJsonValue(jsonValue, request)
        if ('error' in response) {
            return Promise.reject(response.error)
        } else {
            return response.result
        }
    }

    async notify<T extends keyof MethodSet>(
        method: T extends string ? T : never,
        params?: Parameters<MethodSet[T]>[0],
    ): Promise<void> {
        const notification = this.createNotifaction(method, params)
        await this.processor(JSON.stringify(notification))
    }

    /**
     * You should use the createRequest() or createNotifaction() method to
     * create the requests array
     */
    async batch(
        ...requests: Array<JSONRPCRequest | JSONRPCNotification>
        // deno-lint-ignore no-explicit-any
    ): Promise<PromiseSettledResult<any>[] | PromiseSettledResult<any>> {
        // responsed json string
        const jsonString = await this.processor(JSON.stringify(requests))
        const requestCount = requests.filter((r) => 'id' in r).length
        if (requestCount === 0) {
            // all the requests are notification
            return []
        }
        // parsed response
        const jsonValue = parseJSON(jsonString, requests)

        if (!Array.isArray(jsonValue)) {
            if (isJSONRPCResponse(jsonValue) && 'error' in jsonValue) {
                // If the batch rpc call itself fails to be recognized as an valid JSON or as an Array with at least one value,
                // the response from the Server MUST be a single Response object.
                return {
                    status: 'rejected',
                    reason: jsonValue.error,
                }
            }

            // requests contains request, so response must be an array
            throw new JSONRPCClientParseError(
                `The server incorrectly handle the batch request`,
                requests,
            )
        }

        if (jsonValue.length !== requestCount) {
            throw new JSONRPCClientParseError(
                `The server returned batch response does not match the request count`,
                requests,
            )
        }

        if (!jsonValue.every(isJSONRPCResponse)) {
            throw new JSONRPCClientParseError(
                `The server returned batch response contains invalid value`,
                requests,
            )
        }

        const unorderedResponses: JSONRPCResponse[] = jsonValue
        let errorStartIndex = 0
        // deno-lint-ignore no-explicit-any
        const responses: PromiseSettledResult<any>[] = [] // ordered

        for (const request of requests) {
            if (!('id' in request)) {
                continue
            }

            // The Response objects being returned from a batch call MAY be returned in any order within the Array.
            // The Client SHOULD match contexts between the set of Request objects and the resulting set of Response objects based on the id member within each Object.

            const index = unorderedResponses.findIndex(
                (response) => response.id === request.id,
            )
            if (index === -1) {
                // no corresponding id, so the response will be JSONRPCErrorResponse
                // find the first (not been scanned) error
                const errRespIndex = unorderedResponses
                    .slice(errorStartIndex)
                    .findIndex(
                        (response) =>
                            'error' in response && response.id === null,
                    )
                // this implemention expect that all the JSONRPCErrorResponse are ordered
                responses.push({
                    status: 'rejected',
                    reason: (unorderedResponses[
                        errRespIndex
                    ] as JSONRPCErrorResponse).error,
                })
                // update the error start index
                errorStartIndex = errRespIndex
            } else {
                responses.push({
                    status: 'fulfilled',
                    value: (unorderedResponses[index] as JSONRPCSuccessResponse)
                        .result,
                })
            }
        }
        return responses
    }
}
