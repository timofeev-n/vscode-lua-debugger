import * as debugadapter from 'vscode-debugadapter';
import { ScriptDebuggerSession } from './scriptdebugger-session';
// import { Playrix, makeRemotingConfig } from '../common/playrixconfig'


// function remotingConfigFromArgs(): RemotingConfig {

// 	const config: PlayrixRemotingConfig = {
// 		transport: 'ws',
// 		host:'',
// 		service: '7789'
// 	};

// 	for (const arg of process.argv) {
// 		const [key, value] = arg.split('=');
// 		if (!key || !value) {
// 			continue;
// 		}

// 		if (key === '--playrix_remoting_transport') {
// 			config.transport = value;
// 		}
// 		else if (key === '--playrix_remoting_host') {
// 			config.host = value;
// 		}
// 		else if (key === '--playrix_remoting_service') {
// 			config.service = value;
// 		}
// 	}

// 	return makeRemotingConfig(config);
// }

// const remotingConfig = remotingConfigFromArgs();
// ServicesRemoting.instance.configure(remotingConfig);

debugadapter.DebugSession.run(ScriptDebuggerSession);
