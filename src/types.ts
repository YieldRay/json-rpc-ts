export type PrimitiveValue = string | number | boolean | null

export type ArrayValue = Array<PrimitiveValue | ObjectValue | ArrayValue>

export type ObjectValue = {
    [key: string]: PrimitiveValue | ObjectValue | ArrayValue
}

export interface JSONRPCMethodSet {
    // deno-lint-ignore no-explicit-any
    [method: string]: (params?: any) => any
}
