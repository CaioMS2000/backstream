# ADR 0004: Mapeamento de escrita centralizado em builders no mapper

- **Status:** Aceita
- **Data:** 2026-06-18
- **Contexto de origem:** R3 (CAI-66) — centralizar a escrita dos repositórios
  via mapper.

## Contexto

Os mappers estavam inconsistentes entre os agregados:

- Alguns tinham mapper dedicado com `toDomain`/`toPersistence` (`user`,
  `profile`, `refresh-token`); outros montavam o objeto de escrita **inline** no
  repositório (`oauth-account`, `oauth-state`, `password-credential`), mesmo
  quando o mapper já existia.
- Onde a escrita era inline, o **desempacotamento dos Value Objects** (`vo.value`)
  acontecia espalhado pelos repositórios — a mesma classe de bug do
  `findBySlug` (`Slug` vs `string`), que tende a reaparecer conforme VOs entram
  nos domínios (ver R2 / CAI-65).
- Onde existia um `toPersistence` único (linha inteira), ele servia bem ao
  `insert`, mas o `update` não conseguia reusá-lo — só mexe num subconjunto de
  colunas — e acabava re-listando colunas inline de novo.

A raiz é que **leitura e escrita não são simétricas**: o `SELECT` devolve a linha
inteira, mas o `INSERT` e o `UPDATE` escrevem conjuntos de colunas diferentes
(o `UPDATE` só o subconjunto mutável). Um único `toPersistence` força um molde
que não serve aos dois.

## Escopo desta decisão

Vale para **toda a tradução domínio → colunas** na camada de persistência.
Complementa, sem repetir:

- ADR [0003](0003-escrita-de-repositorios-insert-update-explicitos.md) (R1) —
  *quais* métodos o repositório expõe (`insert`/`update`). Este ADR trata de
  *como* o payload de cada um é montado.
- D1 (CAI-62) — *onde* `id`/timestamps são gerados. Este ADR assume essa decisão
  ao definir que os builders **não emitem** timestamps de auditoria.

## Decisão

**1. O mapper é o dono das duas direções da tradução.** `toDomain` faz a leitura
(persistência → domínio). A tradução domínio → colunas — incluindo todo
`vo.value` — **vive no mapper**, nunca inline no repositório. Um VO é
desempacotado num lugar só, por agregado.

**2. Escrita é assimétrica → builders por operação.**

- **`toInsertColumns(entity)`** — colunas da criação.
- **`toUpdateColumns(entity)`** — apenas o subconjunto **mutável** (exclui
  `id` e colunas imutáveis).

Agregados que mutam (`user`, `profile`, `streamer`) têm os dois. Entidades/records
append-only (`password-credential`, `oauth-account`, `oauth-state`,
`refresh-token`) têm só `toInsertColumns`. O `toPersistence` único fica
**aposentado** — substituído pelo par.

**3. Os builders não emitem timestamps de auditoria.** `createdAt`/`updatedAt`
ficam de fora do retorno; quem preenche é o banco (`DEFAULT NOW()` no `INSERT`;
`.$onUpdate(...)` ou trigger no `UPDATE`). Coerente com D1: auditoria não passa
pelo domínio nem é fabricada na aplicação (sem `new Date()` na escrita). O repo
também não força o tipo `$inferSelect` no payload — usa o shape de insert, onde
colunas com default são opcionais.

**4. Geração de `id` segue a natureza da coisa.** Agregado de domínio recebe `id`
injetado (D1) e o builder só o repassa. Para **records sem agregado**
(`oauth-account`, `oauth-state`), gerar o `id` no próprio repositório (camada de
infra) é aceitável — mas o mapeamento das colunas ainda passa pelo builder.

**5. Nomenclatura padrão:** `toDomain` / `toInsertColumns` / `toUpdateColumns`.
Evita o `toPersistence` genérico, que esconde a assimetria e tenta servir aos
dois caminhos.

## Consequências

- ✅ O `vo.value` mora num lugar só por agregado — fecha a classe de bug do R2 na
  direção de escrita.
- ✅ `insert` e `update` reusam o mapper sem re-listar colunas no repositório; o
  repo fica magro (`.values(Mapper.toInsertColumns(e))` /
  `.set(Mapper.toUpdateColumns(e))`).
- ✅ A assimetria leitura/escrita fica explícita no código, em vez de mascarada
  por um `toPersistence` que não cabe no `update`.
- ✅ Auditoria deixa de vazar pra aplicação (sem `new Date()` na escrita).
- ⚠️ Mais um método por mapper nos agregados que mutam — custo pequeno e
  proporcional ao uso real (não há builder especulativo: insert-only não ganha
  `toUpdateColumns`).
- ⚠️ Builders sem anotação de tipo de retorno dependem da inferência do drizzle
  pra validar o payload contra o schema; se a inferência não pegar uma coluna
  faltante, vale anotar com `typeof tabela.$inferInsert`.

## Quando revisitar

- Se um agregado precisar de `UPDATE` parcial por concorrência → a ferramenta é
  optimistic locking (ver ressalva no ADR 0003), não um builder por campo.
- Se a tradução virar custosa o suficiente pra justificar uma abstração comum
  entre mappers (improvável dado o princípio de interfaces pequenas) → ADR que
  **`Supersedes` este**.

## Referências

- ADR [0003](0003-escrita-de-repositorios-insert-update-explicitos.md) — `insert`/`update` explícitos (R1). Decisão irmã.
- R2 (CAI-65) — `equals()`/comparação de VO; centralizar `.value` reduz a mesma classe de bug.
- D1 (CAI-62) — injeção de `id` e timestamps de auditoria fora do domínio.
- CAI-66 — issue desta decisão.
