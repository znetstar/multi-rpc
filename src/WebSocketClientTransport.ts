import { Serializer, Message, PersistentTransport, TransportInServerState } from "multi-rpc-common";
import { w3cwebsocket as WebSocket } from "websocket";

export class NoUrlPresent extends Error {
    constructor() {
        super("URL not set");
    }
}

/**
 * A client-side transport that uses HTTP as its protocol.
 */
export default class WebSocketClientTransport extends PersistentTransport {
    /**
     * The connection to the server.
     */
    public connection: WebSocket;
    
    /**
     * A map of clients and their IDs.
     */
    public connections: Map<any, any>;

    /**
     * Amount of time to wait between reconnects.
     */
    public reconnectDelay: number = 500;

    /**
     * Messages that will be sent to the server when a connection has been established.
     */
    private messageQueue: Message[] = [];

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
     */
    constructor(protected serializer: Serializer,  protected url?: string) {
        super(serializer);

        this.on("disconnect", this.reconnect);
        this.on("connect", this.dispatchQueue);
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
            this.connection.onclose = void(0);
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
            } else if (typeof(Buffer) !== 'undefined' && (data instanceof Buffer)) {
                this.receive(new Uint8Array(data));
            } else {
                this.receive(data);
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
     * Sends all messages in the message queue.
     */
    public async dispatchQueue(): Promise<void> {
        while (this.messageQueue.length) {
            await super.send(this.messageQueue.shift());
        }
    }

    /**
     * Sends a message to the server if a connection has been established or adds it to the queue if no connection has been established.
     * @param message - Message to send.
     */
    public async send(message: Message): Promise<void> {
        if (!this.connected)
            this.messageQueue.push(message);
        else
            super.send(message);
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
     * Prevents reconnecting after a disconnect.
     */
    public disableReconnect() {
        this.off("disconnect", this.reconnect);
    }

    /**
     * Closes the websocket connection
     * @async
     */
    public async close(): Promise<void> {
        this.disableReconnect();
        this.connection.close();
    }
}