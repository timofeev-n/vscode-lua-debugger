export class ContentLengthMissingError extends Error {
	constructor(m: string) {
		super(m);

		Object.setPrototypeOf(this, ContentLengthMissingError.prototype);
	}
}

export class BodyReadError extends Error {
	constructor(m: string) {
		super(m);

		Object.setPrototypeOf(this, BodyReadError.prototype);
	}
}
