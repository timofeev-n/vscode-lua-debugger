import { TextDecoder, TextEncoder } from 'util';
import { HttpPacket, HttpResponsePacket, HttpParser } from './httpacket';

const BufferBlockAlignment = 256;
const BufferInitialSize = BufferBlockAlignment * 2;

function alignedSize(size: number, align: number) {
	if (size <= align) {
		return align;
	}
	const n = Math.ceil(size/align);
	return n * align;
}

/**
 * 
 */
export class HttpStreamParser {

	private encoder: TextEncoder | null = null;
	private decoder: TextDecoder | null = null;
	private buffer: Uint8Array = new Uint8Array(BufferInitialSize);
	private bufferWritePosition: number = 0;

	constructor() {
		this.buffer.fill(0);
	}

	get size() {
		return this.bufferWritePosition;
	}

	private get capacity() {
		return this.buffer.byteLength;
	}

	private getEncoder() {
		if (!this.encoder) {
			this.encoder = new TextEncoder();
		}
		return this.encoder;
	}

	private getDecoder() {
		if (!this.decoder) {
			this.decoder = new TextDecoder('utf-8');
		}
		return this.decoder;
	}

	public getPackets(data?: string | ArrayBuffer): Iterable<HttpPacket> {
		if (data) {
			this.addData(data);
		}

		return this.parse();
	}

	public addData(data: string | ArrayBuffer): void {
		const bytes = typeof data === 'string' ? this.getEncoder().encode(data) : data as Uint8Array;
		const freeSpace = this.capacity - this.size;

		if (freeSpace < bytes.byteLength) {
			const needSpace = bytes.byteLength - freeSpace;
			const appendSize = alignedSize(needSpace, BufferBlockAlignment);
			const reserveSpace = BufferBlockAlignment;

			const newBuffer = new Uint8Array(this.capacity + appendSize + reserveSpace);

			if (this.size === 0) {
				newBuffer.fill(0, 0, newBuffer.byteLength);
			}
			else {
				newBuffer.set(this.buffer);
				newBuffer.fill(0, this.capacity, newBuffer.byteLength);
			}
			
			this.buffer = newBuffer;
		}

		this.buffer.set(bytes, this.bufferWritePosition);
		this.bufferWritePosition += bytes.byteLength;
	}
	
	public tryGetPacket(): HttpPacket | null {
		const string = this.getDecoder().decode(this.buffer, {stream: true});
		const packetPrefix = HttpParser.parsePrefix(string);

		if (!packetPrefix) {
			return null;
		}

		if (typeof packetPrefix.contentLength === 'undefined') {
			throw new Error('Content-Length headers is missed');
		}

		const requireBufferSize = packetPrefix.parsedLength + packetPrefix.contentLength;
		if (this.size < requireBufferSize) {
			return null;
		}

		const packetBufferEnd = packetPrefix.parsedLength + packetPrefix.contentLength;
		const content = this.buffer.slice(packetPrefix.parsedLength, packetBufferEnd);

		if (packetBufferEnd < this.bufferWritePosition) {
			this.buffer.copyWithin(0, packetBufferEnd, this.bufferWritePosition);
			this.bufferWritePosition = this.bufferWritePosition - packetBufferEnd;
		}
		else {
			this.bufferWritePosition = 0;
		}

		this.buffer.fill(0, this.bufferWritePosition, this.capacity);

		const response = HttpParser.parseResponseLine(packetPrefix.startLine);
		if (response) {
			return new HttpResponsePacket(response.code, response.message, packetPrefix.headers, content);
		}
		
		return new HttpPacket(packetPrefix.startLine, packetPrefix.headers, content);
	}

	private *parse(): Iterable<HttpPacket> {

		while (true) {
			const packet = this.tryGetPacket();
			if (packet === null) {
				return null;
			}

			yield packet;
		}
	}
}
