# Pergunta: fronteiras entre camadas

## Contexto
Definicao de convencoes de organizacao para monolito modular em fase inicial.

## Duvida
Como diferenciar coisas que ficam na camada publica de cada modulo e o que fica no `apps/api/src/shared` e o que fica no `packages/core`?

## Resposta
Uma forma robusta de decidir e pensar em "escopo de responsabilidade" e "quem pode importar".

### 1) Camada publica do modulo (`modules/x/contracts`)
E a superficie oficial de integracao de um modulo para os demais.

- O que vai aqui:
  - Integration events (ex.: `UserRegistered`).
  - Tipos/DTOs/ports que outros modulos precisam consumir.
- O que nao vai aqui:
  - Regras internas de dominio.
  - Implementacao de use case/repositorio/infra.
- Regra: outro modulo pode importar `auth/contracts`, mas nao deve importar `auth/domain`, `auth/application` ou `auth/infrastructure`.

### 2) `apps/api/src/shared`
E o compartilhado da aplicacao atual (desta API), sem dono de dominio especifico.

- O que vai aqui:
  - Infra comum da API: `clock`, `id-generator`, wrappers de crypto/jwt, config/env, utilitarios transversais.
  - Adaptadores que varios modulos usam dentro desta aplicacao.
- O que evitar aqui:
  - Contrato publico de modulo (isso e `contracts`).
  - Primitive base totalmente generica que poderia estar em qualquer projeto (isso tende a ser `core`).
- Regra: se serve varios modulos, mas ainda e claramente "coisa desta API", tende a ficar em `shared`.

### 3) `packages/core`
E o nucleo tecnico e sem contexto de negocio/aplicacao.

- O que vai aqui:
  - Primitivos e fundacoes reutilizaveis: `Result`, `UniqueId`, `AggregateRoot`, interfaces/base de eventos.
  - Tipos e utilitarios agnosticos de modulo e de framework.
- O que nao vai aqui:
  - Conceitos de negocio (`User`, `Auth`, `Profile`, etc.).
  - Dependencias de infraestrutura da API.
- Regra: se voce consegue mover para outro projeto sem renomear nada de dominio, tem cara de `core`.

### Heuristica rapida de decisao
- "Pertence ao negocio de um modulo?" -> fica no proprio modulo.
- "Outro modulo precisa consumir isso como contrato?" -> `modules/x/contracts`.
- "E compartilhado por varios modulos, mas especifico desta API?" -> `apps/api/src/shared`.
- "E uma fundacao neutra e amplamente reutilizavel?" -> `packages/core`.

### Regra de ouro para evitar acoplamento
Entre modulos, trafega-se por contrato (`contracts`) e eventos de integracao.
Import direto de internals de outro modulo deve ser tratado como violacao arquitetural.
