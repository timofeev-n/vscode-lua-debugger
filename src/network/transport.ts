
export type NetworkData = string | Uint8Array;

/**
 * 
 */
export interface IoStream {
	read(): Promise<NetworkData | null>;
	write(data: NetworkData): Promise<void>;
	close(): void;
}

/**
 * 
 */
export interface Client extends IoStream {
	connect(host: string, service: string): Promise<void>;
}

/**
 * 
 */
export interface Server {
	listen(service: string, backlog?: number): Promise<void>;
	accept(): Promise<IoStream | null>;
	close(): void;
}

/**
 * 
 */
export interface TransportFactory {
	createClient(): Client;
	createServer(): Server;
}
