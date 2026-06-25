export class Slug {
	private readonly _value: string

	private constructor(value: string) {
		this._value = value
	}

	get value(): string {
		return this._value
	}

	static create(value: string) {
		return new Slug(value)
	}

	/**
	 * Receives a string and normalize it as a slug.
	 *
	 * Example: "An example title" => "an-example-title"
	 *
	 * @param text {string}
	 */
	static createFromText(text: string): Slug {
		const slugText = text
			.normalize('NFKD')
			.toLowerCase()
			.trim()
			.replace(/\s+/g, '-')
			.replace(/[^\w-]+/g, '')
			.replace(/_/g, '-')
			.replace(/--+/g, '-')
			.replace(/-$/g, '')

		return new Slug(slugText)
	}

	equals(other: Slug): boolean {
		return this.value === other.value
	}
}
