# ADR 0002: Leitura cross-módulo via query port injetado

- **Status:** Aceita
- **Data:** 2026-06-10
- **Contexto de origem:** REF-05 (CAI-58) — compor `ProfileSummary` nas respostas
  de login / register / me.

## Contexto

A arquitetura separa **módulos** (auth, profile, …) com fronteiras explícitas:
cada módulo expõe uma camada `public/` (commands, queries, events, types) e
esconde domínio e aplicação. Uma invariante de desenho é "auth não conhece
profile" (e vice-versa).

Em REF-05 o front passou a precisar de `name`, `avatarUrl` e `profileCompleted`
(dados de **profile**) na resposta de **login** (rota do **auth**). Isso colide
com a invariante: como compor dados de profile numa rota de auth sem o auth
passar a depender de profile?

Já tínhamos resolvido o caso **oposto** em REF-04 (CAI-57): o **registro**
*escreve* em auth **e** profile na mesma transação — e isso virou uma **feature**
(`features/registration`) que coordena os dois módulos, justamente porque
orquestração com escrita cruzando módulos não pertence a nenhum módulo isolado.

Faltava a régua pro caso de **leitura**.

## Escopo desta decisão

Esta decisão vale para **leitura simples** que cruza módulos: a rota lê dados de
outro módulo (sem escrever) e os agrega na resposta, **sem coordenação rica**
(sem orquestrar vários módulos, regras de negócio ou cache no caminho da
leitura). Casos de leitura com coordenação rica caem **fora** deste contexto —
ver "Quando revisitar". Não é uma proibição permanente da alternativa (b), só o
default para o caso simples.

## Decisão

A direção do dado decide onde a coordenação mora:

- **Escrita / orquestração que cruza módulos → feature.** Ex.: REF-04, o registro
  cria credenciais (auth) + profile numa transação → `features/registration`.
- **Leitura simples que cruza módulos → query port público injetado; a rota fica
  no módulo dono.** Ex.: REF-05, o login fica no auth, mas a rota **recebe
  `ProfileSummaryQuery` injetada** no composition root (`main.ts`). O auth não
  importa profile internamente — só consome um port público que outra camada
  injeta.

Concretamente em REF-05: `login`, `me` (rotas do auth) e `register` (rota da
feature) recebem `profileSummary: ProfileSummaryQuery` e compõem o `ProfileSummary`
na resposta via o helper `shared/http/with-profile-summary.ts`. O módulo auth
continua sem conhecer profile no seu núcleo.

## Consequências

- ✅ Invariante "auth não conhece profile" preservada — a dependência é um port
  público injetado de fora, não um import interno do módulo.
- ✅ Menos cerimônia que criar `features/authentication` só pra ler profile: login
  só lê, não escreve, então não precisa de uma feature de orquestração.
- ✅ Régua clara e simétrica pra decidir feature vs. módulo daqui pra frente.
- ⚠️ A rota assume a invariante "todo usuário tem profile" (pós REF-04). Se a
  query retornar `null`, é violação de invariante → **fail-loud** (lança), sem
  fallback defensivo.
## Quando revisitar

- Se uma leitura cross-módulo precisar de **coordenação mais rica** (vários
  módulos, regras, cache), isso está **fora do escopo** acima → considerar uma
  feature de leitura (alternativa (b) da CAI-58). Como o contexto é distinto,
  isso não conflita com este ADR — documente o caso (comentário ou ADR próprio
  referenciando este).
- Se um dia o **default do caso simples** precisar mudar (passar a (b) também
  para leitura simples), aí sim é a mesma decisão: escreva um ADR que
  **`Supersedes` este**, e mude o Status deste para `Superseded by …`.

## Referências

- ADR [0001](0001-dispatch-de-eventos-pos-commit.md) — dispatch de eventos pós-commit.
- REF-04 (CAI-57) — `features/registration`, o lado "escrita → feature" da régua.
