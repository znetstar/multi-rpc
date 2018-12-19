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
     * Closes the connection.
     * @async
     */
    close(): Promise<void>;
}