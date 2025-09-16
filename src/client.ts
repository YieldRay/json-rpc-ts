import type { JSONRPCMethods, JSONRPCSettledResult } from './types.ts'
import type {
    JSONRPCErrorResponse,
    JSONRPCSuccessResponse,
} from './dto/response.ts'
import { JSONRPCNotification, JSONRPCRequest } from './dto/request.ts'
import { isJSONRPCResponse, type JSONRPCResponse } from './dto/response.ts'
import { JSONRPCError } from './dto/errors.ts'
import {
    getIDFromGenerator,
    type IDGenerator,
    selfAddIdGenerator,
} from './id.ts'

/**
 * Provide an external `requestForResponse` function to the constructor.
 * This function should accept a `string` (JSON-encoded from one or more JSON-RPC requests),
 * and your custom implementation should send this string to a JSON-RPC server,
 * returning any response as a `string`.
 *
 * The constructor optionally accepts a custom ID generator; otherwise, it uses
 * an internally generated number.
 *
 * To customize requests or responses, extend the `JSONRPCClient` class.
 *
 * To customize requests, override the `createRequest` and `createNotification` methods.
 *
 * To customize responses, override the `request`, `notify`, and `batch` methods.
 */
export class JSONRPCClient<
    Methods extends JSONRPCMethods = JSONRPCMethods,
> {
    /**
     * MUST be an infinite iterator.
     */
    protected idGenerator: IDGenerator
    /**
     * The external function that sends the JSON string to any RPC server
     * and fetches the response as a string.
     */
    protected requestForResponse: (input: string) => string | Promise<string>

    /**
     * @param requestForResponse An external function that sends the JSON string to any RPC server
     * and fetches the response as a string.
     */
    public constructor(
        requestForResponse: (input: string) => string | Promise<string>,
        idGenerator?: IDGenerator,
    ) {
        this.requestForResponse = requestForResponse
        this.idGenerator = idGenerator || selfAddIdGenerator()
    }

    /**
     * Creates a JSON-RPC request object with an automatically generated ID.
     */
    public createRequest<T extends keyof Methods>(
        method: T extends string ? T : never,
        params: Parameters<Methods[T]>[0],
    ): JSONRPCRequest {
        const id = getIDFromGenerator(this.idGenerator)
        const request = new JSONRPCRequest({
            method,
            params,
            id,
        })
        return request
    }

    /**
     * Creates a JSON-RPC notification object.
     */
    public createNotification<T extends keyof Methods>(
        method: T extends string ? T : never,
        params: Parameters<Methods[T]>[0],
    ): JSONRPCNotification {
        const notification = new JSONRPCNotification({
            method,
            params,
        })
        return notification
    }

    /**
     * Sends a `JSONRPCRequest` to the server and returns a `JSONRPCValue`,
     * or throws a `JSONRPCErrorInterface` (or `JSONRPCClientParseError`).
     */
    public async request<T extends keyof Methods>(
        method: T extends string ? T : never,
        params: Parameters<Methods[T]>[0],
    ): Promise<ReturnType<Methods[T]>> {
        const request = this.createRequest(method, params)
        // responded json string
        const jsonString = await this.requestForResponse(
            JSON.stringify(request),
        )
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
            if (request.id !== response.id) {
                // according the spec, response id MUST as same as the request id
                throw new JSONRPCClientParseError(
                    `The server sent an valid response but id is not matched`,
                    request,
                )
            }

            // response.result is now JSONRPCValue
            return response.result as ReturnType<Methods[T]>
        }
    }

    /**
     * Sends a `JSONRPCNotification` to the server. No return value.
     * Throws only if your provided `processor` function throws.
     */
    public async notify<T extends keyof Methods>(
        method: T extends string ? T : never,
        params: Parameters<Methods[T]>[0],
    ): Promise<void> {
        const notification = this.createNotification(method, params)
        await this.requestForResponse(JSON.stringify(notification))
    }

    /**
     * Use the `createRequest()` or `createNotification()` method to create the requests array.
     * Response order is always matched by ID.
     *
     * Throws `JSONRPCClientParseError` if the server response cannot be parsed.
     * Note: It does not throw for any `JSONRPCErrorResponse`; in this case, it will be a single object: `{ status: 'rejected', reason: {...} }`
     *
     * The return value is similar to the `Promise.allSettled()` method:
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
     * @throws `JSONRPCError` - when the server returns a single JSONRPCErrorResponse
     * @throws `JSONRPCClientParseError` - when the server response cannot be parsed
     * @see https://www.jsonrpc.org/specification#batch
     */
    public async batch(
        ...requests: Array<JSONRPCRequest | JSONRPCNotification>
    ): Promise<JSONRPCSettledResult[]> {
        // responded json string
        const jsonString = await this.requestForResponse(
            JSON.stringify(requests),
        )
        const requestCount = requests.filter((r) => 'id' in r).length
        if (requestCount === 0) {
            // all the requests are notification
            // note that the server should return nothing, so we ignore any response
            return []
        }
        // parsed response
        const jsonValue = parseJSON(jsonString, requests)

        if (!Array.isArray(jsonValue)) {
            if (isJSONRPCResponse(jsonValue) && 'error' in jsonValue) {
                // if the batch rpc call itself fails to be recognized as an valid JSON or as an Array with at least one value,
                // the response from the Server MUST be a single Response object.
                throw new JSONRPCError(jsonValue.error)
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
                // this implementation expect that all the JSONRPCErrorResponse are ordered
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

/**
 * A union type representing any JSON-RPC request, either a notification or a request.
 */
type JSONRPCAnyRequest =
    | JSONRPCNotification
    | JSONRPCRequest
    | Array<JSONRPCNotification | JSONRPCRequest>

/**
 * Indicates that the client cannot parse the server response.
 */
export class JSONRPCClientParseError extends Error {
    override name = 'JSONRPCClientParseError'
    request: JSONRPCAnyRequest
    constructor(message: string, request: JSONRPCAnyRequest) {
        super(message)
        this.request = request
    }
}

/**
 * Wraps JSON.parse to provide better error handling.
 * Throws JSONRPCClientParseError if the response is not valid JSON.
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
