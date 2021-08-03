import { Subject } from 'rxjs';
import { IoStream } from '../network/transport';
import { HttpPacket, HttpParser } from './httpacket';
import { HttpStreamParser } from './httpstreamparser';
import { LazyAsyncValue } from '../common';

/**
 * 
 */
export class RequestService extends Subject<HttpPacket | null> {

	private readonly stream: LazyAsyncValue<IoStream>;
	private isRunning = false;

	constructor(streamFactory: () => Promise<IoStream>) {
		super();
		this.stream = new LazyAsyncValue(streamFactory);
	}

	private async run(): Promise<void> {

		this.isRunning = true;
		const streamParser = new HttpStreamParser();

		try {
			const stream = await this.stream.waitValue();

			while (!this.closed) {
				const data = await stream.read();
				if (data === null) {
					this.next(null);
					break;
				}
				
				const packets = streamParser.getPackets(data);
				if (packets) {
					for (const packet of packets) {
						this.next(packet);
					}
				}
			}
		}
		catch (error){
			this.next(null);
		}

		this.isRunning = false;
		this.stream.reset();
	}

	private checkIsRunning() {
		if (this.isRunning){
			return;
		}

		this
			.run()
			.catch(error => {
				console.log(`Run error (${error})`);
			});
	}

	public async send(packet: HttpPacket): Promise<void> {
		this.checkIsRunning();
		const stream = this.stream.ready ? this.stream.value : (await this.stream.waitValue());
		return stream.write(packet.toBuffer());
	}
}
