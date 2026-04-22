export const Currency = ['USD', 'BRL'] as const
export type Currency = (typeof Currency)[number]
