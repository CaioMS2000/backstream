# Backstream

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
