import { type JSONRPCMethodSet } from './types'
import { JSONRPCNotification, JSONRPCRequest } from './dto/request'
import { JSONRPCResponse } from './dto/response'
import { selfAddIdGenerator, getIDFromGenerator, type IDGenerator } from './id'

type HandleRequest = (
    request: JSONRPCRequest | JSONRPCNotification,
) => Promise<JSONRPCResponse>

export class JSONRPCClient<MethodSet extends JSONRPCMethodSet> {
    onRequest?: (request: JSONRPCRequest | JSONRPCNotification) => void
    onResponse?: (response: JSONRPCResponse) => void

    handleRequest: HandleRequest
    /**
     * MUST be an infinite iterator
     */
    idGenerator: IDGenerator

    constructor(handleRequest: HandleRequest, idGenerator?: IDGenerator) {
        this.handleRequest = handleRequest
        this.idGenerator = idGenerator || selfAddIdGenerator()
    }

    async request<T extends keyof MethodSet>(
        method: T extends string ? T : never,
        params?: Parameters<MethodSet[T]>[0],
    ): Promise<ReturnType<MethodSet[T]>> {
        const id = getIDFromGenerator(this.idGenerator)
        const request = new JSONRPCRequest({
            method,
            params,
            id,
        })

        this.onRequest?.(request)
        const response = await this.handleRequest(request)
        this.onResponse?.(response)

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
        const notification = new JSONRPCNotification({
            method,
            params,
        })

        this.onRequest?.(notification)
        const response = await this.handleRequest(notification)
        this.onResponse?.(response)

        if ('error' in response) {
            return Promise.reject(response.error)
        } else {
            return
        }
    }
}
