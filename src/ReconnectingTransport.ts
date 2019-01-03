/**
 * A reconnecting transport reconnects to the server automatically upon disconnect.
 */
export default interface ReconnectingTransport {
    /**
     * Attempts to reconnect to the server.
     * 
     * @async 
     */
    reconnect(): Promise<void>;

    /**
     * Event listener that will reconnect to the server upon disconnect;
     * 
     */
    reconnectOnDisconnectHandler(): void;

    /**
     * Indicates wheather the transport will attempt to automatically reconnect.
     */
    reconnectOnDisconnect: boolean;
}