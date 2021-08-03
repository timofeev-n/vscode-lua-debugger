import { IoStream } from '../network';
import { HttpPacket } from './httpacket';
import { HttpStreamParser } from './httpstreamparser';

export *  from './httpacket';
export * from './httpparsererrors';
export { HttpPacketBuilder } from './httppacketbuilder';
export { HttpStreamParser as StreamParser } from './httpstreamparser';


export async function readHttpStream(parser: HttpStreamParser, stream: IoStream): Promise<HttpPacket | null> {

	let packet: HttpPacket | null = null;

	do {

		packet = parser.tryGetPacket();
		if (packet) {
			break;
		}

		const data = await stream.read();
		if (data === null) {
			break;
		}

		parser.addData(data);
	}

	while (true)


	return packet;


}