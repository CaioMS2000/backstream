export const REFRESH_TOKEN_EXPIRY_SECONDS = 2592000 as const //30 * 24 * 60 * 60 -> 30 days

export const OAUTH_STATE_EXPIRY_SECONDS = 600 as const // 10 minutos
export const OAUTH_ACCESS_TOKEN_HANDOFF_SECONDS = 60 as const // janela curta para o frontend ler o cookie
