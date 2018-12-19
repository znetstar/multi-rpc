import { Transport, Serializer, Message } from "multi-rpc-common";
import fetch from "cross-fetch";

export class HTTPError extends Error {
    constructor(public status: Number, public body?: any) {
        super(`HTTP Error status: ${status}`);
    }
}

/**
 * A client-side transport that uses HTTP as its protocol.
 */
export default class HTTPClientTransport extends Transport {
    /**
     * Port number of the server to listen on.
     */
    protected port?: number;

    /**
     * The URL of the HTTP server to connect to or the IPC path to listen on.
     * @see https://nodejs.org/api/net.html#net_identifying_paths_for_ipc_connections
     */
    protected urlOrPath?: string;

    /**
     * Creates a HTTP transport that connects to a server at a specified url.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param url - Url of the server to connect to (e.g. "http://localhost").
     */
    constructor(serializer: Serializer, url: string);
    /**
     * Creates a HTTP transport as a server using an existing HTTP(S) server, path or port and host, or as a client using a URL.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param portPathServerOrUrl - The port, path or HTTP(S) server the transport should listen on, or the URL the client should connect to.
     * @param hostOrEndpoint - The host the transport should listen or endpoint the server should listen on. If omitted defaults to all interfaces.
     * @param endpoint - The endpoint the server should listen on.
     * 
     * @see https://nodejs.org/api/net.html#net_identifying_paths_for_ipc_connections
     */
    constructor(protected serializer: Serializer,  portPathOrUrl: string|number, hostOrEndpoint?: string, protected endpoint?: string) {
        super(serializer);

        if (typeof(portPathOrUrl) === 'number')
            this.port = portPathOrUrl;
        else if (typeof(portPathOrUrl) === 'string') 
            this.urlOrPath = portPathOrUrl;

        if (typeof(portPathOrUrl) === 'string' &&  typeof(hostOrEndpoint) === 'string')
            this.endpoint = hostOrEndpoint;
    }

    /**
     * Sends a message to the server, connecting to the server if a connection has not been made.
     * @param message - Message to send.
     * @async
     */
    public async send(message: Message): Promise<void> {
        let resp = await fetch(this.urlOrPath, {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                'Content-Type': "application/json"
            },
            body: this.serializer.serialize(message)
        });
    
        let data: Uint8Array;
        if (resp.body)
            data = new Uint8Array(await resp.arrayBuffer());

        if ((Math.trunc(resp.status) / 100 ) !== 2) {
            throw new HTTPError(resp.status, data);
        }

        this.receive(data);
    }

    /**
     * This method will be used validate the "origin" header in each incoming WebSocket request.
     * This function can be replaced to implement a custom validation.
     * By default will return true, allowing all origins.
     * @param origin - The "origin" header for each request.
     */
    public authorizeOrigin(origin: string): boolean {
        return true;
    }
}