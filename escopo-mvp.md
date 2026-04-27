# Escopo do MVP

Este documento define o que entra e o que fica fora da primeira versão da plataforma. O critério de corte é: **a menor coisa que prova a hipótese central do negócio**.

## Hipótese central

Streamers do nicho de react pago vão pagar comissão para usar uma ferramenta que centraliza gestão de doações por mídia, e seus doadores vão doar através dela.

## Critérios de corte

Uma feature entra no MVP se atende a pelo menos um destes:

- É necessária para o fluxo principal funcionar end-to-end.
- Sua ausência impede alguém de usar a plataforma.
- Não pode ser resolvida manualmente por enquanto.
- É fundação (não melhoria).
- Vai gerar dado novo sobre o comportamento dos usuários.

## Dentro do MVP

### Cadastro e onboarding de streamer

- Cadastro com email e senha (sem login social).
- Configuração de nome público, slug da página (`plataforma.com/seunome`) e chave PIX para split.
- Vinculação com conta Pagar.me (modelo a definir conforme documentação do gateway).

### Gestão de mídias pelo streamer

- Adicionar mídia manualmente: nome, categoria, valor da meta em R$, descrição opcional.
- Listar mídias em três estados: aguardando meta, meta atingida (na fila para reagir), já reagida.
- Cancelar mídia com justificativa.
- Marcar mídia como já reagida (move para o histórico).
- Reordenação manual da fila de mídias com meta atingida.

### Página pública do streamer

- Lista de mídias com meta em aberto, barra de progresso e valor já arrecadado.
- Botão "doar" em cada mídia.
- Histórico básico do que já foi reagido.
- Aviso visível quando uma mídia for cancelada.

### Fluxo de doação

- Doador escolhe mídia, valor e nome.
- Suporte a doação anônima com nome livre.
- Suporte a doação com conta registrada.
- Geração de cobrança PIX via Pagar.me com split configurado.
- Exibição de QR Code e código copia-e-cola na tela.
- Confirmação automática via webhook do Pagar.me.
- Doação aparece imediatamente na barra de progresso da mídia.

### Proteção anti-impersonation (versão simples)

- Se o nome digitado por anônimo coincide com o username de algum doador registrado, o sistema rejeita ou força adição de sufixo.
- Sem UI sofisticada, validação no backend.

### Gestão de doadores

- Cadastro opcional de doador com email e senha para ter histórico próprio.
- Doação anônima sem cadastro também funciona.

### Webhook e atualização de progresso

- Receber webhook do Pagar.me, registrar a doação, atualizar saldo da meta.
- Notificar streamer in-app quando uma meta for atingida.

### Painel do streamer (mínimo)

- Lista de mídias do streamer com status de cada uma.
- Histórico de doações recebidas (lista simples).
- Total arrecadado por mídia.

## Fora do MVP

Tudo abaixo fica para versões futuras. Não vai para a v1.

### Autenticação e identidade

- Login social (Twitch, Google, Discord).
- Customização visual da página pública (cor, banner, logo).
- Domínio customizado (todo mundo usa subdomain no MVP).

### Catálogo e descoberta

- Integração com TMDb, Jikan/MyAnimeList, IGDB para puxar capa, sinopse e duração automaticamente.
- Wishlist e sugestões de doador com upvote.
- Sistema de patrocínio granular (por episódio, temporada ou arco).

### Agenda e organização

- Calendário público com agenda da semana.

### Comunicação e notificações

- Notificação por email para doador quando "sua" mídia for ao ar.
- Notificação por email de cancelamento de mídia para quem doou.
- Email transacional em geral (depende de adicionar Resend, SendGrid ou similar).

### Integração com a stream

- Browser source para OBS (no MVP, basta o link da página pública).
- Bot para chat do Twitch, YouTube ou Kick.

### Engajamento e gamificação

- Leaderboard de patrocinadores (mensal, anual, all-time).
- Badges por marcos.
- Notificação opt-in para o doador quando a mídia for ao ar.

### Analytics e métricas

- Dashboard analítico avançado com métricas por categoria, padrões etc.
- Anotações privadas do streamer por mídia.

### Moderação

- Sistema de moderação automática.
- Aprovação manual de mídias antes de virarem patrocináveis.

### Pagamentos

- Cartão de crédito (MVP é PIX-only).
- Modelo de carteira/créditos internos.

### Programa fundador

- Tracking automatizado do cap de 50 fundadores.
- Verificação automática de "ativo" e tolerância de 1 ano.
- Reversão automática para 6% após inatividade.
- No MVP, isso é gerenciado manualmente em planilha. Marca-se `is_founder: true` direto no banco quando necessário.
