/**
 * A reconnecting transport reconnects to the server automatically upon disconnect.
 */
export default interface ReconnectingTransport {
    /**
     * Begin listening for incoming connections.
     * 
     * @async 
     */
    reconnect(): Promise<void>;
}