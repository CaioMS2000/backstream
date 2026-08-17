# C4 — Diagrama de Contexto (Backstream)

Visão de mais alto nível: quem usa o Backstream e com quais sistemas externos
ele troca informação. Não entra em módulos internos nem em infraestrutura de
deploy — isso fica para um eventual C4 Container/Deployment, quando a
arquitetura de execução (streamer/media/donation implementados, infra de
produção decidida) estiver mais estável. Para os módulos internos, ver
[`arquitetura-modulos.md`](../../../arquitetura-modulos.md).

```mermaid
C4Context
    title Diagrama de Contexto — Backstream

    Person(streamer, "Streamer", "Cria mídias com metas de doação e gerencia sua página pública")
    Person(donor, "Doador", "Doa para mídias de um streamer, com ou sem cadastro")

    System(backstream, "Backstream", "Centraliza a gestão de doações por mídia: streamer define metas, doadores pagam via PIX, progresso fica público em tempo real")

    System_Ext(pagarme, "Pagar.me", "Gateway de pagamento: gera cobrança PIX, aplica split de comissão da plataforma, confirma pagamento via webhook")
    System_Ext(google, "Google OAuth", "Provedor de login social usado por streamers e doadores")

    Rel(streamer, backstream, "Cadastra mídias, define metas, gerencia página e dados de payout", "HTTPS")
    Rel(donor, backstream, "Visualiza mídias, faz doações, acompanha progresso", "HTTPS")
    Rel(backstream, pagarme, "Gera cobrança PIX com split configurado para a mídia", "HTTPS/API")
    Rel(pagarme, backstream, "Confirma pagamento da doação", "Webhook")
    Rel(backstream, google, "Autentica usuário via OAuth2", "HTTPS")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## Legenda

- **Pessoa** (retângulo arredondado): ator humano — streamer ou doador.
- **Sistema** (retângulo azul escuro): o Backstream, como caixa única — o que
  há dentro dele é assunto do C4 Container, não deste diagrama.
- **Sistema externo** (retângulo cinza): sistema fora do controle do time —
  Pagar.me e Google. Não modelamos o que acontece dentro deles.
- Rótulos das setas indicam o **propósito** da interação e o protocolo, não
  só a direção.

## Fora de escopo deste diagrama (propositalmente)

- Streamer e doador podem interagir sem cadastro prévio (doação anônima) —
  omitido aqui porque não muda o sistema externo com quem o Backstream troca
  dado, só a forma de autenticação no `donor`.
- Observabilidade (Loki) não aparece: é infraestrutura operacional interna,
  não algo que um streamer/doador ou o negócio percebe como "sistema externo"
  na leitura de contexto — cabe melhor num C4 Deployment futuro.
