import * as net from "net";
import { Socket, Server } from "net";
import Transport from "../Transport";
import Serializer from "../Serializer";
import Message from "../Message";
import Response from "../Response";
import Request from "../Request";
import { InvalidRequest } from "../Errors";
import * as uuid from "uuid";

export default class TCPTransport extends Transport {
    public connection: Socket;
    public connections: Map<any, Socket> = new Map<any, Socket>();
    protected server: Server;

    constructor(serializer: Serializer, port: number, host: string);
    constructor(serializer: Serializer, port: number);
    constructor(serializer: Serializer, path: string);
    constructor(serializer: Serializer,  protected portOrPath: string|number, protected host?: string) {
        super(serializer);
    }

    protected async connect(): Promise<Socket> {
        this.connection = typeof(this.portOrPath) === 'string' ? net.connect(this.portOrPath) : net.connect(this.portOrPath, this.host);
   
        this.connection.on('error', (error) => {
            this.emit('error', error);
        });

        this.connection.on('close', () => {
            this.emit('close');
        });

        this.connection.on('data', (data) => {;
            this.receive(new Uint8Array(data));
        });
        
        return await new Promise<Socket>((resolve, reject) => {
            this.connection.once('error', reject);
            this.connection.once('connect', () => {
                resolve(this.connection);
            });
        });
    } 

    public async send(message: Message): Promise<any> {
        if (!this.connection)
            this.connection = await this.connect();
        
        return await super.send(message);
    }

    public async sendConnection(connection: Socket, message: Message): Promise<any> {
        return await new Promise((resolve, reject) => {
            let data: any = this.serializer.serialize(message);
            connection.write(Buffer.from(data), (err: Error) => {
                if (err) reject(err);
                resolve();
            });
        });
    }

    public async listen(): Promise<any> {
        this.server = new Server((connection: Socket) => {
            const clientId = TCPTransport.uniqueId();
            this.connections.set(clientId, connection);

            connection.on('data', (data) => {
                const respond = (response: Response) => {
                    connection.write(this.serializer.serialize(response));
                };

                const request = new Request(clientId, respond);

                this.receive(new Uint8Array(data), request);
            });
            
            connection.once('close', () => {
                this.connections.delete(clientId);
            });
        });

        this.server.on('error', (error) => {
            this.emit('error', error);
        });

        return new Promise((resolve, reject) => {
            const listenError = (error: Error) => {
                reject(error);
            };

            this.server.once('error', listenError);

            const listenSuccess = () => {
                this.server.off('error', listenError);
                resolve();
            };

            if (typeof(this.portOrPath) === 'number') 
                this.server.listen(this.portOrPath, this.host, listenSuccess);
            else
                this.server.listen(this.portOrPath, listenSuccess);
        });
    }
}