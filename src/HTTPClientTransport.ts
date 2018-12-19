import { Transport, Serializer, Message } from "multi-rpc-common";
import fetch from "cross-fetch";

export class HTTPError extends Error {
    constructor(public status: Number, public body?: any) {
        super(`HTTP Error status: ${status}`);
    }
}

export class NoUrlPresent extends Error {
    constructor() {
        super("URL not set");
    }
}

/**
 * A client-side transport that uses HTTP as its protocol.
 */
export default class HTTPClientTransport extends Transport {
    /**
     * Creates a HTTP transport that connects to a server at a specified url.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param url - Url of the server to connect to (e.g. "http://localhost").
     */
    constructor(protected serializer: Serializer,  protected url?: string) {
        super(serializer);
    }

    /**
     * Sends a message to the server, connecting to the server if a connection has not been made.
     * @param message - Message to send.
     * @async
     * @throws {NoUrlPresent} - If url is not present.
     * @throws {HTTPError} - If an HTTP error occurs.
     */
    public async send(message: Message): Promise<void> {
        if (!this.url) throw new NoUrlPresent();

        let resp = await fetch(this.url, {
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