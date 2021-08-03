import { TextDecoder, TextEncoder } from 'util';
import { ContentLengthMissingError, BodyReadError } from './httpparsererrors';

export const END_OF_LINE = '\r\n';
export const END_OF_HEADERS = '\r\n\r\n';
export const HEADER_KEY_VALUE_DELIMETER = ':';


export enum ResponseCode {
	OK = 200,
	ApplicationError = 400,
	InternalError = 500
}

export interface Header
{
	name: string;
	value: string;
}

export class HeaderNames {
	public static readonly ContentType = 'Content-Type';
	public static readonly ContentLength = 'Content-Length';
	public static readonly InstanceId = 'Instance-Id';
	public static readonly InvokeId = 'Invoke-Id';
	public static readonly InvokeContract = 'Invoke-Contract';
}

export interface ParsePacketPrefixResult {
	startLine: string;
	headers: Header[];
	parsedLength: number;
	contentLength?: number;
}

/**
 * 
 */
export class HttpParser {

	public static parseRequestLine(line: string): {method: string, path: string} | null {
		
		const regex = /^([\w]+)\s+(.+)\s+HTTP\/(\d+\.\d+)$/; // parse string like 'POST /path1/path2 HTTP/1.1

		const matches = line.match(regex);

		if (matches === null) {
			return null;
		}

		return {
			method: matches[1] as string,
			// tslint:disable-next-line: no-magic-numbers
			path: matches[2] as string
		};
	}

	public static parseResponseLine(line: string): {code: number, message: string} | null {
		
		const regex = /HTTP\/[0-9\.]+\s([0-9]{3})\s(.*)$/; // parse string like 'HTTP/1.1 200 OK'

		const matches = line.match(regex);

		// tslint:disable-next-line: no-magic-numbers
		if (matches === null || matches.length < 3) {
			return null;
		}

		// tslint:disable-next-line: no-magic-numbers
		const responseCode = Number.parseInt(matches[1], 10);

		return {
			code: responseCode,
			// tslint:disable-next-line: no-magic-numbers
			message: matches[2]
		};
	}
	
	public static parseHeaders(rawHeaders: string): Header[]{

		const top: string[] = rawHeaders.split(END_OF_LINE);
		const headers: Header[] = [];

		for (const headerStr of top) {
			const headerLines = headerStr.split(HEADER_KEY_VALUE_DELIMETER);

			headers.push({
				name: headerLines[0].trim(),
				value: headerLines[1].trim(),
			});
		}
		
		return headers;
	}
	
	public static parsePrefix(str: string): ParsePacketPrefixResult | undefined  {
		const startLineEnd: number = str.indexOf(END_OF_LINE);
		if (startLineEnd <= 0) {
			return undefined;
		}

		const headersEnd: number = str.indexOf(END_OF_HEADERS);
		if (headersEnd < 0) {
			return undefined;
		}
		
		const startLine = str.substring(0, startLineEnd);
		const headers: Header[] = this.parseHeaders(str.substring(startLineEnd + END_OF_LINE.length, headersEnd));
		const contentLengthHeader = headers.find((h) => h.name === HeaderNames.ContentLength);
		const contentLength = contentLengthHeader ? Number.parseInt(contentLengthHeader.value, 10) : undefined;

		return {
			startLine,
			headers,
			parsedLength: headersEnd + END_OF_HEADERS.length,
			contentLength
		};
	}
/*
	public static parseString(msg: string): HttpPacket | null {

		const headersEnd: number = msg.indexOf(endOfHeaders);
		const startLineEnd: number = msg.indexOf(endOfLine);
		const startLine = msg.substring(0, startLineEnd);
		const headers: Header[] = this.parseHeaders(msg.substring(startLineEnd + endOfLine.length, headersEnd));
		
		const contentLengthHeader = headers.find((h) => h.name === HeaderNames.ContentLength);

		if (!contentLengthHeader) {
			throw new ContentLengthMissingError('Content-Length header was not found');
		}

		// tslint:disable-next-line: no-magic-numbers
		const contentLength = Number.parseInt(contentLengthHeader.value, 10);
		
		const actualBodyLength = msg.length - (headersEnd + endOfHeaders.length);
		
		if (contentLength !== actualBodyLength) {
			throw new BodyReadError('Unexpected body length');
		}

		const body = msg.substring(headersEnd + endOfHeaders.length, msg.length);

		const response = HttpParser.parseResponseLine(startLine);

		if (response !== null) {

			const { code, message } = response;

			return new HttpResponsePacket(
				code,
				message,
				headers,
				body,
			);
		}

		return new HttpPacket(startLine, headers, body);
	}*/
}

/**
 * 
 */
export class HttpPacket {

	readonly startLine: string;
	readonly headers: Header[];
	readonly content: Uint8Array;
	private encodedBody_: any | undefined = undefined;

	public get isResponse(){
		return HttpParser.parseResponseLine(this.startLine) !== null;
	}

	public get contentType() {
		return this.requiredHeaderValue(HeaderNames.ContentType);
	}

	public get contentLength(): number {
		const contentLengthStr = this.requiredHeaderValue(HeaderNames.ContentLength);
		return parseInt(contentLengthStr, 10);
	}

	public get body(): unknown {

		const contentAsString = () => {
			const decoder = new TextDecoder('utf-8');
			return decoder.decode(this.content);
		};

		if (typeof this.encodedBody_ === 'undefined') {
			const contentType = this.contentType;

			if (contentType === 'application/json') {
				this.encodedBody_ = JSON.parse(contentAsString());
			}
			else if (contentType === 'xapplication/msgpack') {
				throw new Error('implement msgpack content decoder !');
			}
			else if (contentType === 'text/plain'){
				this.encodedBody_ = contentAsString();
			}
			else {
				throw new Error(`Unsupported content type:(${contentType})`);
			}
		}

		return this.encodedBody_;
	}

	constructor(startLine: string, headers: Header[], content: Uint8Array|string) {
		this.startLine = startLine;
		this.headers = headers;

		if (typeof content === 'string') {
			this.content = content.length === 0 ? new Uint8Array(0) : new TextEncoder().encode(content);
		}
		else {
			this.content = content;
		}
	}

	public setHeader(name: string, value: any) {

		const header = this.headers.find((hdr) => hdr.name === name);
		if (!!header) {
			if (!!value) {
				header.value = `${value}`;
			}
			else {
				throw new Error(`If you really wanna to delete header [${name}] by clearing its value, implement it !`);
			}
		}
		else if (value) {
			this.headers.push({name, value: `${value}`});
		}
	}

	public headerValue(name: string): string | null {

		const header = this.headers.find((hdr) => hdr.name === name);

		if (!!header) {
			return header.value;
		}

		return null;
	}

	public requiredHeaderValue(name: string): string {

		const value = this.headerValue(name);

		if (value === null) {
			throw new Error(`Packet does not contains header [${name}]`);
		}

		return value;
	}

	public toBuffer(): Uint8Array {

		const encoder = new TextEncoder();
		this.setHeader(HeaderNames.ContentLength, this.content.byteLength);

		const headersString = this.headers.reduce<string>( (str, header) => str.concat(`${header.name}: ${header.value}${END_OF_LINE}`), '');

		const prefixString =
			this.startLine + END_OF_LINE +
			headersString + END_OF_LINE;

		const headerBytes = encoder.encode(prefixString);

		const bytes = new Uint8Array(headerBytes.byteLength + this.content.byteLength);
		bytes.set(headerBytes, 0);
		bytes.set(this.content, headerBytes.byteLength);

		return bytes;
	}
}

/**
 * 
 */
export class HttpResponsePacket extends HttpPacket
{
	readonly code: number;
	readonly message: string;

	constructor(code: number, message: string, headers: Header[], content: Uint8Array|string) {
		super(`HTTP/1.1 ${code} ${message}`, headers, content);
		this.code = code;
		this.message = message;
	}
}

export interface HttpHeaders
{
	'Content-Type'?: string,
	'Content-Length'?: number,
	'Invoke-Id'?: string

	[field: string]: any;
}


export interface RequestHeaders extends HttpHeaders
{
	'Host'?: string,
	'Invoke-Contract'?: string,
	'Instance-Id'?: string
}


export interface ResponseHeaders extends HttpHeaders
{
}


export function isResponsePacket(packet: HttpPacket): packet is HttpResponsePacket {
	return packet.isResponse;
}
