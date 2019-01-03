import { Serializer, Message, PersistentTransport, TransportInServerState, ReconnectingTransport } from "multi-rpc-common";
import { w3cwebsocket as WebSocket } from "websocket";

export class NoUrlPresent extends Error {
    constructor() {
        super("URL not set");
    }
}

export class CouldNotParseData extends Error {
    constructor(public data: any) {
        super("The object containing data could not be parsed");
    }
}

/**
 * A client-side transport that uses HTTP as its protocol.
 */
export default class WebSocketClientTransport extends PersistentTransport implements ReconnectingTransport {
    /**
     * The connection to the server.
     */
    public connection: WebSocket;
    
    /**
     * A map of clients and their IDs.
     */
    public connections: Map<any, any>;

    /**
     * Is true when the client is connected.
     */
    public get connected(): boolean {
        return this.connection && (this.connection.readyState === WebSocket.OPEN);
    }
    
    
    /**
     * Creates a WebSocket transport that connects to a server at a specified url.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param url - Url of the server to connect to (e.g. "ws://localhost").
     * @param reconnect - Reconnects to the server upon disconnect.
     * @param reconnectDelay - Amount of time to wait between reconnects.
     */
    constructor(protected serializer: Serializer,  protected url?: string, reconnect: boolean = true, public reconnectDelay: number = 1000) {
        super(serializer);

        this.once("disconnect", this.reconnect);
        
        if (reconnect)
            this.on("connect", this.reconnectOnDisconnectHandler);
    }

    public reconnectOnDisconnectHandler() {
        this.once("disconnect", this.reconnect);
    }

    public get reconnectOnDisconnect(): boolean {
        return Boolean((<any>this)._events['connect'].filter((func: Function) => func === this.reconnectOnDisconnectHandler).length);
    }

    public set reconnectOnDisconnect(value: boolean) {
        if (value) {
            this.on("connect", this.reconnectOnDisconnectHandler);
        } else {
            this.off("connect", this.reconnectOnDisconnectHandler);
        }
    }

    /**
     * Connects to the WebSocket Server using the given URL.
     * @async
     * @throws - If the connection attempt fails.
     * @throws {TransportInServerState} - If the transport is already acting as a server.
     */
    public async connect(): Promise<WebSocket> {
        if (this.connections)
            throw new TransportInServerState();

        if (!this.url) 
            throw new NoUrlPresent();

        this.connection = new WebSocket(this.url);
   
        this.connection.onclose = () => {
            this.connection = null;
            this.emit("disconnect");
        };

        this.connection.onmessage = (message: any) => {
            let data: any = message.data;
            if ((typeof(Blob) !== 'undefined') && (data instanceof Blob) && typeof(FileReader) !== 'undefined') {
                const fileReader = new FileReader();
                fileReader.onload = (event) => {
                    this.receive(new Uint8Array((<any>event.target).result));
                };

                fileReader.readAsArrayBuffer(data);
            } else if (data instanceof ArrayBuffer || (typeof(Buffer) !== 'undefined' && data instanceof Buffer)) {
                this.receive(new Uint8Array(data));
            } else {
                this.emit("error", new CouldNotParseData(data));
            }
        };
        
        return await new Promise<WebSocket>((resolve, reject) => {
            this.connection.onerror = (error: Error) => {
                reject(error);
            };
            
            this.connection.onopen = () => {
                this.connection.onerror = (error: Error) => {
                    this.emit('error', error);
                };

                this.emit("connect");
                resolve(this.connection);
            };
        });
    } 

    /**
     * Sends a message to the server if a connection has been established or adds it to the queue if no connection has been established.
     * @param message - Message to send.
     */
    public async send(message: Message): Promise<void> {
        if (!this.connected) {
            await this.connect();
            super.send(message);
        }
        else
            return super.send(message);
    }

    /**
     * Sends a message via the provided connection.
     * @param connection - Connection to use to send the message.
     * @param message - Message to send.
     * @async
     * @throws - If sending the message fails.
     */
    public async sendConnection(connection: WebSocket, message: Message): Promise<void> {
        connection.send(this.serializer.serialize(message));
    }

    /**
     * Attempts to reconnect.
     * @ignore
     */
    public async reconnect(): Promise<void> {
        this.emit("reconnectAttempt");

        this.connection = null;
        
        if (this.connected) {
            return;
        }

        try {
            await this.connect();
            if (this.connected) {
                this.emit("reconnected");
            }
        } catch (error) {
            setTimeout(() => {
                this.reconnect();
            }, this.reconnectDelay);
        }
    }


    /**
     * Closes the websocket connection
     * @async
     */
    public async close(): Promise<void> {
        this.reconnectOnDisconnect = false;
        this.off("disconnect", this.reconnect);
        this.connection.close();
    }
}