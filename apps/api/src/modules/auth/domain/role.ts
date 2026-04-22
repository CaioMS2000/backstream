export const Role = ['admin', 'streamer', 'viewer'] as const
export type Role = (typeof Role)[number]
