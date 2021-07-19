
export interface RemotingConfig
{
	transport: string; // 'ipc' or 'ws'
	host: string;
	service: string;
}

export interface PlayrixConfig
{
	adapterSeparateProcess: boolean;
	remoting: RemotingConfig;
}


export function makeRemotingConfig(config: RemotingConfig): RemotingConfig {

		return {
			transport: 'ipc',
			host: '',
			service: ''
		};

	// const transportFactory: TransportFactory = (() => {
	// 	if (config.transport === 'ws') {
	// 		return wsTransportFactory();
	// 	}
	// 	else if (config.transport === 'ipc') {
	// 		return ipcTransportFactory();
	// 	}
	// 	throw new Error(`Unknown transport protocol type:(${config.transport})`);
	// })();

	// const host = config.host;
	// const service = config.service;

	// return {
	// 	connectionFactory: async () => {
	// 		const client = transportFactory.createClient();
	// 		await client.connect(host, service);
	// 		return client;
	// 	}
	// }
}