# ADR 0005: Comparação de Value Objects via `equals` e repositórios recebendo VO

- **Status:** Aceita
- **Data:** 2026-06-18
- **Contexto de origem:** R2 (CAI-65) — regra de comparação de Value Objects.

## Contexto

Conforme Value Objects entram nos domínios (`Slug`, `Username`, `Phone`,
`Email`), surge a pergunta recorrente de **como comparar** um VO: contra outro VO
ou contra o primitivo embrulhado.

O sintoma concreto foi o bug do `findBySlug`, que comparava
`s.props.slug === slug` — um objeto `Slug` contra uma `string` — sempre dando
`false`. É uma classe de bug que **reaparece** a cada novo VO e a cada novo
`findBy*`, porque a comparação estava ad-hoc: uns lugares desembrulhavam com
`.value`, outros comparavam referência de objeto, e as assinaturas dos
repositórios recebiam `string` solta sem deixar claro o que esperar.

## Escopo desta decisão

Vale para **comparação de Value Objects** e para o **contrato de busca dos
repositórios** por um VO. Complementa o ADR
[0004](0004-mapeamento-de-escrita-via-builders-no-mapper.md) (R3): lá o `.value`
de escrita foi centralizado no mapper; aqui o `.value` de leitura/comparação é
disciplinado pela mesma lógica — um VO se compara como VO.

## Decisão

**1. Todo VO expõe `equals(other: T): boolean`.** Compara por valor, não por
referência. `Slug`, `Username` e `Phone` têm; novos VOs (`Email`, etc.) devem
seguir o mesmo contrato.

**2. Repositórios recebem o VO, não o primitivo.** As assinaturas de busca por um
campo que é VO recebem o tipo do VO:

- `StreamerRepository.findBySlug(slug: Slug)`
- `ProfileRepository.findByUsername(username: Username)`
- `ProfileRepository.findByPhone(phone: Phone)`

Isso torna a intenção explícita no call site e impede a comparação acidental
objeto-vs-string.

**3. A comparação acontece na fronteira certa de cada adapter:**

- **In-memory (test doubles) e lógica em memória** comparam com **`.equals()`**:
  `this.items.find(s => s.props.slug.equals(slug))`.
- **Drizzle/SQL** desembrulha o primitivo **no `WHERE`**, num lugar só:
  `eq(table.slug, slug.value)`. O `.equals()` não roda no banco; o que a regra
  garante é que o repo recebe o VO e o `.value` aparece só ali.

**4. Use cases constroem o VO uma vez e o repassam.** Em vez de espalhar
`vo.value` pelos use cases, cria-se o VO e ele atravessa a comparação, o
`findBy*` e a criação do agregado. (Efeito colateral positivo: corrigiu o
`onboard-streamer`, que checava existência com a slug crua mas gravava a
normalizada — agora usa a mesma `Slug` nos dois.)

## Consequências

- ✅ Fecha a classe de bug objeto-vs-primitivo na leitura/comparação.
- ✅ Assinaturas de repositório auto-explicativas (`findBySlug(slug: Slug)`).
- ✅ `.value` concentrado: na escrita, no mapper (ADR 0004); na leitura, no
  `WHERE` do adapter SQL.
- ✅ Test doubles comparam por valor de verdade (`.equals()`), espelhando o
  adapter real em vez de mascarar diferenças.
- ⚠️ Buscar por VO exige construir o VO antes da query — custo pequeno e
  desejável (valida/normaliza o input no caminho).
- ⚠️ `findBy*` por campos que **não** são VO (ex.: ids `UniqueId`, datas)
  continuam com o primitivo; a regra é só para campos modelados como VO.

## Quando revisitar

- Quando entrar `Email` (ou outro VO) num `findBy*` → seguir o mesmo contrato
  (`equals` + assinatura recebendo o VO).
- Se a comparação por valor precisar considerar normalização/canonicalização
  (ex.: `Slug` de `create` vs `createFromText`) → o `equals` é o lugar de
  decidir isso; documentar em ADR próprio se a regra de igualdade ficar não-trivial.

## Referências

- ADR [0003](0003-escrita-de-repositorios-insert-update-explicitos.md) — `insert`/`update` explícitos (R1).
- ADR [0004](0004-mapeamento-de-escrita-via-builders-no-mapper.md) — mapeamento de escrita via builders (R3). Centraliza o `.value` de escrita.
- CAI-65 — issue desta decisão.
