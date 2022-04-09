/**
 * Server-Side Transports listen for connections and data from clients.
 */
export default interface ServerSideTransport {
    /**
     * Begin listening for incoming connections.
     * 
     * @async 
     */
    listen(): Promise<void>;

    /**
     * Shut down the server.
     * @async
     */
    close(): Promise<void>;
}