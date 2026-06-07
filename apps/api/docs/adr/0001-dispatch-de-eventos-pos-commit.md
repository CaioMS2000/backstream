# ADR 0001: Dispatch de integration events após o commit

- **Status:** Aceita
- **Data:** 2026-06-07
- **Contexto de origem:** `RegisterUserUseCase` (features/registration)

## Contexto

Use cases de orquestração (ex.: `RegisterUserUseCase`) executam várias escritas
dentro de uma única transação via `TransactionRunner.run(...)` e, ao final,
precisam publicar integration events (ex.: `UserRegistered`) para que outros
módulos reajam.

A pergunta era: **em que momento publicar o evento?**

Publicar **dentro** do callback do `run(...)` parece natural, mas a transação
ainda está aberta nesse ponto — o `DrizzleTransactionService` só commita quando
o callback retorna com sucesso e `db.transaction(...)` resolve. Isso cria o
problema clássico de *dual-write*: se o commit falhar depois do publish
(deadlock, constraint na finalização, queda de conexão), um evento
`UserRegistered` já foi emitido para um usuário que **rolou back e não existe**.
Consumidores downstream agiriam sobre um registro fantasma.

## Decisão

Os eventos são **enfileirados** numa lista local durante a transação e
**publicados somente depois** que `run(...)` resolve — ou seja, após o commit:

```ts
const eventsAfterCommit: IntegrationEvent[] = []

const result = await this.txRunner.run(async () => {
  // ... escritas; em caso de falha, return failure(...) (evento nunca é enfileirado)
  eventsAfterCommit.push(new UserRegistered(...))
  return success({ ... })
})

// chegou aqui ⇒ TX commitada
for (const event of eventsAfterCommit) {
  await this.eventsAfterCommit.publish(event)
}

return result
```

Pontos da decisão:

- O `push` acontece apenas no caminho de sucesso, então qualquer falha de
  negócio (que faz `return failure(...)`) ou violação de invariante (que faz
  `throw` e dispara rollback) deixa a fila vazia — nada é publicado.
- O `publish` é **aguardado** (`await`). A cadeia
  `IntegrationEventBus.publish → TypedEventChannel.emit` aguarda cada subscriber
  sequencialmente, então o `await` garante que todos os handlers terminem antes
  do use case retornar (não é fire-and-forget).

## Consequências

- ✅ Sem evento fantasma: um evento só é publicado se a transação commitou.
- ✅ Ordering previsível: eventos publicados na ordem em que foram enfileirados,
  cada subscriber concluído antes do próximo.
- ⚠️ **Handler que lança derruba a response.** Como o dispatch é síncrono e
  pós-commit, se um subscriber lançar, o `execute` lança — mesmo com o usuário
  **já persistido**. O caller recebe erro, mas o efeito principal aconteceu.
- ⚠️ **Latência acoplada aos subscribers.** Um handler lento aumenta o tempo da
  request, já que tudo é aguardado dentro do fluxo.

## Quando revisitar

Se algum subscriber passar a (a) não poder derrubar a resposta da request, ou
(b) ter custo/latência relevante, migrar deste dispatch síncrono in-process
para um **outbox pattern**: persistir os eventos na mesma transação e despachá-los
de forma assíncrona/garantida por um worker separado.
