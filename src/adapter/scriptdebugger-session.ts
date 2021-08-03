'use strict';
import * as Net from '../network';


// about frontend events ordering:  https://github.com/Microsoft/vscode/issues/3548
import { DebugConfiguration } from 'vscode';
import * as debugadapter from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';

//import { DebuggerHost,  DebuggerSession, ScriptDebugConfiguration, LaunchConfuguration } from '../playrix/debuggerhost';
import { createDapMessageStream, DapMessageStream, ScriptDebugConfiguration, LaunchConfuguration } from '../playrix/dapmessagestream';
import { AsyncQueue } from '../common/asyncqueue';
import { HttpPacketBuilder, StreamParser, readHttpStream } from '../remoting';
import { HttpStreamParser } from '../remoting/httpstreamparser';


enum RequestCommand {
	initialize = 'initialize',
	launch = 'launch',
	attach = 'attach',
	configuratioDone = 'configurationDone',
	disconnect = 'disconnect'
}

enum DebuggerEvent {
	terminated = 'terminated',
	breakpoint = 'breakpoint'
}

// const EventsThatMustWaitConfigurationDone: string[] = [DebuggerEvent.breakpoint];
/**
 * 
 */
export class ScriptDebuggerSession extends debugadapter.DebugSession {

	private frontEndRequests = new AsyncQueue<DebugProtocol.Request | null>();
	private messageStreamPromise?: Promise<DapMessageStream>;
	private messageStream?: DapMessageStream;
	//private configurationDone = false;

	/**
	 * Most requests to backend require that debugger session already created (because all messages are passed through session instance).
	 * But session actually can be spawned only after 'launch' request received (bacause host need to known launch location, that obtained only from launch request arguments).
	 * So prior launch request received all requests are accumulated within delayedBackendRequests array, and once session is ready their will be immediatelly passed to backend.
	 */
	// private delayedBackendRequests: DebugProtocol.Request[] = [];

	/**
	 * Seems some events can be handled properly only after 'configurationDone' request accepted.
	 * Especially 'breakpoint' event - vscode just ignore it if it passed prior 'configurationDone' received.
	 * But because 'launch' request can be accepted at any time (before 'configurationDone') state of some breakpoints can be changed before 'configurationDone' and 
	 * this events just will not be handled (frontend UI will be in non consistent with backend state).
	 * So if event accepted prior 'configurationDone' request it will be accumulated, and once configuration is done their will be immediatelly passed to frontend.
	 */
	// private delayedFrontendEvents: DebugProtocol.Event[] = [];


	constructor() {

		super();
		this.setDebuggerColumnsStartAt1(false);
		this.setDebuggerLinesStartAt1(false);

		this.startupNewSession();
	}


	startupNewSession() {

		this.cleanup();

		this
			.startReadFrontend()
			.catch((error: Error) =>
			{
				debugadapter.logger.error(`Frontend reader failure:(${error.message})`);
			});

	}

	private cleanup() {
		this.shutdownDebugSession();

		this.frontEndRequests.close();
		this.frontEndRequests = new AsyncQueue<DebugProtocol.Request | null>();
	}


	private initialize(request: DebugProtocol.InitializeRequest) {

		const initializeResponse = new debugadapter.Response(request) as DebugProtocol.InitializeResponse;

		initializeResponse.body =
		{
			supportsConfigurationDoneRequest: true,
			supportsEvaluateForHovers: false,
			supportsConditionalBreakpoints: false,
			supportsFunctionBreakpoints: true,
			supportsLogPoints: false,
			supportsSetVariable: false,
			supportsRestartRequest: false
		};
		
		this.sendResponse(initializeResponse);

		this.sendEvent(new debugadapter.InitializedEvent());
	}


	// private doneConfiguration(request: DebugProtocol.ConfigurationDoneRequest) {

	// 	// const response = new debugadapter.Response(request);
	// 	// this.sendResponse(response);
	// 	// this.configurationDone = true;


	// 	// if (this.delayedFrontendEvents.length > 0) {
	// 	// 	for (const ev of this.delayedFrontendEvents) {
	// 	// 		this.sendEvent(ev);
	// 	// 	}

	// 	// 	this.delayedFrontendEvents = [];
	// 	// }
	// }


	private async launch(request: DebugProtocol.LaunchRequest): Promise<void> {

		const configuration = request.arguments as LaunchConfuguration;

		await this.sendMessageToController(request);

		// const client = Net.nodeTransportFactory().createClient();
		// 		try {
		// 			//await client.connect('ipc://.', 'playrixcontroller');
		// 			await client.connect('tcp://', '8845');

		// 			this.messageStreamPromise = createDapMessageStream(client);

		// 			this
		// 				.startReadBackend()
		// 				.catch((error: Error) => {
		// 					debugadapter.logger.error(`Backend reader failure:(${error.message})`);
		
		// 					this.sendEvent(new debugadapter.OutputEvent(`Bad thing:${error.message}`, 'console'));
		
		// 					this.shutdownDebugSession();
		// 					this.sendEvent(new debugadapter.TerminatedEvent(false));
		// 					this.shutdown();
		// 				});
			
		// 			// this.delayedBackendRequests.push(request);
			
		// 			// const delayedRequests = this.delayedBackendRequests;
		// 			// this.delayedBackendRequests = [];
			
		// 			// for (const req of delayedRequests) {
		// 			await this.sendMessageToController(request);
		// 			// }
		// 		}
		// 		catch (error) {

		// 		}

					// const packet = HttpPacketBuilder.makeRequest(
					// 	'Method1', 
					// 	{
					// 		'Content-Type': 'application/json'
					// 	},
					// 	{
					// 		Arguments: [
					// 			1, 2, 'stringvalue'
					// 		]
					// 	});

					//await client.write(packet.toBuffer());

					//client.close();

					//console.log('done');

					// this.session = new SessionHelper(client);
				//}
				// catch (error: unknown) {
				// 	console.log('Something is wrong');
				// }
	}

	private async attach(request: DebugProtocol.AttachRequest): Promise<void> {
		const configuration = request.arguments as LaunchConfuguration;

		await this.sendMessageToController(request);

		// const client = Net.nodeTransportFactory().createClient();
		// 		try {
		// 			//await client.connect('ipc://.', 'playrixcontroller');
		// 			await client.connect('tcp://', '8845');

		// 			this.messageStreamPromise = createDapMessageStream(client);

		// 			this
		// 				.startReadBackend()
		// 				.catch((error: Error) => {
		// 					debugadapter.logger.error(`Backend reader failure:(${error.message})`);
		
		// 					this.sendEvent(new debugadapter.OutputEvent(`Bad thing:${error.message}`, 'console'));
		
		// 					this.shutdownDebugSession();
		// 					this.sendEvent(new debugadapter.TerminatedEvent(false));
		// 					this.shutdown();
		// 				});
			
		// 			// this.delayedBackendRequests.push(request);
			
		// 			// const delayedRequests = this.delayedBackendRequests;
		// 			// this.delayedBackendRequests = [];
			
		// 			// for (const req of delayedRequests) {
		// 			await this.sendMessageToController(request);
		// 			// }
		// 		}
		// 		catch (error) {

		// 		}

	}

	private async runControllerMessageStream(): Promise<DapMessageStream> {

		const client = Net.nodeTransportFactory().createClient();
		//await client.connect('ipc://.', 'playrixcontroller');
		await client.connect('tcp://', '8845');

		
		const handShakeRequest = HttpPacketBuilder.makeRequest('/debug/create/locationId', {
			'Content-Type': 'application/json'
		});
		await client.write(handShakeRequest.toBuffer());

		const parser = new HttpStreamParser();
		const handShakeResponse = await readHttpStream(parser, client);

		const messageStream = createDapMessageStream(client, parser);


		const task = (async (): Promise<void> => {

			while (true) {

				const message: DebugProtocol.ProtocolMessage = await messageStream.getMessage();
				message.seq = 0; // force seq to zero, because it will be reassigned by underlying send call

				if (message.type === 'response') {
					const response = message as DebugProtocol.Response;

					if (response.command === RequestCommand.disconnect) {
						this.shutdownDebugSession();
					}

					this.sendResponse(response);
				}
				else if (message.type === 'event') {
					const event = message as DebugProtocol.Event;

					// if (!this.configurationDone && EventsThatMustWaitConfigurationDone.indexOf(event.event) >= 0) {
					// 	this.delayedFrontendEvents.push(event);

					// 	continue;
					// }

					if (event.event === DebuggerEvent.terminated) {
						this.shutdownDebugSession();
					}

					this.sendEvent(event);
				}
				else {
					debugadapter.logger.warn(`Unhandled debugger message:${JSON.stringify(message)}`);
				}
			}
		})();

		task
			.catch((error: Error) => {
				debugadapter.logger.error(`Backend reader failure:(${error.message})`);

				this.sendEvent(new debugadapter.OutputEvent(`Bad thing:${error.message}`, 'console'));

				this.shutdownDebugSession();
				this.sendEvent(new debugadapter.TerminatedEvent(false));
				this.shutdown();
			});

			return messageStream;
	}


	private async sendMessageToController(message: DebugProtocol.ProtocolMessage): Promise<void> {

		if (!this.messageStream) {
			if (!this.messageStreamPromise) {
				this.messageStreamPromise = this.runControllerMessageStream();
			}

			this.messageStream = await this.messageStreamPromise;
			delete this.messageStreamPromise;

			if (!this.messageStream) {
				// Kill session
				return;
			}
		}

		await this.messageStream.sendMessage(message);
	}

	protected dispatchRequest(request: DebugProtocol.Request) {
		this.frontEndRequests.enqueue(request);
	}

	private async startReadFrontend(): Promise<void> {

		do {
			const request = await this.frontEndRequests.dequeue();

			if (request === null) {
				break;
			}

			await this.dispatchFrontendRequest(request);
		}
		while (true);
	}


	private async dispatchFrontendRequest(request: DebugProtocol.Request): Promise<void> {

		switch (request.command) {

			case RequestCommand.initialize: {
				this.initialize(request as DebugProtocol.InitializeRequest);
				break;
			}

			case RequestCommand.launch: {
				await this.launch(request as DebugProtocol.LaunchRequest);
				break;
			}

			case RequestCommand.attach: {
				await this.attach(request as DebugProtocol.AttachRequest);
				break;
			}

			case RequestCommand.configuratioDone: {
				// this.doneConfiguration(request as DebugProtocol.ConfigurationDoneRequest);
				await this.sendMessageToController(request);
				break;
			}

			default: {
				//if (this.messageStreamPromise) {
					await this.sendMessageToController(request);
				// }
				// else {
				// 	this.delayedBackendRequests.push(request);
				// }
				//break;
			}
		}
	}

	private shutdownDebugSession() {
		
		delete this.messageStreamPromise;
		if (this.messageStream) {
			this.messageStream.dispose();
			delete this.messageStream;
		}

		this.frontEndRequests.enqueue(null);
	}
}
