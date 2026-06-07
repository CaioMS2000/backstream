# WIP — Análise de `RegisterUserUseCase`

Arquivo: `apps/api/src/features/registration/application/use-cases/register-user.use-case.ts`

## Correção: tudo certo agora

O fluxo está correto:

- O `Result` propaga direito (`failure` dentro, `success` dentro, `return result` fora).
- Eventos enfileirados e publicados pós-commit com `await`.
- O panic check dá rollback.

O que sobrou é qualidade e duas decisões de design.

## Nits de qualidade (rápidos)

**1. `UniqueId(userId)` é construído duas vezes** — linhas 44 e 74, a partir do mesmo `userId: string`. Içar uma vez logo após o destructuring:

```ts
const { email, roles, userId } = user
const userIdVo = UniqueId(userId)
```

e reusar nos dois lugares. Pequeno, mas evita reconstruir o mesmo value object.

**2. Destructuring só pra descartar** — linha 58 extrai `_name` e `_phone` só pra jogar fora. Como só `userId2` é usado, simplificar:

```ts
const { userId: userId2 } = createProfileResult.value
```

Some o ruído dos `_` e a intenção (só preciso do id pra checar a invariante) fica explícita.

**3. Tipo de retorno explícito ainda está pendente** — é o "item 3" que tínhamos deixado pra depois. Hoje o retorno é inferido como uma união meio bagunçada de `Result`s (`failure(...)` é `Result<E, never>`, `success(...)` é `Result<never, T>`, e o TS une tudo). Funciona, mas anotar explícito documenta o contrato e limpa a inferência:

```ts
async execute(input: Input): Promise<Result<RegisterUserError, { accessToken: string; refreshToken: string; userId: string }>>
```

(onde `RegisterUserError` é a união dos erros de credentials + profile). Não é urgente, mas é o fechamento daquela conversa.

## Duas decisões de design pra pensar

**A. `issueTokens` está dentro da transação — precisa estar?** Linha 71, dentro do `run`. Transação deve ser o mais curta possível. A pergunta é: o `issueTokens` **toca o banco** (ex.: persiste o refresh token)?

- Se **sim** → tem que ficar dentro mesmo, está certo.
- Se for **só assinatura de JWT** (CPU, sem DB) → está segurando a transação aberta durante trabalho de cripto à toa; daria pra movê-lo pra *depois* do `run()`. Tokens não fazem parte da consistência transacional do registro.

Conferir a implementação do command.

**B. Quem é o dono do evento `UserRegistered`?** Está sendo publicado um evento que mora no **auth** (`@/modules/auth/public/events/user-registered`), mas quem dispara é a **feature de registration**. Conceitualmente:

- "credenciais foram criadas" é um fato do **auth**;
- "um usuário foi registrado por completo (credenciais **+** profile)" é um fato que **só a feature de orquestração conhece** — nenhum módulo sozinho sabe que os dois passos completaram.

Reusar o `UserRegistered` do auth mistura esses dois significados. Pode ser que o evento do auth tenha exatamente essa semântica e esteja ok — mas se ele representa "credenciais criadas", o evento que a feature deveria emitir é um próprio (ex.: `registration` define seu `UserRegistered`/`RegistrationCompleted`). É a mesma régua de ownership que discutimos pro `Role`: o evento pertence a quem detém o conceito. Conferir o que o `UserRegistered` do auth significa hoje.

> Nenhum dos dois é bug — são escolhas. O (A) é fácil de resolver com uma olhada no command; o (B) é mais conceitual e pode virar até um segundo ADR se decidir mexer.
