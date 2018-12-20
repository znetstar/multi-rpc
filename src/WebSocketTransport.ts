import { Serializer, ServerSideTransport, Response, ClientRequest } from "multi-rpc-common";
import { request as WebSocketRequest, connection as WebSocketConnection, IMessage, server as WebSocketServer } from "websocket";
import { WebSocketClientTransport, } from "multi-rpc-websocket-client-side-transport";
import { Server as HTTPServer, IncomingMessage, ServerResponse as HTTPResponse } from "http";
import { Server as HTTPSServer } from "https";

/**
 * A client-side transport that uses WebSocket as its protocol.
 */
export default class WebSocketTransport extends WebSocketClientTransport implements ServerSideTransport {
    /**
     * A map of clients and their IDs.
     */
    public connections: Map<any, WebSocketConnection>;
    
    /**
     * The WebSocket server.
     */
    protected server: WebSocketServer;

    /**
     * Port number of the server to listen on.
     */
    protected port?: number;

    /**
     * The HTTP(S) Server underlying the WebSocket Server.
     */
    protected httpServer?: HTTPServer|HTTPSServer;

    /**
     * The URL of the WebSocket server to connect to or the IPC path to listen on.
     * @see https://nodejs.org/api/net.html#net_identifying_paths_for_ipc_connections
     */
    protected urlOrPath?: string;

    /**
     * The host of the server to listen on.
     */
    protected host?: string;

    protected httpServerCreated: boolean = false;

    /**
     * Creates a WebSocket transport using an existing HTTP or HTTPS server and will listen on a specified endpoint.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param httpServer - The HTTP or HTTPS server to listen on.
     * @param endpoint - The endpoint (or path) the WebSocket server should listen on (e.g. "/api").
     */
    constructor(serializer: Serializer, httpServer: HTTPServer|HTTPSServer, endpoint: string);
    /**
     * Creates a WebSocket transport using an existing HTTP or HTTPS server.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param httpServer - The HTTP or HTTPS server to listen on.
     */
    constructor(serializer: Serializer, httpServer: HTTPServer|HTTPSServer);
    /**
     * Creates a WebSocket transport listening on a port, host and endpoint.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param port - Port the server should listen on.
     * @param host - Host the server should listen on.
     * @param endpoint - The endpoint (or path) the WebSocket server should listen on (e.g. "/api").
     */
    constructor(serializer: Serializer, port: number, host: string, endpoint: string);
    /**
     * Creates a WebSocket transport listening on a port and host.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param port - Port the server should listen on.
     * @param host - Host the server should listen on.
     */
    constructor(serializer: Serializer, port: number, host: string);
    /**
     * Creates a WebSocket transport listening on a port.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param port - Port the server should listen on.
     */
    constructor(serializer: Serializer, port: number);
    /**
     * Creates a WebSocket transport listening on a port and an endpoint.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param port - The port to listen on.
     * @param endpint - The endpoint (or path) the WebSocket server should listen on (e.g. "/api").
     */
    constructor(serializer: Serializer, path: string, endpoint: string);
    /**
     * Creates a WebSocket transport listening on an IPC Path and an endpoint.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param path - The IPC Path to listen on.
     * @see https://nodejs.org/api/net.html#net_identifying_paths_for_ipc_connections
     */
    constructor(serializer: Serializer, path: string);
    /**
     * Creates a WebSocket transport that connects to a server at a specified url.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param url - Url of the server to connect to (e.g. "ws://localhost").
     */
    constructor(serializer: Serializer, url: string);
    /**
     * Creates a WebSocket transport as a server using an existing HTTP(S) server, path or port and host, or as a client using a URL.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param portPathServerOrUrl - The port, path or HTTP(S) server the transport should listen on, or the URL the client should connect to.
     * @param hostOrEndpoint - The host the transport should listen or endpoint the server should listen on. If omitted defaults to all interfaces.
     * @param endpoint - The endpoint the server should listen on.
     * 
     * @see https://nodejs.org/api/net.html#net_identifying_paths_for_ipc_connections
     */
    constructor(protected serializer: Serializer,  portPathServerOrUrl: HTTPServer|HTTPSServer|string|number, hostOrEndpoint?: string, protected endpoint?: string) {
        super(serializer);

        if (portPathServerOrUrl instanceof HTTPServer || portPathServerOrUrl instanceof HTTPSServer) {
            this.httpServer = <HTTPServer|HTTPSServer>portPathServerOrUrl;
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
        this.connections = new Map<any, WebSocketConnection>();
        this.server = new WebSocketServer({ httpServer: this.httpServer, autoAcceptConnections: false });
        this.server.on("request", (request: WebSocketRequest) => {
            if (!this.authorizeOrigin(request.origin)) {
                request.reject(403, "Invalid origin");
                return;
            }

            if (typeof(this.endpoint) === 'string' && request.resource !== this.endpoint) {
                request.reject(404, `${request.resource} does not exist`);
                return;
            }

            const connection = request.accept();

            const clientId = this.addConnection(connection);

            connection.on("message", (message: IMessage) => {
                let data: Uint8Array|string = (message.type === 'utf8') ? message.utf8Data : new Uint8Array(message.binaryData);
    
                const req = new ClientRequest(clientId, (res: Response) => {
                    let data = this.serializer.serialize(res);
                    data = (typeof(data) === 'string') ? data : Buffer.from(data);
                    let sendFunc: Function = ((typeof(data) === 'string') ? connection.sendUTF : connection.sendBytes);
                    sendFunc.call(connection, data, (err: Error) => {
                        if (err) 
                            this.emit("error", err);
                    });
                });
                this.receive(data, req);
            });

            connection.on("close", () => {
                this.connections.delete(clientId);
            });
        });
    }
    
    /**
     * If a HTTP(s) server wasn't provided this will be the default handler for requests. 
     * By default is sends status 400 and ends the request.
     * @param req - HTTP Request
     * @param res - HTTP Response
     */
    protected httpHandler(req: IncomingMessage, res: HTTPResponse) {
        res.writeHead(404);
        res.end();
    }

    /**
     * Begins listening for connections using the HTTP(S) Server.
     * If a server was passed in the constructor, this function does nothing.
     * @async
     */
    public async listen(): Promise<void> {
        if (this.httpServer)
            return;

        
        this.httpServer = new HTTPServer(this.httpHandler);
        this.httpServerCreated = true;
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
                this.httpServer.listen(this.port, this.host, listenSuccess);
            else
                this.httpServer.listen(this.urlOrPath, listenSuccess);
        });
    }

    /**
     * Closes the WebSocket connection.
     * @async
     */
    public async close(code?: number, reason?: string): Promise<void> {
        if (this.server) {
            this.server.closeAllConnections();
            if (this.httpServer && this.httpServerCreated)
                this.httpServer.close();
        } else if (this.connection) {
            this.connection.close(code, reason);
        }
    }
}