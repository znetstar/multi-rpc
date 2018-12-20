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
     * Creates a WebSocket transport that connects to a server at a specified url.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param url - Url of the server to connect to (e.g. "ws://localhost").
     */
    constructor(protected serializer: Serializer,  protected url?: string) {
        super(serializer);
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
            this.connection.onerror = (error: Error) => {
                reject(error);
            };

            this.connection.onopen = () => {
                onSuccess();
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
     * Closes the websocket connection
     * @async
     */
    public async close(): Promise<void> {
        this.connection.close();
    }
}