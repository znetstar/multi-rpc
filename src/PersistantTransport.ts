import Transport from "./Transport";
import Message from "./Message";

/**
 * An error that occurs when the server attempts to send a notification to a client that doesn't exist.
 */
export class NonExistantClient extends Error {
    constructor(id: any) {
        super(`Non existant client: ${id}`);
    }
}

/**
 * An error that occurs when a non-persistent transport is used as a persistent transport. 
 */
export class TransportIsNotPersistant extends Error {
    constructor() {
        super("This transport does not use a persistent connection to the server");
    }
}

/**
 * An error that occurs when the transport is used like a Client but is already functioning as a Server.
 */
export class TransportInServerState extends Error {
    constructor() {
        super(`Transport is currently in a server capacity.`);
    }
}

/**
 * An error that occurs when the transport is used like a Server but is already functioning as a Client.
 */
export class TransportInClientState extends Error {
    constructor() {
        super(`Transport is currently in a client capacity.`);
    }
}

/**
 * A transport that maintains a persistant connection to the server.
 */
export default abstract class PersistentTransport extends Transport {
    /**
     * The connection to the server.
     */
    public abstract connection: any;

    /**
     * Adds a connection to the map of connections.
     * @param connection - The connection to the server.
     * @param id - A globally unqiue identifier for the connection which will be used across the server (across multiple transports). Defaults to a UUID v4.
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
     * @throws {TransportInClientState} - If the transport is already acting as a client.
     * @throws {NonExistantClient} - If client referenced does not exist.
     */
    public async sendTo(id: any, message: Message): Promise<void> {
        if (!this.connections || this.connection) {
            throw new TransportInClientState();
        }

        if (!this.connections.has(id))
            throw new NonExistantClient(id);
        
        await this.sendConnection(this.connections.get(id), message);
    }

    /**
     * Sends a message to a client.
     * @param connection - The connection to the client.
     * @param message - Message to send.
     * @async
     */
    protected abstract sendConnection(connection: any, message: Message): Promise<void>;
    
    /**
     * Sends a message to the server.
     * @param message - Message to send.
     * @async
     * @throws {TransportInServerState} - If the transport is already acting as a server.
     */
    public async send(message: Message): Promise<void> {
        if (this.connections) {
            throw new TransportInServerState();
        }

        if (!this.connection) 
            await this.connect();

        await this.sendConnection(this.connection, message);
    }

    /**
     * Initiates a connection to the server.
     * @returns - Promise resolves when connected
     * @async
     */
    public abstract connect(): Promise<any>;
}
