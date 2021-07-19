import { DebugConfiguration } from 'vscode';

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


export interface AsyncDisposable {
	dispose(): Promise<void>;
}

export interface DebuggerSession extends AsyncDisposable {
	getDebuggerMessage(): Promise<string>;
	sendDebuggerMessage(message: string): Promise<void>;
}

export interface DebuggerHost extends AsyncDisposable {
	createDebuggerSession(location: string): Promise<DebuggerSession>;
	getLaunchLocations(): Promise<Target[]>;
}

