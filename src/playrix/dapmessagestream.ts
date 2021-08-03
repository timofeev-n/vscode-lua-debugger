import { DebugProtocol } from 'vscode-debugprotocol';
import { DebugConfiguration } from 'vscode';
import { Disposable, AsyncQueue } from '../common';
import { IoStream } from '../network';
import { HttpPacketBuilder, HttpPacket, HttpParser, StreamParser, isResponsePacket } from '../remoting';


export interface Target {
	id: string;
	label: string;
}

export interface ScriptDebugConfiguration extends DebugConfiguration {
	location: Target;
}


export interface LaunchConfuguration extends ScriptDebugConfiguration {
	scriptNames?: string[];
}


export function isLaunchConfiguration(config: ScriptDebugConfiguration): config is LaunchConfuguration {
	return config.request === 'launch';
}


export interface DapMessageStream extends Disposable {
	getMessage(): Promise<DebugProtocol.ProtocolMessage>;
	sendMessage(message: DebugProtocol.ProtocolMessage): void;
}

class DapMessageStreamImpl implements DapMessageStream {
	private _commandsStream: IoStream;
	private readonly _commandsQueue = new AsyncQueue<DebugProtocol.ProtocolMessage>();

	constructor(commandsStream: IoStream, streamParser?: StreamParser) {

		this._commandsStream = commandsStream;
		
		this
			.startReader(streamParser)
			.then(() => {

			})
			.catch((error: unknown) => {

			});
	}


	getMessage(): Promise<DebugProtocol.ProtocolMessage> {
		return this._commandsQueue.dequeue();
	}
	
	sendMessage(message: DebugProtocol.ProtocolMessage): void {
		const packet = HttpPacketBuilder.makeRequest('/dap', {
			'Content-Type': 'application/json'
		},
		message);

		this._commandsStream
			.write(packet.toBuffer())
			.catch((error: unknown) => {
				console.debug('Fail to send backend packet');
			});
	}

	dispose(): void {
		this._commandsStream.close();
	}

	private async startReader(httpStreamParser?: StreamParser): Promise<void> {

		const parser = httpStreamParser ?? new StreamParser();

		do {

			const data = await this._commandsStream.read();
			if (!data) {
				break;
			}

			for (const packet of parser.getPackets(data)) {

				if (isResponsePacket(packet)) {
					continue;
				}

				const requestInfo = HttpParser.parseRequestLine(packet.startLine);
				const message = packet.body as DebugProtocol.ProtocolMessage;

				// console.debug('BACKEND:');
				// console.debug(JSON.stringify(message, undefined, 2));
				// console.debug('----------------------------------------')

				this._commandsQueue.enqueue(message);
			}
		}
		while (true);
	}
}

export function createDapMessageStream(stream: IoStream, streamParser?: StreamParser): DapMessageStream {
	return new DapMessageStreamImpl(stream, streamParser);
}


// export interface DebuggerSession extends Disposable {
// 	getDebuggerMessage(): Promise<string>;
// 	sendDebuggerMessage(message: string): Promise<void>;
// }





// export interface DebuggerHost extends Disposable {
// 	createDebuggerSession(location: string): Promise<DebuggerSession>;
// 	getLaunchLocations(): Promise<Target[]>;
// }

