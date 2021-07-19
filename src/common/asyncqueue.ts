/**
 * 
 */
export class AsyncQueue<T> {

	private items: T[] = [];
	private dequeuePromise: { resolve: (value: T) => void, reject: (error: any) => void } | null = null;
	private isClosed = false;

	public enqueue(item: T) {
		if (this.isClosed) {
			throw new Error('Object closed');
		}

		if (this.dequeuePromise) {
			const temp = this.dequeuePromise;
			this.dequeuePromise = null;
			temp.resolve(item);
		}
		else {
			this.items.push(item);
		}
	}

	public dequeue() {

		return new Promise<T>((resolve: (value: T) => void, reject) => {
			const item = this.items.shift();

			if (typeof item !== 'undefined') {
				resolve(item);
			}
			else if (this.isClosed) {
				reject(new Error('Object closed'));
			}
			else {
				this.dequeuePromise = {resolve, reject};
			}
		});
	}

	public close() {

		if (this.isClosed) {
			return;
		}

		this.isClosed = true;

		if (this.dequeuePromise) {
			const temp = this.dequeuePromise;
			this.dequeuePromise = null;
			temp.reject(new Error('Object closed'));
		}
	}
}
