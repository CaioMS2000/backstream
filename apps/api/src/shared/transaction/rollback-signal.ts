/**
 * Sinaliza rollback de transação preservando um payload de falha.
 *
 * `DrizzleTransactionService.run` só dispara rollback quando a callback
 * lança — retornar `failure(...)` resulta em commit. Use este sentinel
 * pra carregar o `Result<Failure>` pra fora do `run` enquanto força o
 * rollback. O orchestrator captura, faz `instanceof`, e devolve o
 * `outcome` como retorno da execução.
 */
export class RollbackSignal<T = unknown> extends Error {
	constructor(readonly outcome: T) {
		super('Transaction rolled back')
	}
}
