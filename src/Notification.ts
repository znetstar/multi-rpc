import Message from "./Message";

/**
 * Represents a JSON-RPC 2.0 Notification Notification object.
 * @see https://www.jsonrpc.org/specification#notification
 */
export default class Notification extends Message {
    /**
     * Creates a Notification object.
     * @param method - The method (or event name).
     * @param params - The arguments for the event.
     */
    constructor(public method: string, public params?: Array<any>|Object) {
        super();
    }
}