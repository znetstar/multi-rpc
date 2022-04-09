import { Socket, Server } from "net";
import { PersistentTransport, TransportInServerState, Serializer, Message, Response, ClientRequest, ServerSideTransport } from "multi-rpc-common";

/**
 * A transport uses TCP as its protocol.
 * This transport will not work in the browser.
 */
export default class TCPTransport extends PersistentTransport implements ServerSideTransport {
    /**
     * The connection to the server.
     */
    public connection: Socket;
    /**
     * A map of clients and their IDs.
     */
    public connections: Map<any, Socket>;
    /**
     * The net.Server instance.
     */
    protected server?: Server;
    /**
     * The port the client will to connect to or server will listen on.
     */
    protected port?: number;
    /**
     * The IPC Path the client will connect to or server will listen on.
     * @see https://nodejs.org/api/net.html#net_identifying_paths_for_ipc_connections
     */
    protected path?: string;

    /**
     * Amount of time to wait between attempting to reconnect.
     */
    public reconnectDelay: number = 500;
    
    /**
     * Indicates wheather the transport is connected to the server.
     */
    public connected: boolean = false;

    /**
     * Creates a TCP transport that will listen on or connect to a port and host.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param port - The port to listen on or connect to.
     * @param host - The host to listen on or connect to. 
     */
    constructor(serializer: Serializer, port: number, host: string);
    /**
     * Creates a TCP transport that will listen on a port on all interfaces, or connect to a port on localhost.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param port - The port to listen on or connect to.
     */
    constructor(serializer: Serializer, port: number);
    /**
     * Creates a TCP transport that will listen on or connect to an IPC Path.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param path - The IPC Path to listen on or connect to.
     * @see https://nodejs.org/api/net.html#net_identifying_paths_for_ipc_connections
     */
    constructor(serializer: Serializer, path: string);
    /**
     * Creates a TCP transport that will use an existing net.Server.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param server - The net.Server to listen on. 
     */
    constructor(serializer: Serializer, server: Server);
    /**
     * Creates a TCP transport using an existing net.Server, path or port and host.
     * The transport can act as either a server or client.
     * @param serializer - The serializer to use for encoding/decoding messages.
     * @param portPathOrServer - The port, path or net.Server the transport should listen on or connect to.
     * @param host - The host the transport should listen on or connect to. If omitted defaults to all interfaces.
     * 
     * @see https://nodejs.org/api/net.html#net_identifying_paths_for_ipc_connections
     */
    constructor(serializer: Serializer,  portPathOrServer: string|number|Server, protected host?: string, reconnect: boolean = true) {
        super(serializer, reconnect);
        if (portPathOrServer instanceof Server){
            this.server = portPathOrServer;
            this.setupTCPServer();
        }
        
        if (typeof(portPathOrServer) === "string") 
            this.path = portPathOrServer;

        if (typeof(portPathOrServer) === "number") 
            this.port = portPathOrServer;

        this.on("connect", () => {
            this.connected = true;
        });

        this.on("disconnect", () => {
            this.connected = false;
        });
    }

    /*
     * Connects to the server using the provided details.
     * @async
     * @throws {TransportInServerState} - If the transport is already acting as a server.
     * @throws - If the connection attempt fails.
     */
    public async connect(): Promise<Socket> {
        if (this.connections) {
            throw new TransportInServerState();
        }

        this.connection = new Socket();
   
        this.connection.on('error', (error) => {
            this.emit('error', error);
        });

        this.connection.once('close', () => {
            this.emit('disconnect');
        });

        this.connection.on('data', (data) => {;
            this.receive(new Uint8Array(data));
        });
        
        const p = new Promise<Socket>((resolve, reject) => {
            this.once('error', (err) => {
                reject(err);
            });
            
            const onConnect = () => {
                this.connection.removeListener("connect", onConnect);
                this.emit("connect");
                resolve(this.connection);
            };

            this.connection.on('connect', onConnect);
        });

        if (typeof(this.path) === 'string')
            this.connection.connect(this.path);
        else
            this.connection.connect(this.port, this.host);

        return p;
    } 

    /**
     * Sends a message to the server, connecting to the server if a connection has not been made.
     * @param message - Message to send.
     * @async
     */
    public async send(message: Message): Promise<void> {
        if (this.connections) 
            throw new TransportInServerState;
        if (!this.connection)
            this.connection = await this.connect();
        
        return await super.send(message);
    }

    /**
     * Sends a message via the provided connection.
     * @param connection - The connection to use.
     * @param message - Message to send.
     * @async
     * @throws - If sending the message fails.
     */
    public async sendConnection(connection: Socket, message: Message): Promise<void> {
        return await new Promise<void>((resolve, reject) => {
            let data: any = this.serializer.serialize(message);
            connection.write(Buffer.from(data), (err: Error) => {
                if (err) reject(err);
                resolve();
            });
        });
    }

    /**
     * Sets up the net.Server (adds event listeners).
     * @ignore
     */
    protected setupTCPServer() {
        this.connections = new Map<any, Socket>();
        this.server.on('connection', (connection: Socket) => {
            const clientId = this.addConnection(connection);

            connection.on('data', (data) => {
                const respond = (response: Response) => {
                    if (!response) return;
                    
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
    }

    /**
     * Begins listening for connections using the TCP Server.
     * If a server was passed in the constructor, this function does nothing.
     * @async
     */
    public async listen(): Promise<void> {        
        if (this.server) {
            return;
        }
        this.server = new Server();
        this.setupTCPServer();

        return new Promise<void>((resolve, reject) => {
            const listenError = (error: Error) => {
                reject(error);
            };

            this.server.once('error', listenError);

            const listenSuccess = () => {
                this.server.removeListener('error', listenError);
                resolve();
            };

            if (typeof(this.port) === 'number') 
                this.server.listen(this.port, this.host, listenSuccess);
            else
                this.server.listen(this.path, listenSuccess);
        });
        
    }

    /**
     * Closes the TCP connection.
     * @async
     */
    public async close(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.server) {
                this.server.close(() => {
                    resolve();
                });
            } else if (this.connection) {
                this.reconnectOnDisconnect = false;
                this.connection.end();
                resolve();
            }
        });
    }
}