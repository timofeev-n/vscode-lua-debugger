
export interface Disposable {
	dispose(): void;
}

export interface AsyncDisposable extends Disposable {
	dispose(): Promise<void>;
}