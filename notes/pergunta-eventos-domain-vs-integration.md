# Pergunta: dois eventos no fluxo

## Contexto
Refatoracao inicial da arquitetura de eventos do modulo `auth`, com separacao entre domain events e integration events.

## Duvida
Pelo que parece estamos emitindo "dois eventos", um é a propria entidade como exemplo `user.dispatchDomainEvents` que vai publicar o evento que o metodo `create` registrou, e o `integrationBus.publish` publicando tambem, é isso mesmo? Entendi certo?

Aí entra a duvida maior: cada um deles está emitindo pra quem? No caso eu pergunto de forma teorica, eu sei que nessa fase inicial não tem "outros codigos" que possam ouvir, estou perguntando é quem são os futuros "caras" que deveriam ouvir.

## Resposta
Sim, o entendimento está correto: no cadastro, o fluxo pode emitir dois tipos diferentes de evento.

- `user.dispatchDomainEvents(...)` drena e despacha os eventos de dominio que o aggregate registrou internamente (por exemplo, no `User.create()`).
- `integrationBus.publish(...)` publica um evento de integracao como contrato publico entre modulos (por exemplo, `UserRegistered`).

A diferenca central e quem deve ouvir cada canal no futuro.

### Domain events (internos do modulo)
- Ouvintes: codigo do proprio modulo `auth`.
- Objetivo: efeitos colaterais e regras que pertencem ao mesmo bounded context.
- Exemplos:
  - `UserPasswordChanged` -> invalidar refresh tokens/sessoes no proprio `auth`.
  - `UserRevoked` -> bloquear emissao de novos tokens e encerrar sessoes locais.
- Regra mental: "isso e assunto so do dominio `auth`?" Se sim, tende a ser domain event.

### Integration events (publicos entre modulos)
- Ouvintes: outros modulos do monolito (e, no futuro, possiveis servicos externos).
- Objetivo: comunicar fatos relevantes para fora do contexto `auth`, sem acoplamento interno.
- Exemplos:
  - `profile` ouvindo `UserRegistered` para criar perfil inicial.
  - `billing` ouvindo `UserRegistered` para abrir customer/conta de cobranca.
  - `notifications` ouvindo para iniciar onboarding.
- Regra mental: "outro contexto precisa reagir a esse fato?" Se sim, tende a ser integration event.

Resumo final:
- Domain event = aconteceu algo no meu dominio e handlers internos reagem.
- Integration event = aconteceu algo relevante para fora e publico como contrato.

Por isso, emitir os dois no mesmo caso de uso pode ser totalmente correto: um para consistencia interna do modulo, outro para integracao externa.
