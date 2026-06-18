# ADR 0003: Escrita de repositórios com `insert`/`update` explícitos

- **Status:** Aceita
- **Data:** 2026-06-18
- **Contexto de origem:** R1 (CAI-61) — padronizar a semântica de escrita dos
  repositórios.

## Contexto

A semântica de escrita dos repositórios estava inconsistente entre agregados:

- Upsert via `onConflictDoUpdate` (`user`, `profile`);
- Insert-only + métodos à parte (`revoke`/`markUsed`) (`refresh-token`);
- Insert-only com id gerado + `.returning()` (`oauth-account`, `oauth-state`);
- Insert-only (`password-credential`).

O ponto comum problemático era o **`save` genérico** (muitas vezes implementado
como upsert): um único método que servia tanto pra criar quanto pra atualizar.
Isso **esconde a intenção** no ponto de chamada e mistura dois significados de
negócio bem diferentes — criar algo novo vs. mutar algo que já existe têm regras,
erros e efeitos distintos.

O bug do `User.save` (CAI-50, em que adicionar/remover role não atualizava) foi
sintoma direto disso: o caller "salvava" sem que o tipo ou o nome deixassem claro
se aquilo era criação ou atualização, e o upsert por baixo mascarou o
comportamento errado.

## Escopo desta decisão

Vale para **toda escrita de repositório** (a camada de persistência por trás dos
ports da aplicação). Não trata de *onde* o `id`/timestamps são gerados (ver D1 /
CAI-62) nem de centralizar a escrita via mapper (ver R3 / CAI-66) — essas são
decisões irmãs e complementares.

## Decisão

**1. Métodos explícitos, nomeados por intenção. Sem `save` genérico, sem upsert
como padrão.**

- **`insert(entity)`** — criação. Falha se o registro já existe.
- **`update(entity)`** — mutação de registro existente. Falha (`...NotFoundError`)
  se o registro não existe.

Transições de estado específicas continuam como **métodos nomeados** quando o
domínio assim pede (ex.: `refresh-token`: `revoke`, `revokeAllForUser`,
`markUsed`; `oauth-state`: `findAndDelete` — consumo de uso único).

**2. O contrato é dirigido pela demanda — cada repositório declara só os métodos
que seu uso real exige.** Não há um CRUD especulativo. Na prática, "`insert` **e**
`update`" é a **exceção** (agregados com mutação real: `user`, `profile`,
`streamer`), não a regra — a maioria é `insert` + alguma operação nomeada de
leitura/remoção/transição (`oauth-account`, `oauth-state`, `refresh-token`,
`password-credential`).

**3. Sem superclasse base genérica compartilhada.** "Interface base/abstrata"
cumpre-se como **convenção** (todo repo usa `insert`/`update` nomeados, nunca
`save`), e não como uma classe-mãe única com `insert`+`update` obrigatórios. Uma
base assim reintroduziria o CRUD especulativo que esta decisão combate — 4 dos 7
repositórios não têm `update`, e forçá-lo seria exatamente o smell de
*Speculative Generality*.

**4. Upsert só pontual e nomeado por intenção.** Quando um upsert for legítimo —
tipicamente **sincronização de fonte externa idempotente** (ex.: webhook do
Pagar.me) — ele entra como um método explícito que revela o motivo (ex.:
`upsertFromExternalSync`), nunca como o `save` default. Hoje **não existe** nenhum
caso desses no código.

**5. Test doubles fiéis ao contrato.** Os repositórios in-memory espelham a
semântica do adapter real: `insert` adiciona (não sobrescreve silenciosamente);
`update` lança `...NotFoundError` quando o registro não existe. Um fake que faz
upsert nos dois esconde justamente a classe de bug do CAI-50 e é proibido.

## Consequências

- ✅ A intenção fica explícita no ponto de chamada (`insert` vs `update`) — some a
  ambiguidade que originou o CAI-50.
- ✅ Interfaces pequenas e honestas (role interfaces): o repo só expõe o que é
  usado, sem métodos mortos.
- ✅ Upsert deixa de ser o default invisível; quando existir, será deliberado e
  auto-explicativo.
- ✅ Fakes deixam de mascarar erros de intenção.
- ⚠️ Operações que mudam mais de um campo de um agregado fazem um `update` do
  agregado inteiro (não há update por-campo). Se concorrência vier a ser um
  problema, a ferramenta é optimistic locking (coluna `version`) no agregado, não
  métodos por campo — revisitar nesse caso.
- ⚠️ Repositórios que hoje são só `insert` (ex.: `password-credential`) vão ganhar
  `update`/transições quando o uso exigir (ex.: troca/revogação de senha) — e isso
  é esperado, não uma lacuna desta decisão (YAGNI: difere implementação, não
  previsão).

## Quando revisitar

- Quando entrar o módulo de pagamentos/doações e surgir o primeiro caso real de
  sincronização externa idempotente → adicionar o `upsertFromExternalSync` (ou
  nome equivalente) no repo afetado, mantendo `insert`/`update` separados.
- Se concorrência em algum agregado crítico exigir escrita parcial → avaliar
  optimistic locking; documentar em ADR próprio referenciando este.
- Se a convenção precisar virar uma base compartilhada (improvável dado o
  princípio acima), escrever um ADR que **`Supersedes` este**.

## Referências

- ADR [0002](0002-leitura-cross-modulo-via-query-port.md) — leitura cross-módulo via query port.
- CAI-50 — bug multi-role (sintoma do `save`/upsert ambíguo) que motivou a decisão.
- R3 (CAI-66) — centralizar escrita via mapper; D1 (CAI-62) — injeção de `id` e
  remoção de timestamps de auditoria do domínio. Decisões irmãs desta.
