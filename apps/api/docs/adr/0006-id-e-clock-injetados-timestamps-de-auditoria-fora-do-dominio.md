# ADR 0006: `id` e `clock` injetados de fora; timestamps de auditoria saem do domínio

- **Status:** Aceita (rollout em andamento — ver seção "Estado da migração")
- **Data:** 2026-06-27
- **Contexto de origem:** CAI-62 (D1) — padronizar como agregados recebem `id` e timestamps

## Contexto

Vários agregados geravam seu próprio `id` e timestamps internamente, chamando
infraestrutura diretamente de dentro do domínio:

```ts
// user.ts, password-credential.ts, streamer.ts (antes)
import { generateId } from '@/shared/infrastructure/id-generator'

static async create(input: { email: Email; roles: Role[] }): Promise<User> {
  const user = new User(await generateId(), input.email, input.roles, null, new Date())
  ...
}
```

Isso tem dois problemas:

- **Domínio importando infraestrutura.** `id-generator` e `clock` são detalhes
  de implementação (UUID v7, `Date.now()`); o agregado não deveria depender
  deles para ser instanciado, e `create` vira `async` só por causa da geração
  do `id` — sem nenhuma regra de negócio ser assíncrona.
- **`createdAt`/`updatedAt` de auditoria morando no agregado.** Em módulos
  como `profile` e `streamer`, o domínio carrega e manipula esses campos, mas
  eles não expressam nenhuma invariante de negócio — são metadado de auditoria
  que o banco já sabe preencher sozinho (`DEFAULT now()`, `$onUpdate`).
  Carregá-los no domínio é peso morto: todo teste de unidade que constrói o
  agregado precisa inventar um valor pra eles, e todo mapper precisa
  ida-e-volta desnecessária.

A alternativa considerada e descartada foi manter como estava: domínio
autossuficiente, gerando seu próprio `id` via `generateId()` e seu próprio
timestamp via `new Date()`/`now()` interno, com `createdAt`/`updatedAt`
tratados como parte do agregado igual a qualquer outro campo.

## Decisão

- **`id: UniqueId` é sempre injetado de fora.** O agregado nunca chama
  `generateId()` internamente; quem cria (use case ou factory de mais alto
  nível) gera o `id` e passa para o `create`/`issue` do agregado. Isso elimina
  o `async` artificial em métodos de criação que não têm nenhuma regra de
  negócio assíncrona.
- **`now: Date` é sempre injetado de fora** quando o agregado precisa de hora
  atual — nunca `new Date()`/`Date.now()` dentro do domínio.
- **Timestamp só fica no domínio se uma regra de negócio o usa.** Exemplo:
  `RefreshToken.expiresAt`/`revokedAt` ficam no agregado porque `isValid()`
  compara contra eles — é invariante de negócio, não auditoria.
- **`createdAt`/`updatedAt` de auditoria saem do domínio.** Não são
  reconstruídos no agregado nem passados por `create`; o banco preenche
  (`DEFAULT now()` na criação, `$onUpdate`/trigger na atualização). Quando a
  camada de aplicação precisa expor esses campos (ex.: numa resposta HTTP),
  eles vêm direto da leitura no banco, não do agregado.

`RefreshToken` é o padrão de referência: `issue({ id, userId, value, now,
lifetimeMs })` — `id`/`now` injetados, sem `createdAt`/`updatedAt`, só
`expiresAt`/`revokedAt`/`usedAt` porque são regra de negócio.

## Estado da migração

Rollout incremental por agregado, não foi feito tudo de uma vez:

| Agregado | `id` injetado | `now`/clock injetado | Timestamps de auditoria fora do domínio |
|---|---|---|---|
| `RefreshToken` | ✅ | ✅ | ✅ (só tem `expiresAt`/`revokedAt`, que são regra de negócio) |
| `Profile` | ✅ | ✅ | ❌ (ainda carrega `createdAt`/`updatedAt` no agregado e no mapper) |
| `User` | ❌ (`generateId()` interno em `user.ts:50`) | — (`createdAt` já vem por parâmetro, mas não é tratado como "sai do domínio") | ❌ |
| `PasswordCredential` | ❌ (`generateId()` interno em `password-credential.ts:19`) | — | ❌ |
| `Streamer` | ❌ (`generateId()`+`now()` internos em `streamer.ts:44-45`, `now()` em `:66` e `:72`) | ❌ | ❌ (schema tem `created_at`/`updated_at` sem `$onUpdate`) |

Também falta, independente de agregado: nenhum schema Drizzle tem
`.$onUpdate(() => new Date())` (ou trigger) — hoje `updated_at` de `profile` e
`streamer` fica `null` para sempre, já que ninguém escreve nele.

## Consequências

- ✅ Domínio não depende de infraestrutura para se instanciar — `create`/`issue`
  pode voltar a ser síncrono quando não há motivo real para `async`.
  Testes de unidade injetam `id`/`now` fixos sem precisar mockar módulo de
  infra.
- ✅ Menos campo morto no agregado: `createdAt`/`updatedAt` de auditoria não
  cruzam a fronteira domínio ↔ banco desnecessariamente.
- ⚠️ Enquanto a migração não terminar, o codebase fica inconsistente: alguns
  agregados seguem o padrão novo, outros o antigo (tabela acima). Quem for
  criar um agregado novo deve seguir o padrão do `RefreshToken`, não copiar
  `User`/`Streamer` como estão hoje.
- ⚠️ Até os schemas ganharem `$onUpdate`/trigger, `updated_at` de `profile` e
  `streamer` não reflete a realidade (fica `null`). Não confiar nessa coluna
  para nada até isso ser corrigido.

## Quando revisitar

Quando a tabela de estado acima estiver toda ✅ e os `$onUpdate` estiverem
implementados, esta ADR pode ser fechada como concluída (sem necessidade de
nova ADR — só atualizar a tabela ou removê-la se preferir).
