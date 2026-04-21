export type UniqueId = string & { readonly __brand: 'UniqueId' }
export const UniqueId = (id: string) => id as UniqueId
