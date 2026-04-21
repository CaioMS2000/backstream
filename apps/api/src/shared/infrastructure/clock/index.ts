type DateProvider = () => Date
const defaultDateProvider: DateProvider = () => new Date()
let impl: DateProvider | null = null

export function initializeClock(fn: DateProvider = defaultDateProvider): void {
	if (impl !== null) {
		throw new Error('Clock já inicializado. Chame apenas uma vez no bootstrap.')
	}
	impl = fn
}

export function now(): Date {
	if (impl === null) {
		throw new Error(
			'Clock não inicializado. Chame initializeClock no bootstrap.'
		)
	}
	return impl()
}

export function __resetClockForTests(): void {
	impl = null
}
