import PersistantTransport from "../PersistentTransport";
import Serializer from "../Serializer";
import Message from "../Message";
import Response from "../Response";
import ClientRequest from "../ClientRequest";
import { Server as HTTPServer, ServerRequest, ServerResponse } from "http";
import { Server as HTTPSServer } from "https";
import * as detectNode from "detect-node"
import { server as WebSocketServer, w3cwebsocket as WebSocket, request as WebSocketRequest, connection as WebSocketConnection, IMessage} from "websocket";

/**
 * This a transport that uses WebSocket as its protocol.
 * Using this transport as a client will work in the browser.
 */
export default class WebSocketTransport extends PersistantTransport {
    /**
     * The connection to the server.
     */
    public connection: WebSocket;
    
    /**
     * A map of clients and their IDs.
     */
    public connections: Map<any, WebSocketConnection> = new Map<any, WebSocketConnection>();
    /**
     * The WebSocket server.
     */
    protected server: WebSocketServer;

    /**
     * Port number the server to listen on.
     */
    protected port?: number;

    /**
     * The HTTP Server underlying the WebSocket Server.
     */
    protected httpServer?: HTTPServer|HTTPSServer;

    /**
     * The URL of the WebSocket server to connect to or the IPC path to listen on.
     */
    protected urlOrPath?: string;

    /**
     * The host of the server to listen on.
     */
    protected host?: string;

    /**
     * Creates a WebSocket transport using an existing HTTP or HTTPS server.
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
     * Creates a WebSocket transport listening on an IPC Path and an endpoint.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param path - The IPC Path to listen on.
     * @param endpint - The endpoint (or path) the WebSocket server should listen on (e.g. "/api"). 
     */
    constructor(serializer: Serializer, path: string, endpoint: string);
    /**
     * Creates a WebSocket transport listening on an IPC Path and an endpoint.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param path - The IPC Path to listen on.
     */
    constructor(serializer: Serializer, path: string);
    /**
     * Creates a WebSocket transport that connects to a server at a specified url.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param url - Url of the server to connect to (e.g. "ws://localhost")
     */
    constructor(serializer: Serializer, url: string);
    /**
     * @ignore
     */
    constructor(protected serializer: Serializer,  portPathServerOrUrl: HTTPServer|HTTPSServer|string|number, hostOrEndpoint?: string, protected endpoint?: string) {
        super(serializer);

        if (detectNode && (portPathServerOrUrl instanceof HTTPServer || portPathServerOrUrl instanceof HTTPSServer)) {
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
     * Connects to the WebSocket Server using the given url.
     * @async
     * @throws - If the connection attempt fails.
     */
    public async connect(): Promise<WebSocket> {
        let url = <string>this.urlOrPath;
        if (typeof(this.port) === 'number') {
            const host = this.host || '127.0.0.1';
            url = `ws://${host}:${this.port}`;
        }
        
        this.connection = new WebSocket(url);
   
        const onSuccess = () => {
            this.connection.onerror = (error: Error) => {
                this.emit('error', error);
            };

            this.connection.onclose = () => {
                this.emit('close');
            };
        };

        this.connection.onmessage = (message: any) => {
            let data = typeof(message.data) === "string" ? message.data : new Uint8Array(message.data);
            this.receive(data);
        };
        
        return await new Promise<WebSocket>((resolve, reject) => {
            this.connection.onerror = (error) => {
                reject(error);
            };

            this.connection.onopen = () => {
                onSuccess();
                resolve(this.connection);
            };
        });
    } 

    /**
     * Sends a message to the server, connecting to the server if a connection has not been made.
     * @param message - Message to send.
     * @async
     */
    public async send(message: Message): Promise<void> {
        if (!this.connection)
            this.connection = await this.connect();
        
        return await super.send(message);
    }

    /**
     * Sends a message via the provided connection.
     * @param connection - Connection to use to send the message.
     * @param message - Message to send.
     * @async
     * @throws - If sending the message fails.
     */
    public async sendConnection(connection: any, message: Message): Promise<void> {
        return await new Promise<void>((resolve, reject) => {
            connection.send(this.serializer.serialize(message), (err: Error) => {
                if (err) reject(err);
                resolve();
            });
        });
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
     * By default is sends status 200 and ends the request.
     * @param req - HTTP Request
     * @param res - HTTP Response
     */
    protected httpHandler(req: ServerRequest, res: ServerResponse) {
        res.writeHead(200);
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
}