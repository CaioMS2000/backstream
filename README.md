# Backstream

Plataforma para streamers gerenciarem doações vinculadas a metas de mídia
("reagir a isso quando bater X em doações"). Doadores pagam via PIX
(Pagar.me, com split de comissão para a plataforma); a mídia sobe de
"aguardando meta" para "meta atingida" e depois "reagida". Ver
[`escopo-mvp.md`](escopo-mvp.md) para o que entra/fica fora da primeira
versão e a hipótese de negócio por trás.

## Arquitetura

Monorepo turborepo com um único serviço hoje:

- `apps/api` — API HTTP (Fastify + Drizzle/Postgres), monolito modular por
  bounded context (`auth`, `profile`, `streamer`, `media`, `donation`). Ver
  [`arquitetura-modulos.md`](arquitetura-modulos.md) para os módulos, seus
  contratos públicos e as regras de comunicação entre eles.
- `packages/core`, `packages/shared` — utilitários e tipos compartilhados
  entre módulos/apps (id generation, eventos, tipos comuns).

Decisões arquiteturais significativas ficam registradas como ADRs em
[`apps/api/docs/adr/`](apps/api/docs/adr/). Visão de contexto (quem usa o
sistema e com quais sistemas externos ele troca dado) em
[`apps/api/docs/c4-context.md`](apps/api/docs/c4-context.md).

## Estado atual

| Módulo | Status |
|---|---|
| `auth` | Pronto |
| `profile` | Pronto |
| `streamer` | Em construção |
| `media` | Não iniciado |
| `donation` | Não iniciado |

Ainda não há decisão de deploy/infra de produção.

## Rodando localmente

Pré-requisitos: Node >= 18, Postgres acessível via `DATABASE_URL`.

```bash
npm install

# apps/api/.env precisa de:
#   NODE_ENV, DATABASE_URL, AUTH_JWKS_URL,
#   JWT_PRIVATE_KEY, JWT_PUBLIC_KEY (ver ./jwt-keys.sh para gerar o par),
#   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI (login social)

npm run db:migrate   # aplica migrations do apps/api
npm run dev           # sobe a API (porta 3333 por padrão)
```

Outros comandos úteis (rodam em todos os workspaces via turbo):

```bash
npm run test              # testes unitários
npm run test:integration  # testes de integração (precisa de DATABASE_URL)
npm run check-types
npm run db:generate       # gera migration a partir do schema Drizzle
```

`./kill-8000.sh <porta>` mata o processo preso numa porta (default 3333) em
dev, se o `tsx watch` ficar travado.

## Banco de dados

### Timezone (UTC)

Todas as colunas de data usam `timestamptz` e a aplicação assume **UTC** em toda
conexão (ver `apps/api/src/lib/drizzle.ts`, que passa `options: '-c timezone=UTC'`
no startup da `Pool`).

> ⚠️ **Lembrete:** se em algum ambiente você tiver o arquivo de `compose` do banco
> sob seu controle, fixe o timezone do Postgres também no servidor, adicionando ao
> serviço do banco:
>
> ```yaml
> command: ["postgres", "-c", "timezone=UTC"]
> ```
>
> Isso garante UTC para qualquer cliente que conecte (app, drizzle-kit, psql, BI),
> não só para a aplicação. Alternativa server-side persistente:
> `ALTER DATABASE <db> SET timezone TO 'UTC';`.
