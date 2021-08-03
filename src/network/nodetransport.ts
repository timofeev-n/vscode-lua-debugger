import * as net from 'net';
import * as stream from 'stream';
import { TextDecoder, TextEncoder } from 'util';
import { IoStream, NetworkData, Client, Server, TransportFactory } from './transport'
import { AsyncQueue} from '../common';


enum TransportMode {
	Tcp,
	Pipe
}

function parseHostAddress(address: string): {mode: TransportMode, host: string} {
	const parsers: {re: RegExp, mode: TransportMode}[] = [
		{re: /^tcp:\/\/(.*)$/, mode: TransportMode.Tcp},
		{re: /^ipc:\/\/(.*)$/, mode: TransportMode.Pipe}
	]
	
	for (const parser of parsers) {
		const match = parser.re.exec(address);
		if (match && match.length > 0) {
			return {
				mode: parser.mode,
				host: match[1]
			}
		}
	}

	throw new Error(`Invalid transport address: (${address})`);
}

/**
 * 
 */
class NodeIoStream implements IoStream {

	private stream?: stream.Duplex;

	private readonly readQueue = new AsyncQueue<NetworkData>();

	constructor(stream?: stream.Duplex) {

		if (stream) {
			this.setStream(stream);
		}
	}

	setStream(stream: stream.Duplex): void {
		if (this.stream) {
			throw new Error('Can not re-assign stream');
		}

		this.stream = stream;

		const decoder = new TextDecoder('utf-8');

		this.stream.on('data', (chunk: NetworkData) => {
			
			const string = decoder.decode(chunk as Uint8Array, {stream: true});
			console.debug('------------------------------')
			console.debug('RAW READ:')
			console.debug(string);

			this.readQueue.enqueue(chunk);
		});

	}

	read(): Promise<NetworkData> {
		return this.readQueue.dequeue();
	}
	
	write(data: NetworkData): Promise<void> {

		if (!this.stream) {
			throw new Error('Client not connected');
		}

		const decoder = new TextDecoder('utf-8');
		const string = decoder.decode(data as Uint8Array, {stream: true});
		console.debug('------------------------------')
		console.debug('RAW WRITE:')
		console.debug(string);


		this.stream.write(data, (error) =>
		{
// 			console.log('Written');
		});

		return Promise.resolve(undefined);
	}

	close() {
		if (!!this.stream) {
			this.stream.end();
		}
	}
}


/**
 * 
 */
/*
class NodeServer implements Server {

	private server: net.Server;

	private readonly acceptQueue = new AsyncQueue<IoStream>();

	constructor() {

		this.server = net.createServer((client) => {

			const clientStream = new NodeIoStream(client);

			this.acceptQueue.enqueue(clientStream);
		});
	}

	listen(service: string, backlog?: number): Promise<void> {
		
		return new Promise<void>((resolve, _) => {

			this.server.listen(`\\\\.\\pipe\\${service}`, resolve);
		});
	}
	
	accept(): Promise<IoStream> {
		return this.acceptQueue.dequeue();
	}

	close() {
		this.server.close();
	}
}*/

/**
 * 
 */
class NodeClient extends NodeIoStream implements Client {

	private socket?: net.Socket;

	connect(host: string, service: string): Promise<void> {
	
		try {

			const info = parseHostAddress(host);

			if (info.mode === TransportMode.Pipe) {
				const hostName = !info.host || info.host.length === 0 ? '.' : info.host;
				const address = `\\\\${hostName}\\pipe\\${service}`;
			
				return new Promise((resolve, reject) => {
					this.socket = net.createConnection(address, () => {
						this.setStream(this.socket!);
						resolve();

					});

					// this.socket = net.connect(address, () => {
					// 	this.setStream(this.socket!);
					// 	resolve();
					// });
				});
			}

			return new Promise<void>((resolve, reject) => {
				const tcpPort = Number.parseInt(service, 10);
				if (!tcpPort) {
					reject(new Error(`Invalid tcp port address: (${service})`));
				}
				const tcpHost = info.host.length > 0 ? info.host : undefined;

				this.socket = net.connect(tcpPort, tcpHost, () => {
					this.setStream(this.socket!);
					resolve();
				});

			});

		}
		catch (error: unknown) {
			return Promise.reject(error);
		}
	}
}

/**
 * 
 */
class NodeTransportFactory implements TransportFactory {
	createClient(): Client {
		return new NodeClient();
	}

	createServer(): Server {
		throw new Error('Node server does not implemented');
	}
}

/**
 * 
 */
export function nodeTransportFactory(): TransportFactory {
	return new NodeTransportFactory();
}
