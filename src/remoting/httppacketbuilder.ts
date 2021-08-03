import {HttpHeaders, Header, HttpPacket, RequestHeaders, ResponseHeaders, HttpResponsePacket, HeaderNames} from './httpacket';

function makePacketHeaders(httpHeaders: HttpHeaders, ... addHeaders: Header[] ): Header[] {

	const packetHeaders: Header[] = [];

	for (const name in httpHeaders) {
		if (httpHeaders.hasOwnProperty(name)) {
			const value = httpHeaders[name];
			packetHeaders.push({name, value});
		}
	}

	return packetHeaders.concat(addHeaders);
}

function makeHeadersAndContent(httpHeaders: HttpHeaders, body?: any): {headers: Header[], content: string | Uint8Array} {

	const contentType = httpHeaders[HeaderNames.ContentType];

	if (!contentType) {
		throw new Error('Content-Type header must be specified !');
	}

	let content: string | Uint8Array ;

	if (body === undefined) {
		content = '';
	}
	else if (contentType === 'application/json') {
		content = JSON.stringify(body);
	}
	else if (contentType === 'xapplication/msgpack') {
		throw new Error('Msg pack not implemented');
	}
	else {
		throw new Error(`Unsupported content type (${contentType})`);
	}

	const headers = makePacketHeaders(httpHeaders);
	return {headers, content};
}

/**
 * 
 */
export class HttpPacketBuilder
{
	/**
	 * 
	 * @param route request path
	 * @param requestHeaders headers collection, 'Content-Type' must be specified.
	 * @param body object
	 */
	public static makeRequest(route: string, requestHeaders: RequestHeaders, body?: any): HttpPacket {
		const {headers, content} = makeHeadersAndContent(requestHeaders, body);
		return new HttpPacket(`POST ${route} HTTP/1.1`, headers, content);
	}

	/**
	 * 
	 * @param code 
	 * @param message 
	 * @param responseHeaders 
	 * @param body 
	 */
	public static makeResponse(code: number, message: string, responseHeaders: ResponseHeaders, body?: any): HttpResponsePacket {
		const {headers, content} = makeHeadersAndContent(responseHeaders, body);
		return new HttpResponsePacket(code, message, headers, content);
	}
}
