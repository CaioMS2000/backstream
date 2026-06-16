# WIP — Convenções de persistência/domínio + piloto no Streamer

> Anotado em 2026-06-16. Trabalho em progresso, commitado só pra pausar. **Não é código final.**

## TL;DR (pra retomar rápido)

Saiu uma análise cross-cutting + reflexão arquitetural que viraram **6 decisões** sobre repositórios e datas. Já estão registradas como issues no Linear (projeto Backstream). O **módulo streamer** é o piloto pra aplicar tudo, porque é o único sem repositório Drizzle ainda.

## Decisões tomadas (viram ADRs + código)

| # | Issue | Decisão |
|---|---|---|
| R1 | CAI-61 | Repositórios com **`insert(entity)` / `update(entity)` explícitos**. Sem `save` genérico nem upsert como padrão (upsert só pontual e nomeado, tipo `upsertFromExternalSync`). |
| D1 | CAI-62 | `id: UniqueId` **sempre injetado** de fora; domínio não importa infra (`id-generator`/`clock`). Timestamp só fica no domínio se **regra de negócio usa** (ex.: `RefreshToken.expiresAt`/`revokedAt`), e aí injetado. Timestamp **só de auditoria** (`createdAt`, `updatedAt`) **sai do domínio** → banco gera via `DEFAULT NOW()`. |
| D2 | CAI-63 | `refresh-token-repository.ts:33,44,54` para de usar `new Date()`; timestamp vem do use case ou do banco. (bloqueada por R1+D1) |
| D3 | CAI-64 | Todas as colunas de data → **`timestamptz`**, `mode: 'date'` no drizzle, **UTC fixo** na sessão/role. Motivo: `timestamp` puro é wall-clock ingênuo (bug "ok em dev, quebra em prod"); `timestamptz` grava instante UTC inequívoco. 7 tabelas. |
| R2 | CAI-65 | `Slug` e `Username` ganham **`equals()`** (como `Phone`); repos recebem VO e comparam com `.equals()`. |
| R3 | CAI-66 | Toda escrita passa pelo **mapper (`toPersistence`)**; hoje vários repos inlinam o insert. `streamer-mapper` só tem `toDomain`. (bloqueada por R1) |

Ordem de dependência: **R1 + D1** primeiro (destravam D2 e R3). **D3 e R2** são independentes e podem ir em paralelo.

## Estado atual do código (o que está neste commit)

Tudo no módulo **streamer**, ainda incompleto:

- `apps/api/src/modules/streamer/domain/streamer.ts` (modificado)
  - ✅ Já **removeu `createdAt` do domínio** (alinhado com D1).
  - ❌ Ainda chama `generateId()` e `now()` **internos** em `create`/`changeSlug`/`updatePixKey` — falta injetar (D1).
  - Adicionou `__create` (reconstituição).
- `apps/api/src/modules/streamer/infrastructure/` (novo, não rastreado)
  - `database/schemas/streamer.ts` → ❌ usa `timestamp` puro, precisa virar `timestamptz` (D3).
  - `database/mappers/streamer-mapper.ts` → ❌ só tem `toDomain`, falta `toPersistence` (R3).
  - `http/routes/index.ts`.
  - ❌ **Não existe repositório Drizzle do streamer ainda** — é onde aplicar R1 (`insert`/`update`).

⚠️ **Cuidado ao retomar:** o schema e o mapper acima estão no estado ANTIGO — não tratar como referência boa.

## Próximo passo (o que estávamos começando)

Fazer o **streamer como piloto** das convenções, nascendo já certo:

1. **D3** — schema do streamer → `timestamptz` (`{ withTimezone: true }`), `mode: 'date'`.
2. **R1** — criar `DrizzleStreamerRepository` com `insert`/`update` explícitos (implementar a abstract `StreamerRepository`).
3. **R3** — `streamer-mapper` ganha `toPersistence`; repo usa o mapper (não inlina).
4. **D1** — `Streamer.create`/`changeSlug`/`updatePixKey` recebem `id`/`now` de fora; remover imports de infra.
5. **R2** — `Slug`/`Username` com `equals()` (usado pelo `findBySlug`).

Depois do piloto validado, propagar pros módulos auth/profile e escrever os ADRs (R1, D1, R2 são candidatos, no padrão do 0002).
