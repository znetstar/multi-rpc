import Transport from "../Transport";
import Serializer from "../Serializer";
import Message from "../Message";
import Response from "../Response";
import ClientRequest from "../ClientRequest";
import { Server as HTTPServer, ServerRequest, ServerResponse } from "http";
import { Server as HTTPSServer } from "https";
import * as detectNode from "detect-node"
import { server as WebSocketServer, w3cwebsocket as WebSocket, request as WebSocketRequest, connection as WebSocketConnection, IMessage} from "websocket";

export default class WebSocketTransport extends Transport {
    public connection: WebSocket;
    public connections: Map<any, WebSocketConnection> = new Map<any, WebSocketConnection>();
    protected server: WebSocketServer;

    protected port?: number;
    protected httpServer?: HTTPServer|HTTPSServer;
    protected urlOrPath?: string;
    protected host?: string;

    constructor(serializer: Serializer, httpServer: HTTPServer|HTTPSServer, endpoint: string);
    constructor(serializer: Serializer, httpServer: HTTPServer|HTTPSServer);
    constructor(serializer: Serializer, port: number, host: string, endpoint: string);
    constructor(serializer: Serializer, port: number, host: string);
    constructor(serializer: Serializer, port: number);
    constructor(serializer: Serializer, path: string, endpoint: string);
    constructor(serializer: Serializer, path: string);
    constructor(serializer: Serializer, url: string);
    constructor(protected serializer: Serializer,  portPathServerOrUrl: HTTPServer|HTTPSServer|string|number, hostOrEndpoint?: string, protected endpoint?: String) {
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

    public async send(message: Message): Promise<void> {
        if (!this.connection)
            this.connection = await this.connect();
        
        return await super.send(message);
    }

    public async sendConnection(connection: any, message: Message): Promise<void> {
        return await new Promise<void>((resolve, reject) => {
            connection.send(this.serializer.serialize(message), (err: Error) => {
                if (err) reject(err);
                resolve();
            });
        });
    }

    public authorizeOrigin(origin: string): boolean {
        return true;
    }

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
                let data: Uint8Array|String = (message.type === 'utf8') ? message.utf8Data : new Uint8Array(message.binaryData);
    
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
    
    protected httpHandler(req: ServerRequest, res: ServerResponse) {
        res.writeHead(200);
        res.end();
    }

    public async listen(): Promise<void> {
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