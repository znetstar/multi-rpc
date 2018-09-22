import * as WebSocket from "ws";
import Transport from "../Transport";
import Serializer from "../Serializer";
import Message from "../Message";
import Response from "../Response";
import Request from "../Request";
import { Server as HTTPServer, ServerRequest, ServerResponse } from "http";
import { Socket } from "net";
import { Server as HTTPSServer } from "https";
import { InvalidRequest } from "../Errors";
import * as uuid from "uuid";
import * as URL from "url";

export default class WebSocketTransport extends Transport {
    public connection: WebSocket;
    public connections: Map<any, WebSocket> = new Map<any, WebSocket>();
    protected server: WebSocket.Server = new WebSocket.Server({ noServer: true });

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

        if (portPathServerOrUrl instanceof HTTPServer || portPathServerOrUrl instanceof HTTPSServer) {
            this.httpServer = portPathServerOrUrl;
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

    protected async connect(): Promise<WebSocket> {
        let url = <string>this.urlOrPath;
        if (typeof(this.port) === 'number') {
            const host = this.host || '127.0.0.1';
            url = `ws://${host}:${this.port}`;
        }
        this.connection = new WebSocket(url);
   
        this.connection.on('error', (error) => {
            this.emit('error', error);
        });

        this.connection.on('close', () => {
            this.emit('close');
        });

        this.connection.on('message', (rawData: any) => {
            let data = rawData;
            if (typeof(rawData) === 'string')
                data = Buffer.from(rawData, 'utf8');

            this.receive(new Uint8Array(data));
        });
        
        return await new Promise<WebSocket>((resolve, reject) => {
            this.connection.once('error', reject);
            this.connection.once('open', () => {
                resolve(this.connection);
            });
        });
    } 

    public async send(message: Message): Promise<any> {
        if (!this.connection)
            this.connection = await this.connect();
        
        return await super.send(message);
    }

    public async sendConnection(connection: WebSocket, message: Message): Promise<any> {
        return await new Promise((resolve, reject) => {
            connection.send(this.serializer.serialize(message), (err: Error) => {
                if (err) reject(err);
                resolve();
            });
        });
    }

    protected setupHTTPServer(): void {
        this.server.on("connection", (socket: WebSocket) => {
            const clientId = WebSocketTransport.uniqueId();
            this.connections.set(clientId, socket);

            socket.on("message", (rawData: any) => {
                let data = rawData;
                if (typeof(rawData) === 'string')
                    data = Buffer.from(rawData, "utf8");
    
                const req = new Request(clientId, (res: Response) => {
                    socket.send(this.serializer.serialize(res), (err: Error) => {
                        this.emit("error", err);
                    });
                });

                this.receive(new Uint8Array(data), req);
            });

            socket.on("close", () => {
                this.connections.delete(clientId);
            });
        });

        this.httpServer.on('upgrade', (request: ServerRequest, socket: Socket, head: Buffer) => {
            const { pathname } = URL.parse(request.url);
            if (typeof(this.endpoint) === 'string' && ( pathname !== this.endpoint )) 
                return socket.destroy();
            
            this.server.handleUpgrade(request, socket, head, (socket: WebSocket) => {
                this.server.emit("connection", socket);
            });
        });
    }
    
    protected httpHandler(req: ServerRequest, res: ServerResponse) {
        res.writeHead(200);
        res.end();
    }

    public async listen(): Promise<any> {
        this.httpServer = new HTTPServer(this.httpHandler);
        this.setupHTTPServer();

        return new Promise((resolve, reject) => {
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