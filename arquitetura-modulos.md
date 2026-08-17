# Arquitetura de módulos

Notas de design dos bounded contexts do Backstream. Revisitar antes de criar novos módulos. Ancorado no [escopo do MVP](escopo-mvp.md). Para a visão de fora (quem usa o sistema e com quais sistemas externos ele troca dado), ver [C4 Context](apps/api/docs/c4-context.md).

## Princípio geral

Monolito modular com módulos isolados por bounded context. Cada módulo tem seu próprio domínio, application, infrastructure, e expõe um contrato público em `public/` para outros módulos consumirem (commands, queries, events, types). Comunicação entre módulos via:

- **Referência por ID** no dia-a-dia (userId, streamerId, mediaId chegando via request autenticada)
- **Domain events internos** (handler dentro do mesmo módulo) — dispatcher próprio do módulo
- **Integration events públicos** (cross-módulo) — bus compartilhado, contratos em `modules/*/public/events/`
- **Query ports read-only** quando um módulo precisa de dado de outro (ver ADR 0002)

## Contrato público de um módulo

Cada módulo expõe em `public/`:

- **Commands** — operações de escrita invocáveis por outro módulo ou feature (`createCredentials`, `createProfile`, …)
- **Queries** — leituras read-only (`profileSummary`, `userSummary`, …)
- **Events** — integration events que o módulo publica ou que outros consomem
- **Types / services** — DTOs e serviços auxiliares (`AuthenticatedUser`, `AccessTokenVerifier`, …)

Regra dura: **features e outros módulos só importam de `modules/*/public/`** — nunca de `domain/`, `application/` ou `infrastructure/` de outro módulo.

## Módulos

### auth (existente)

Identidade e credencial. Source of truth de email, senha, roles, revogação, tokens e OAuth.

- Aggregate: `User` (email, roles, revokedAt)
- Commands públicos: `createCredentials`, `createCredentialsFromProvider`, `tryLoginViaProvider`, `issueTokens`
- Queries públicas: `userSummary`
- Não cuida de: name, phone, avatar — isso é `profile`. Também não cuida de slug, PIX, mídias, doações.
- Integration events: `CredentialsCreated`, `SocialUserRegistered`

### profile (existente)

Identidade comum de **qualquer usuário**, independente de role. Source of truth de name, phone e avatarUrl.

- Aggregate: `Profile`
- Campos: `userId` (FK lógica pro auth), `name`, `phone`, `avatarUrl`
- Invariante: **phone único globalmente** (quando preenchido)
- `profileCompleted` = phone preenchido — sinaliza onboarding incompleto pro front
- Commands públicos: `createProfile` (escrita cross-módulo; update fica no use case interno via rota própria)
- Queries públicas: `profileSummary` (name, phone, avatarUrl, profileCompleted)
- Não cuida de: email, senha, roles, slug, username de doador, dados de payout
- Domain events internos: `ProfileCreated`, `ProfileUpdated`

**Profile ≠ módulo guarda-chuva.** O `profile` guarda dados que valem pra **todo usuário** (admin, streamer, donor). Os módulos `streamer` e `donor` (futuros) guardam dados de **role específico** com invariantes próprias (slug único, username único). O "guarda-chuva" rejeitado seria um módulo único que misturasse identidade comum + perfil de streamer + perfil de doador — invariantes e lifecycles diferentes no mesmo aggregate. `profile` existe justamente pra **evitar** que auth cresça com name/phone.

### streamer (próximo)

Perfil público de quem cria conteúdo. Source of truth do slug e dos dados de payout.

- Aggregate: `Streamer`
- Campos: `userId` (FK lógica pro auth), `displayName`, `slug`, `pixKey`, `pagarmeAccountId`
- Invariante crítica: **slug único globalmente** — vai na URL pública (`plataforma.com/seunome`)
- Criação: handler de `RegistrationCompleted` (ou evento futuro de onboarding de streamer) cria `Streamer` quando role é `streamer`, ou via use case explícito de "completar cadastro de streamer"
- Integration events: `StreamerOnboarded`, `StreamerSlugChanged`

### media (depois de streamer)

Gestão da carteira de mídias do streamer com metas de doação.

- Aggregate: `Media`
- Campos: `streamerId` (FK), `name`, `category`, `targetAmount`, `currentAmount`, `description`, `status`
- Estados: `awaiting_goal`, `goal_reached`, `reacted`, `cancelled`
- Invariantes: progresso não pode ser maior que meta; só pode marcar como reagida se status era `goal_reached`; cancelamento exige justificativa
- Reordenação manual da fila de mídias com meta atingida
- Integration events: `MediaGoalReached` (notifica streamer in-app), `MediaCancelled` (futuro: notifica doadores), `MediaReacted`

### donation (depois de media)

Fluxo de doação via PIX, integração Pagar.me, anti-impersonation.

- Aggregate: `Donation`
- Campos: `mediaId`, `amount`, `donorName`, `donorUserId` (nullable — doação anônima), `pagarmeChargeId`, `status` (`pending`, `paid`, `failed`)
- Invariantes:
  - Doação anônima: `donorUserId === null`, `donorName` livre
  - Doação registrada: `donorUserId !== null`, `donorName` puxado do donor (ou autoriza usar pseudônimo)
  - Anti-impersonation: validação no boundary — se `donorName` (anônimo) coincide com `username` de algum `Donor` registrado, rejeita ou força sufixo. Implementação via query port pro módulo `donor`
- Integração externa: cobrança PIX no Pagar.me (split configurado pro `Streamer`), webhook confirma pagamento e atualiza status + dispara evento
- Integration events: `DonationConfirmed` (consumido por `media` para atualizar progresso da meta)

### donor (último do MVP)

Perfil opcional do doador registrado. Permite histórico próprio e proteção contra impersonation.

- Aggregate: `Donor`
- Campos: `userId` (FK auth), `username`
- Invariante crítica: **username único globalmente**
- Não tem followed channels, watch history, subscription tiers — só identidade pública pra histórico e anti-impersonation
- Integration events: `DonorRegistered`

## Camada `features/`

Features são **orquestrações de produto** que coordenam dois ou mais módulos. Vivem em `apps/api/src/features/` e têm a mesma estrutura interna (application, infrastructure), mas **não são bounded contexts** — não têm aggregate próprio nem source of truth de domínio.

Exemplo existente: `features/registration` — `RegisterUserUseCase` cria credenciais (auth) + profile na mesma transação e emite tokens.

### Heurísticas: feature vs use case no módulo

| Pergunta | Resposta → onde fica |
|---|---|
| Quantos módulos a operação **escreve**? | Um → use case no módulo. Dois ou mais → feature. |
| Se eu removesse o módulo, o endpoint sobreviveria? | Sim → não pertence ao módulo. Não → pertence. |
| É jornada de produto ou operação técnica sobre uma entidade? | Jornada (registro, checkout, onboarding) → feature. CRUD/atualização de entidade → módulo. |

### Leitura cross-módulo (complemento)

Escrita cruzada → feature. Leitura simples (agregar dados na resposta HTTP sem orquestração rica) → query port público injetado na rota do módulo dono. Ex.: login/me (auth) recebem `ProfileSummaryQuery` injetada e compõem via `ProfileSummaryComposer` — auth não importa profile internamente. Ver [ADR 0002](apps/api/docs/adr/0002-leitura-cross-modulo-via-query-port.md).

Regra dura: **features só importam de `modules/*/public/`**.

## TransactionRunner / DbContext

Duas interfaces, mesma implementação (`DrizzleTransactionService` em `shared/transaction/`):

- **`TransactionRunner`** — recebido por use cases e features. Expõe `run(callback)` que abre transação e commita (ou rollback) ao final.
- **`DbContext`** — recebido por repositórios. Expõe `current()` que retorna o client Drizzle ativo (transação em andamento ou conexão default).

Por trás: `AsyncLocalStorage` guarda a transação ativa durante o callback de `run`. Repositórios chamam `dbContext.current()` sem saber se estão dentro ou fora de uma transação.

Guard-rail de tipo: use case **não** recebe `DbContext` (não pode fazer SQL direto); repositório **não** recebe `TransactionRunner` (não abre transação). Quem orquestra a unidade de trabalho é sempre o use case/feature.

## Eventos pós-commit

Durante uma transação, integration events são **enfileirados** — não publicados imediatamente. `IntegrationBusAfterCommit` acumula eventos com `enqueue()` e só chama `flush()` (publica no bus real) **depois** que `txRunner.run(...)` resolve com sucesso, ou seja, após o commit.

Isso evita dual-write: evento publicado para um registro que ainda pode dar rollback. Se o commit falhar, a fila nunca é flushed. Se um subscriber lançar após o flush, a request falha mas os dados já estão persistidos — trade-off documentado. Ver [ADR 0001](apps/api/docs/adr/0001-dispatch-de-eventos-pos-commit.md).

## Sequência de implementação

Pelo critério "menor coisa que prova a hipótese central":

1. **streamer** — slug e dados de payout são pré-requisito de qualquer página pública
2. **media** — gestão das mídias é o que o streamer faz no painel
3. **donation** — onde o dinheiro entra e a hipótese é validada
4. **donor** — cadastro opcional fica pro fim, doação anônima já sustenta o fluxo end-to-end

(auth e profile já existem como fundação de identidade.)

## Anti-impersonation

Validação acontece no `donation` ao receber dados do doador anônimo:

```
donation.start({ donorName, ... })
  ↓
  → query port: donor.findByUsername(donorName)
  → se existe: rejeita ou força sufixo (ex: "joao#1234")
  → se não existe: aceita
```

Implementação simples no backend, sem UI sofisticada (alinhado com o escopo MVP).

## Onde NÃO mexer

- **Auth não cresce** com name, phone, slug, PIX, username, histórico, mídia, doação. Auth fica só com identidade/credencial.
- **Profile não absorve** slug, PIX, username de doador — são roles com invariantes distintas.
- **Não criar módulo "profile" guarda-chuva** que junte identidade comum + streamer + donor num aggregate só. O `profile` atual é legítimo porque guarda só identidade comum; streamer e donor serão módulos separados.
- **Não replicar User em outros módulos** — referência por `userId` resolve. Quando precisar de dado fresco do user, query port no auth (ou profile, conforme o dado).

## Vocabulário no auth

Roles em [auth/domain/role.ts](apps/api/src/modules/auth/domain/role.ts): `admin`, `streamer`, `donor`. "Donor" foi escolhido em vez de "viewer" porque a plataforma não hospeda stream — o papel é doador, não espectador. Vocabulário alinhado com a ubiquitous language do negócio.

## Pendências fora do MVP

Quando essas features entrarem, decidir o módulo dono:

| Feature | Módulo provável |
|---|---|
| Login social (Twitch, Google, Discord) | auth (provedores OAuth, já tem código) |
| Customização visual (cor, banner, logo) | streamer |
| Catálogo TMDb/Jikan/IGDB | novo módulo `catalog` |
| Wishlist com upvote | novo módulo `wishlist` |
| Calendário/agenda | streamer |
| Notificações por email | novo módulo `notification` (escuta integration events) |
| Browser source para OBS | extensão do `media` ou novo `streaming-overlay` |
| Bot de chat | novo módulo `chat-bot` |
| Leaderboard, badges | novo módulo `gamification` |
| Cartão de crédito | extensão do `donation` |
| Carteira interna | novo módulo `wallet` |
