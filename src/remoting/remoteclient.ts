import { Subscription } from 'rxjs';
import { RequestService } from './requestservice';
import { HttpPacket, HttpResponsePacket, isResponsePacket, ResponseCode } from './httpacket';

/**
 * 
 */
class RequestEntry {

	readonly invokeId: string;
	readonly promise: Promise<HttpResponsePacket>;

	private resolver_: {resolve: (response: HttpResponsePacket) => void, reject: (err: Error) => void} | null;

	get resolver() { return this.resolver_!; }

	constructor(id: string) {

		this.invokeId = id;
		this.resolver_ = null;
		this.promise = new Promise<HttpResponsePacket>((resolve, reject) => {
			this.resolver_ = {resolve, reject};
		});
	}
}

/**
 * 
 */
export class RemoteClient {

	readonly requestService: RequestService;

	private readonly subscription: Subscription;
	private requests: RequestEntry[] = [];
	private closed = false;
	

	constructor(requestService: RequestService) {

		this.requestService = requestService;

		this.subscription = this.requestService.subscribe(
			(packet) => { 
				if (packet === null) {
					this.breakCurrentInvocations();
				}
				else {
					this.handleInboundPacket(packet);
				}
			},

			(error: Error) => {
				this.closed = true;
				this.breakCurrentInvocations();
			},
			
			() => {
				this.closed = true;
				this.breakCurrentInvocations();
			});
	}

	public async send(request: HttpPacket): Promise<HttpResponsePacket> {

		const invokeId = request.requiredHeaderValue('Invoke-Id');
		const entry = new RequestEntry(invokeId);
		this.requests.push(entry);

		await this.requestService.send(request);

		const response: HttpResponsePacket = await entry.promise;
		return response;
	}

	private handleInboundPacket(packet: HttpPacket) {

		if (!isResponsePacket(packet)) {
			return;
		}

		const invokeId = packet.headerValue('Invoke-Id');
		if (invokeId === null) {
			return;
		}

		const requestIndex = this.requests.findIndex(req => req.invokeId === invokeId);
		if (requestIndex < 0) {
			return;
		}

		const awaitedRequest = this.requests.splice(requestIndex, 1)[0];
		awaitedRequest.resolver.resolve(packet);
	}

	private breakCurrentInvocations() {
		const requests = this.requests;
		this.requests = [];
		const error = new Error('Invocation broken');

		for (const req of requests) {
			req.resolver.reject(error);
		}
	}
}
