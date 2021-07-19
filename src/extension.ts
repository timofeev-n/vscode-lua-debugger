'use strict';
import * as Net from 'net';
import * as http from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ScriptDebuggerSession } from './adapter/scriptdebugger-session';
import * as DebuggerHost from './playrix/debuggerhost';
import { PlayrixConfig } from './common/playrixconfig';

let thisExtension__: vscode.Extension<any> | undefined ;

function thisExtension(): vscode.Extension<any> {
	if (!thisExtension__) {
		throw new Error('This extension is not initialized');
	}

	return thisExtension__;
}


async function chooseLaunchLocation(locations: DebuggerHost.Target[]): Promise<DebuggerHost.Target | undefined>
{
	if (locations.length === 0) {
		throw new Error('No places where script can be started');
	}

	if (locations.length === 1) {
		return locations[0];
	}

	const labels = locations.map((i) => i.label);

	const selectedLabel = await vscode.window.showQuickPick(labels);

	if (selectedLabel)	{
		return locations.find((item) => item.label === selectedLabel);
	}

	return undefined;
}

function attachToSession(context: vscode.ExtensionContext, config: any): Promise<void>{
		// TO DO: provide real attach locations
		const items = []; // (await getTestLaunchLocations()).pop()!.response;
		
		return Promise.resolve();
}

class PlayrixDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

	provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined, token?: vscode.CancellationToken)  {

		const editor = vscode.window.activeTextEditor;

		if (!editor || editor.document.languageId !== 'lua') {
			return undefined;
		}

		const name = path.basename(editor.document.fileName);
		const pathRelativeWorkspaceRoot = path.relative(getWorkspaceRootPath(), editor.document.fileName);

		const config: vscode.ProviderResult<vscode.DebugConfiguration[]> = [{
				name: `Playrix: start ${name}`,
				type: 'playrix-lua',
				request: 'launch',
				scriptNames: [pathRelativeWorkspaceRoot]
		}];

		return config;
	}

	async resolveDebugConfiguration?(folder: vscode.WorkspaceFolder | undefined, configuration: DebuggerHost.ScriptDebugConfiguration, token?: vscode.CancellationToken) {

		let error: string | undefined;
		let location: DebuggerHost.Target|undefined;
		let debuggerHost: DebuggerHost.DebuggerHost | null = null;

		if (!configuration.type) {
			configuration.type = 'efs';
		}

		if (!configuration.request) {
			configuration.request = 'launch';
		}

		if (DebuggerHost.isLaunchConfiguration(configuration)) {

			if (!configuration.scriptNames ) {
				configuration.scriptNames = [];
			}

			if (configuration.scriptNames.length === 0) {
				const editor = vscode.window.activeTextEditor;
				if (editor && editor.document.languageId === 'javascript') {
					configuration.scriptNames.push('${file}');
				}
			}

			if (configuration.scriptNames.length === 0) {
				vscode.window.showErrorMessage('No scripts to run');
				return undefined;
			}

			for (let i = 0; i < configuration.scriptNames.length; ++i) {
				const scriptName = configuration.scriptNames[i];

				if (path.isAbsolute(scriptName) || scriptName.indexOf('$') >= 0) {
					continue;
				}

				const fullPath = path.normalize(path.join(getWorkspaceRootPath(), scriptName));

				configuration.scriptNames[i] = fullPath;
			}
		}

		try {

			// debuggerHost = ServiceProvider.instance.create([DebuggerHost.DebuggerHostContractId]) as DebuggerHost.DebuggerHost;

			const locations = [
				{label: 'default1', id: 'fake_id' }
			];

			location = await chooseLaunchLocation(locations);

			// if (!!location) {
			// 	configuration.location = location;
			// }
			// else {
			// 	error = 'Launch location is not defined';
			// }
		}
		catch (exception) {
			error = ( exception as Error).message;
		}
		finally {
			// if (!!debuggerHost) {
			// 	await debuggerHost.dispose();
			// }
		}

		if (error) {
			vscode.window.showErrorMessage(`Debug session was not started: ${error}`);
			return undefined;
		}

		if (location) {
			vscode.window.showInformationMessage(`Debug target: [${location.label}]`);
		}

		configuration.debuggee = 'playrix-lua';
		configuration.stopOnEntry = true;

		return configuration;
	}
}

export function activate(context: vscode.ExtensionContext) {
	thisExtension__ = context.extension;

	console.log('Playrix lua debugger extension has been activated');

	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand('extension.playrix-luadebugger.testCommand', () => {
		})
	);


	const config = context.extension.packageJSON.playrix as Partial<PlayrixConfig>;
	// ServicesRemoting.instance.configure(remotingConfig);

	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('playrix-lua', new PlayrixDebugConfigurationProvider()));

	let factory: vscode.DebugAdapterDescriptorFactory & Partial<vscode.Disposable>;
	
	if (config?.adapterSeparateProcess ?? true) {
		factory = new ExecutableAdapterDescriptorFactory();
	}
	else {
		factory = new ServerAdapterDescriptorFactory();
	}

	context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('playrix-lua', factory));

	if (factory && 'dispose' in factory) {
		context.subscriptions.push(factory as {dispose: () => void});
	}

}

export function deactivate() {
}

/**
 * 
 */
class ServerAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory, vscode.Disposable {

	private server?: Net.Server;
	private session?: ScriptDebuggerSession;

	createDebugAdapterDescriptor(session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): vscode.DebugAdapterServer {
		if (!this.session) {
			this.session = new ScriptDebuggerSession();
		}

		if (!this.server) {
			this.server = Net.createServer((socket) => {
				this.session!.setRunAsServer(true);
				this.session!.start((socket as NodeJS.ReadableStream), socket);
			}).listen(0);
		}

		this.session.startupNewSession();

		return new vscode.DebugAdapterServer((this.server.address() as Net.AddressInfo).port);
	}

	dispose() {
		if (this.server) {
			this.server.close();
			delete this.server;
		}

		if (this.session) {
			delete this.session;
		}
	}
}

class ExecutableAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
	createDebugAdapterDescriptor(session: vscode.DebugSession, executable: vscode.DebugAdapterExecutable | undefined): vscode.DebugAdapterExecutable {
		
		if (!executable) {
			throw new Error('Executable info does not provided');
		}

		const config = thisExtension().packageJSON.playrix as Partial<PlayrixConfig>;

		executable.args.push(
			`--playrix_remoting_transport=${config?.remoting?.transport ?? 'ipc'}`,
			`--playrix_remoting_host=${config?.remoting?.host} ? '.'`,
			`--playrix_remoting_service=${config?.remoting?.service} ? 'default'`
		);

		return executable!;
	}
}
