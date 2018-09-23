import Transport from "./Transport";
import Message from "./Message";

/**
 * Thrown if the server attempts to send a notification to a client that doesn't exist.
 */
export class NonExistantClient extends Error {
    constructor(id: any) {
        super(`Non existant client: ${id}`);
    }
}

/**
 * Thrown when a non-persistent transport is used as a persistent transport. 
 */
export class TransportIsNotPersistant extends Error {
    constructor() {
        super("This transport does not use a persistent connection to the server");
    }
}

/**
 * Thrown if the transport is used like a Client but is already functioning as a Server.
 */
export class TransportInServerState extends Error {
    constructor() {
        super(`Transport is currently in a server capacity.`);
    }
}

/**
 * Thrown if the transport is used like a Server but is already functioning as a Client.
 */
export class TransportInClientState extends Error {
    constructor() {
        super(`Transport is currently in a client capacity.`);
    }
}

/**
 * Represents a transport that maintains a persistant connection to the server.
 */
export default abstract class PersistentTransport extends Transport {
    /**
     * Initiates a connection to the server.
     * @returns - Promise resolves when connected
     * @async
     */
    public abstract connect(): Promise<any>;

    /**
     * When used as a server a map that contains all current connections to the server using this transport.
     * The key is the id assigned to the connection and the value is the connection itself.
     */
    public abstract connections: Map<any, any>;

    /**
     * When used as a client the connection to the server.
     */
    public abstract connection: any;

    /**
     * Adds a connection to the map of connections.
     * @param connection - The connection to the server.
     * @param id - A globally unqiue identifier for the client which will be used across the server (across multiple transports). Defaults to a UUID v4.
     */
    public addConnection(connection: any, id: any = Transport.uniqueId()): void {
        this.connections.set(id, connection);
        return id;
    }

    /**
     * Removes a connection from the map of connections.
     * @param id - ID of the connection.
     */
    public removeConnection(id: any) {
        this.connections.delete(id);
    }

    /**
     * Sends a message to a client by its ID.
     * @param id - ID of the client.
     * @param message - Message to send.
     * @async
     */
    public async sendTo(id: any, message: Message): Promise<void> {
        if (!this.connections) {
            throw new TransportInClientState();
        }

        if (!this.connections.has(id))
            throw new NonExistantClient(id);
        
        await this.sendConnection(this.connections.get(id), message);
    }

    /**
     * Sends a message to a client.
     * @param connection - The connection from the client.
     * @param message - Message to send.
     * @async
     */
    protected abstract sendConnection(connection: any, message: Message): Promise<void>;

    /**
     * When acting as a client sends a message to the server.
     * @param message - Message to send.
     */
    public async send(message: Message): Promise<void> {
        if (!this.connection) {
            throw new TransportInServerState();
        }
        await this.sendConnection(this.connection, message);
    }

}
