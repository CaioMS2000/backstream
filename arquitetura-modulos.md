# Arquitetura de módulos

Notas de design dos bounded contexts do Backstream. Revisitar antes de criar novos módulos. Ancorado no [escopo do MVP](escopo-mvp.md).

## Princípio geral

Monolito modular com módulos isolados por bounded context. Cada módulo tem seu próprio domínio, application, infrastructure, e expõe um contrato público em `contracts/` para outros módulos consumirem (eventos, ports de query). Comunicação entre módulos via:

- **Referência por ID** no dia-a-dia (userId, streamerId, mediaId chegando via request autenticada)
- **Domain events internos** (handler dentro do mesmo módulo) — dispatcher próprio do módulo
- **Integration events públicos** (cross-módulo) — bus compartilhado, contratos em `contracts/events/`
- **Query ports read-only** quando um módulo precisa de dado de outro

## Módulos

### auth (existente)

Identidade e credencial. Source of truth de email, senha, role, revogação.

- Aggregate: `User` (email, name, phone, roles, revokedAt)
- Não cuida de: slug, dados PIX, histórico de doações, mídias, qualquer dado público de criador
- Integration events: `UserRegistered`, `UserRevoked` (futuro)

### streamer (próximo)

Perfil público de quem cria conteúdo. Source of truth do slug e dos dados de payout.

- Aggregate: `Streamer`
- Campos: `userId` (FK lógica pro auth), `displayName`, `slug`, `pixKey`, `pagarmeAccountId`
- Invariante crítica: **slug único globalmente** — vai na URL pública (`plataforma.com/seunome`)
- Criação: handler de `UserRegistered` cria `Streamer` quando role é `streamer`, ou via use case explícito de "completar cadastro de streamer" se preferir flow em duas etapas
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

## Sequência de implementação

Pelo critério "menor coisa que prova a hipótese central":

1. **streamer** — slug e dados de payout são pré-requisito de qualquer página pública
2. **media** — gestão das mídias é o que o streamer faz no painel
3. **donation** — onde o dinheiro entra e a hipótese é validada
4. **donor** — cadastro opcional fica pro fim, doação anônima já sustenta o fluxo end-to-end

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

- **Auth não cresce** com slug, PIX, username, histórico, mídia, doação. Auth fica só com identidade/credencial.
- **Não criar módulo "profile" guarda-chuva** — Streamer e Donor têm invariantes muito diferentes pra ficarem juntos
- **Não replicar User em outros módulos** — referência por `userId` resolve. Quando precisar de dado fresco do user, query port no auth.

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
