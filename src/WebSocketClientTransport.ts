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
     * Creates a WebSocket transport that connects to a server at a specified url.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param url - Url of the server to connect to (e.g. "ws://localhost").
     */
    constructor(protected serializer: Serializer,  protected url?: string) {
        super(serializer);

        this.on("disconnect", this.reconnect);
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
        try {
            await this.connect();
            if (this.connection.readyState === WebSocket.OPEN) {
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