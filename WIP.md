# WIP — Fix: Slug VO no streamer + reverter username do profile

## Contexto

Adicionados os VOs `Slug` e `Username` em `apps/api/src/shared/domain`.
- `Slug` foi wireado no `Streamer` (`props.slug` agora é `Slug`, não string) →
  quebrou 5 testes unitários do streamer + erros de tsc (string↔Slug).
- `Username` foi posto em `ProfileProps` (profile.ts) mas **não** threadado →
  vitest não pega (sem typecheck), `tsc` acusa 6 erros.

**Decisão:** reverter `username` do Profile por ora (VO `Username` fica em
shared/domain pra tarefa futura); consertar o streamer/Slug agora.

## Parte A — Reverter `username` do Profile

`apps/api/src/modules/profile/domain/profile.ts`:
- [ ] Import: `import { Phone, Username }` → `import { Phone }`.
- [ ] Remover `username: Username` de `ProfileProps`.
- [ ] Remover `username: input.username` do corpo de `Profile.create`.

`CreateInput` (`Omit<…>`) e `__create` se ajustam sozinhos. Nada de username foi
pra mapper/schema/migração — não há mais o que tocar.

## Parte B — Streamer/Slug: produção

- [ ] `apps/api/src/modules/streamer/test/in-memory-streamer-repository.ts:22`
  `s.props.slug === slug` → `s.props.slug.value === slug` (corrige o dedup que
  faz `SlugAlreadyTakenError` não disparar).
- [ ] `apps/api/src/modules/streamer/application/use-cases/change-streamer-slug-use-case.ts:36`
  `input.slug !== streamer.props.slug` → `... !== streamer.props.slug.value`.

## Parte C — Streamer/Slug: specs

Asserts que comparam `props.slug` (agora `Slug`) a string → `.value`; seeds que
montam `Streamer` com `slug: string` → `Slug.create(...)`:
- [ ] `streamer.spec.ts` (~:71) — assert `.props.slug.value`.
- [ ] `change-streamer-slug-use-case.spec.ts` (~:58) — assert `.value`.
- [ ] `onboard-streamer-use-case.spec.ts` (~:99) — assert `.props.slug.value`.
- [ ] `rename-streamer-use-case.spec.ts` (~:34) — seed `slug: Slug.create(...)`.
- [ ] `update-streamer-pix-key-use-case.spec.ts` (~:35) — seed `slug: Slug.create(...)`.

> Na execução: grep cada spec por `.slug` pra pegar asserts adicionais além da
> linha que falhou primeiro (cada `it` para no primeiro erro).

## Verificação

A partir de `apps/api/`:
1. `npx tsc --noEmit` → exit 0.
2. `npm test` → as 5 falhas do streamer verdes; resto intacto.
3. `npx biome check --write apps packages`.

## Fora de escopo

- Threading real de `username` no Profile (fonte, unicidade, coluna+migração,
  exposição na resposta) — tarefa própria; `Username` fica em shared/domain.
- Wiring do streamer-module (DrizzleStreamerRepository + rotas) — segue TODO.
