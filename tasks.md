# Tasks MVP

Checklist operacional derivado do [escopo-mvp.md](escopo-mvp.md). Apenas os requisitos de "Dentro do MVP".

## Cadastro e onboarding de streamer

- [ X ] Cadastro de streamer com email e senha
- [ ] Configuração do nome público do streamer
- [ ] Configuração do slug da página pública (`plataforma.com/seunome`)
- [ ] Configuração da chave PIX do streamer para split
- [ ] Vinculação da conta do streamer com Pagar.me

## Gestão de mídias pelo streamer

- [ ] Adicionar mídia manualmente (nome, categoria, valor da meta em R$, descrição opcional)
- [ ] Listar mídias no estado "aguardando meta"
- [ ] Listar mídias no estado "meta atingida (na fila para reagir)"
- [ ] Listar mídias no estado "já reagida"
- [ ] Cancelar mídia com justificativa
- [ ] Marcar mídia como já reagida (move para o histórico)
- [ ] Reordenação manual da fila de mídias com meta atingida

## Página pública do streamer

- [ ] Listar mídias com meta em aberto exibindo barra de progresso
- [ ] Exibir valor já arrecadado em cada mídia
- [ ] Botão "doar" em cada mídia
- [ ] Histórico básico do que já foi reagido
- [ ] Aviso visível quando uma mídia for cancelada

## Fluxo de doação

- [ ] Doador escolhe mídia, valor e nome
- [ ] Suporte a doação anônima com nome livre
- [ ] Suporte a doação com conta registrada
- [ ] Geração de cobrança PIX via Pagar.me com split configurado
- [ ] Exibição de QR Code na tela de pagamento
- [ ] Exibição de código copia-e-cola na tela de pagamento
- [ ] Confirmação automática via webhook do Pagar.me
- [ ] Doação aparece imediatamente na barra de progresso da mídia

## Proteção anti-impersonation (versão simples)

- [ ] Validação backend: rejeitar nome anônimo que coincide com username de doador registrado (ou forçar sufixo)

## Gestão de doadores

- [ ] Cadastro opcional de doador com email e senha (para ter histórico próprio)
- [ ] Doação anônima sem cadastro continua funcionando

## Webhook e atualização de progresso

- [ ] Receber webhook do Pagar.me
- [ ] Registrar a doação no banco a partir do webhook
- [ ] Atualizar saldo da meta a partir do webhook
- [ ] Notificar streamer in-app quando uma meta for atingida

## Painel do streamer (mínimo)

- [ ] Lista de mídias do streamer com status de cada uma
- [ ] Histórico de doações recebidas (lista simples)
- [ ] Total arrecadado por mídia
