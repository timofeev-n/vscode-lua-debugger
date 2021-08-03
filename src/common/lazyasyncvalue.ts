enum ValueState {
	NotAwailable,
	Awailable,
	Making
}

/**
 * 
 */
export class LazyAsyncValue<T> {

	private valueState = ValueState.NotAwailable;
	private value_: any = null;
	private isError = false;
	private readonly valueFactory: () => Promise<T>;
	private valueAwaiters: Array<{resolve: (value: T)=>void, reject: (err: Error)=> void}> = [];
	private valueTask: Promise<void> | null = null;

	constructor(factory: () => Promise<T>) {
		this.valueFactory = factory;
	}

	public get ready() {
		return this.valueState === ValueState.Awailable;
	}

	public get value(): T {
		if (!this.ready) {
			throw new Error('Value not ready');
		}

		if (this.isError) {
			const error = this.value_ as Error;
			throw error;
		}

		return this.value_ as T;
	}

	private setValueOrError(value: any, isError: boolean) {

		if (this.valueState !== ValueState.Making) {
			return;
		}

		this.value_ = value;
		this.isError = isError;
		this.valueState = ValueState.Awailable;

		const awaiters = this.valueAwaiters;
		this.valueAwaiters = [];

		if (!this.isError) {
			for (const awaiter of awaiters){
				awaiter.resolve(value);
			}
		}
		else {
			const error: Error = (value instanceof Error) ? value: new Error(`Unspecified error:(${value})`);

			for (const awaiter of awaiters){
				awaiter.reject(error);
			}
		}
	}

	public waitValue(): Promise<T> {

		if (this.ready) {
			return Promise.resolve(this.value);
		}

		const promise = new Promise<T>((resolve, reject) => this.valueAwaiters.push({resolve, reject}));

		if (this.valueState === ValueState.NotAwailable) {

			this.valueTask = (async() => {
				
				this.valueState = ValueState.Making;

				try {
					const value = await this.valueFactory();

					this.setValueOrError(value, false);
				}
				catch (error) {
					this.setValueOrError(error, true);
				}
			})();
		}

		return promise;
	}

	public reset(error?: Error) {
		if (this.valueAwaiters.length > 0) {
			this.setValueOrError((!!error ? error : new Error('Value reseted')), true);
		}

		this.isError = false;
		this.value_ = undefined;
		this.valueState = ValueState.NotAwailable;
	}
}
