import type { JSONRPCMethodSet, JSONRPCSettledResult } from './types.ts'
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
 * The client cannot parse the server response
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
 * Just wrap the JSON.parse function, with potential `JSONRPCClientParseError`
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

/**
 * Provide a external `processor` function to the constructor,
 * it should accept a string (json encoded from one or more json rpc request)
 * and your customized code should send this string to a json rpc server
 * for any response represented as **string**
 *
 * The constructor optionally accept a customized id generator, otherwise it use a
 * self added number
 */
export class JSONRPCClient<MethodSet extends JSONRPCMethodSet> {
    /**
     * MUST be an infinite iterator
     */
    private idGenerator: IDGenerator
    /**
     * The extern function to request the server for response
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

    /**
     * Send `JSONRPCRequest` to server, returns `JSONRPCValue` or throw `JSONRPCErrorInterface` (or `JSONRPCClientParseError`)
     */
    async request<T extends keyof MethodSet>(
        method: T extends string ? T : never,
        params?: Parameters<MethodSet[T]>[0],
    ): Promise<ReturnType<MethodSet[T]>> {
        const request = this.createRequest(method, params)
        // responsed json string
        const jsonString = await this.processor(JSON.stringify(request))
        const jsonValue = parseJSON(jsonString, request)

        // parsed response
        if (!isJSONRPCResponse(jsonValue)) {
            throw new JSONRPCClientParseError(
                `The server sent an incorrect response object`,
                request,
            )
        }
        // now jsonValue become JSONRPCResponse
        const response: JSONRPCResponse = jsonValue

        if ('error' in response) {
            throw response.error
        } else {
            // response.result is now JSONRPCValue
            return response.result as ReturnType<MethodSet[T]>
        }
    }

    /**
     * Send `JSONRPCNotification` to server, no returns,
     * only throws if your provided `processor` function throws
     */
    async notify<T extends keyof MethodSet>(
        method: T extends string ? T : never,
        params?: Parameters<MethodSet[T]>[0],
    ): Promise<void> {
        const notification = this.createNotifaction(method, params)
        await this.processor(JSON.stringify(notification))
    }

    /**
     * You should use the `createRequest()` or `createNotifaction()` method to
     * create the requests array.
     *
     * Throws `JSONRPCClientParseError` if server response cannot be parsed,
     * note that it does not throws for any `JSONRPCErrorResponse`, in this 
     * case it will be a single object: `{ status: 'rejected', reason: {...} }`
     *
     * Usually it returns be like (same as the `Promise.allSettled()` method):
     * ```js
     * [
     *    { status: 'fulfilled', value: '...' },
     *    {
     *        status: 'rejected',
     *        reason: {
     *            code: -32601,
     *            message: 'Method not found',
     *        },
     *    },
     * ]
     * ```
     */
    async batch(
        ...requests: Array<JSONRPCRequest | JSONRPCNotification>
    ): Promise<JSONRPCSettledResult | JSONRPCSettledResult[]> {
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
                `The server returned batch response contains invalid one`,
                requests,
            )
        }

        const unorderedResponses: JSONRPCResponse[] = jsonValue
        let errorStartIndex = 0
        const responses: JSONRPCSettledResult[] = [] // ordered

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
