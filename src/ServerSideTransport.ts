import Transport from "./Transport";
import Serializer from "./Serializer";

/**
 * Server-Side Transports listen for connections and data from clients.
 * The Server-Side transport can be used either as a server (listening for connections) or as a client (maintaining a single connection to a server).
 */
export default interface ServerSideTransport {
    /**
     * Creates a Server-Side Transport object.
     * @param serializer - The serializer that will be used to serialize and deserialize requests.
     */
    new(serializer: Serializer): ServerSideTransport;

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