export const Role = ['admin', 'streamer', 'donor'] as const
export type Role = (typeof Role)[number]
