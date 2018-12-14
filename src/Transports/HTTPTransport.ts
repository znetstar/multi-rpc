import Transport from "../Transport";
import Serializer from "../Serializer";
import Message from "../Message";
import Response from "../Response";
import ClientRequest from "../ClientRequest";
import { Server as HTTPServer, ServerResponse, IncomingMessage } from "http";
import { Server as HTTPSServer } from "https";
import fetch from "cross-fetch";
import * as detectNode from "detect-node"

export class HTTPError extends Error {
    constructor(public status: Number, public body?: any) {
        super(`HTTP Error status: ${status}`);
    }
}

/**
 * A transport that uses WebSocket as its protocol.
 * Using this transport as a client will work in the browser.
 */
export default class HTTPTransport extends Transport {
    /**
     * Port number of the server to listen on.
     */
    protected port?: number;

    /**
     * The HTTP(S) Server underlying the WebSocket Server.
     */
    protected server?: HTTPServer|HTTPSServer;

    /**
     * The URL of the HTTP server to connect to or the IPC path to listen on.
     * @see https://nodejs.org/api/net.html#net_identifying_paths_for_ipc_connections
     */
    protected urlOrPath?: string;

    /**
     * The host of the server to listen on.
     */
    protected host?: string;

    protected serverCreated: boolean = false;

    /**
     * Creates a HTT{} transport using an existing HTTP or HTTPS server and will listen on a specified endpoint.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param httpServer - The HTTP or HTTPS server to listen on.
     * @param endpoint - The endpoint (or path) the WebSocket server should listen on (e.g. "/api").
     */
    constructor(serializer: Serializer, httpServer: HTTPServer|HTTPSServer, endpoint: string);
    /**
     * Creates a HTTP transport using an existing HTTP or HTTPS server.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param httpServer - The HTTP or HTTPS server to listen on.
     */
    constructor(serializer: Serializer, httpServer: HTTPServer|HTTPSServer);
    /**
     * Creates a HTTP transport listening on a port, host and endpoint.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param port - Port the server should listen on.
     * @param host - Host the server should listen on.
     * @param endpoint - The endpoint (or path) the WebSocket server should listen on (e.g. "/api").
     */
    constructor(serializer: Serializer, port: number, host: string, endpoint: string);
    /**
     * Creates a HTTP transport listening on a port and host.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param port - Port the server should listen on.
     * @param host - Host the server should listen on.
     */
    constructor(serializer: Serializer, port: number, host: string);
    /**
     * Creates a HTTP transport listening on a port.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param port - Port the server should listen on.
     */
    constructor(serializer: Serializer, port: number);
    /**
     * Creates a HTTP transport listening on a port and an endpoint.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param port - The port to listen on.
     * @param endpint - The endpoint (or path) the WebSocket server should listen on (e.g. "/api").
     */
    constructor(serializer: Serializer, path: string, endpoint: string);
    /**
     * Creates a HTTP transport listening on an IPC Path and an endpoint.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param path - The IPC Path to listen on.
     * @see https://nodejs.org/api/net.html#net_identifying_paths_for_ipc_connections
     */
    constructor(serializer: Serializer, path: string);
    /**
     * Creates a HTTP transport that connects to a server at a specified url.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param url - Url of the server to connect to (e.g. "ws://localhost").
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
    constructor(protected serializer: Serializer,  portPathServerOrUrl: HTTPServer|HTTPSServer|string|number, hostOrEndpoint?: string, protected endpoint?: string) {
        super(serializer);

        if (detectNode && (portPathServerOrUrl instanceof HTTPServer || portPathServerOrUrl instanceof HTTPSServer)) {
            this.server = <HTTPServer|HTTPSServer>portPathServerOrUrl;
            this.setupHTTPServer();
        }
        else if (typeof(portPathServerOrUrl) === 'number')
            this.port = portPathServerOrUrl;
        else if (typeof(portPathServerOrUrl) === 'string') 
            this.urlOrPath = portPathServerOrUrl;

        if (typeof(portPathServerOrUrl) === 'string' &&  typeof(hostOrEndpoint) === 'string')
            this.endpoint = hostOrEndpoint;
        else 
            this.host = hostOrEndpoint;
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

    /**
     * Sets up the HTTP(s) Server (sets up the routes).
     * @ignore
     */
    protected setupHTTPServer(): void {
        this.server.on("request", (req: IncomingMessage, res: ServerResponse) => {
            const origin = req.headers.origin && req.headers.origin[0];

            if (!this.authorizeOrigin(origin)) {
                res.writeHead(403, "Invalid origin");
                res.end();
                return;
            }
            

            if (typeof(this.endpoint) === 'string' && req.url !== this.endpoint) {
                res.writeHead(404, `${req.url} does not exist`);
                return;
            }

            const data: Array<Buffer> = [];

            req.on("data", (chunk) => {
                data.push(chunk);
            });

            req.on("end", () => {
                const rawReq = new Uint8Array(Buffer.concat(data));
                const clientRequest = new ClientRequest(Transport.uniqueId(), (response?: Response) => {
                    const headers: any = {};

                    if (origin) {
                        headers["Access-Control-Allow-Origin"] = origin;
                    }

                    if (response) {
                        headers["Content-Type"] = this.serializer.content_type;
                        
                        res.writeHead(200, headers);
                        res.end(this.serializer.serialize(response));
                    } else {
                        res.writeHead(204, headers);
                        res.end();
                    }
                });

                this.receive(rawReq, clientRequest);
            });
        });
    }
    
    /**
     * Begins listening for connections using the HTTP(S) Server.
     * If a server was passed in the constructor, this function does nothing.
     * @async
     */
    public async listen(): Promise<void> {
        if (this.server)
            return;

        
        this.server = new HTTPServer();
        this.serverCreated = true;
        this.setupHTTPServer();

        return new Promise<void>((resolve, reject) => {
            const listenError = (error: Error) => {
                reject(error);
            };

            this.server.once('error', listenError);

            const listenSuccess = () => {
                this.server.off('error', listenError);
                resolve();
            };

            if (typeof(this.port) === 'number') 
                this.server.listen(this.port, this.host, listenSuccess);
            else
                this.server.listen(this.urlOrPath, listenSuccess);
        });
    }

    /**
     * Closes the HTTP server.
     * @async
     */
    public async close(code?: number, reason?: string): Promise<void> {
        if (this.server && this.serverCreated) {
            this.server.close();
        } 
    }
}