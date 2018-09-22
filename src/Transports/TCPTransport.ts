import { Socket, Server } from "net";
import Transport from "../Transport";
import Serializer from "../Serializer";
import Message from "../Message";
import Response from "../Response";
import ClientRequest from "../ClientRequest";
import * as detectNode from "detect-node";

export default class TCPTransport extends Transport {
    public connection: Socket;
    public connections: Map<any, Socket> = new Map<any, Socket>();
    protected server?: Server;
    protected port?: number;
    protected path?: string;

    constructor(serializer: Serializer, port: number, host: string);
    constructor(serializer: Serializer, port: number);
    constructor(serializer: Serializer, path: string);
    constructor(serializer: Serializer, server: Server);
    constructor(serializer: Serializer,  portPathOrServer: string|number|Server, protected host?: string) {
        super(serializer);
        if (detectNode && portPathOrServer instanceof Server)
            this.server = portPathOrServer;
        
        if (typeof(portPathOrServer) === "string") 
            this.path = portPathOrServer;

        if (typeof(portPathOrServer) === "number") 
            this.port = portPathOrServer;
    }

    public async connect(): Promise<Socket> {
        this.connection = new Socket();
   
        this.connection.on('error', (error) => {
            this.emit('error', error);
        });

        this.connection.on('close', () => {
            this.emit('close');
        });

        this.connection.on('data', (data) => {;
            this.receive(new Uint8Array(data));
        });
        
        let p = new Promise<void>((resolve, reject) => {
            this.connection.once('error', reject);
            this.connection.once('connect', () => {
                resolve();
            });
        });

        if (typeof(this.path) === 'string')
            this.connection.connect(this.path);
        else
            this.connection.connect(this.port, this.host);

        await p;

        return this.connection;
    } 

    public async send(message: Message): Promise<void> {
        if (!this.connection)
            this.connection = await this.connect();
        
        return await super.send(message);
    }

    public async sendConnection(connection: Socket, message: Message): Promise<void> {
        return await new Promise<void>((resolve, reject) => {
            let data: any = this.serializer.serialize(message);
            connection.write(Buffer.from(data), (err: Error) => {
                if (err) reject(err);
                resolve();
            });
        });
    }

    public async listen(): Promise<void> {
        this.server = new Server();
        
        this.server.on('connection', (connection: Socket) => {
            const clientId = this.addConnection(connection);

            connection.on('data', (data) => {
                const respond = (response: Response) => {
                    connection.write(this.serializer.serialize(response));
                };

                const request = new ClientRequest(clientId, respond);

                this.receive(new Uint8Array(data), request);
            });
            
            connection.once('close', () => {
                this.connections.delete(clientId);
            });
        });

        this.server.on('error', (error) => {
            this.emit('error', error);
        });

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
                this.server.listen(this.path, listenSuccess);
        });
    }
}