export type PrimitiveValue = string | number | boolean | null

export type ArrayValue = Array<PrimitiveValue | ObjectValue | ArrayValue>

export type ObjectValue = {
    [key: string]: PrimitiveValue | ObjectValue | ArrayValue
}

export type JSONRPCID =
    | string
    | number // SHOULD NOT contain fractional parts
    | null // unknown id

export interface JSONRPCMethodSet {
    [method: string]: (params?: any) => any
}
