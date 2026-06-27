# CAI-62 (D1) — Injetar id no domínio + tirar timestamps de auditoria · status

> Decisão: `id: UniqueId` sempre injetado de fora; domínio não importa infra
> (`id-generator`/`clock`). Timestamp só fica no domínio se uma regra de negócio
> usa (ex.: `RefreshToken.expiresAt`/`revokedAt`); auditoria (`createdAt`,
> `updatedAt`) sai do domínio → banco preenche.

## Já feito

- **RefreshToken** — `id` injetado, `createdAt` fora do domínio. ✅ (PR D1+D2+Opção A)
- **Profile** — `id`/`now` já injetados (padrão de referência). ✅ *(mas ainda carrega `createdAt`/`updatedAt` no domínio — ver abaixo)*

## Falta

### 1. Injetar `id` (remover `generateId()` interno) + remover `createdAt` do domínio
- **User** (`user.ts:50` — `await generateId()` interno; tem `createdAt`). Callers de `User.create` passam o `id`.
- **PasswordCredential** (`password-credential.ts:19` — mesma coisa).

### 2. Streamer — o pior caso (injetar `id` E `now`)
- `streamer.ts:44-45` (`create` usa `generateId()` + `now()`), `:66` (`changeSlug` usa `now()`), `:72` (`updatePixKey` usa `now()`).
- Remover imports de infra; callers (`onboard-streamer`, `change-streamer-slug`, `update-streamer-pix-key`) passam `id`/`now`. (O `createdAt` já saiu daqui.)

### 3. Profile — remover `createdAt`/`updatedAt` do domínio
- `id`/`now` já injetados, mas o agregado ainda carrega `createdAt`/`updatedAt` (auditoria). Remover do domínio + mapper; `updateDetails` para de setar `updatedAt`.

### 4. `updatedAt` gerenciado pelo banco
- **Nenhum** schema tem `.$onUpdate`/trigger. As colunas `updated_at` de **profile** e **streamer** ficariam `null` pra sempre.
- Adicionar `.$onUpdate(() => new Date())` (ou trigger) nas duas.

### 5. ADR do D1
- Não existe ainda (temos 0001–0005, nenhum cobre D1). Candidato natural, no padrão dos outros.

## Resumo

| Item | Status |
|---|---|
| RefreshToken (id + createdAt) | ✅ |
| Profile — id/now injetados | ✅ |
| User — id + createdAt | ❌ |
| PasswordCredential — id + createdAt | ❌ |
| Streamer — id + now + infra imports | ❌ |
| Profile — remover createdAt/updatedAt | ❌ |
| `updatedAt` DB-managed (profile + streamer) | ❌ |
| ADR do D1 | ❌ |

## Próximo passo sugerido

**User + PasswordCredential juntos** (mesmo padrão, só o `id`, rápido), deixando Streamer (3 métodos com `now()`) e o `updatedAt`/ADR pra depois.
