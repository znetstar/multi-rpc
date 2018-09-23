import Message from "./Message";

/**
 * Represents a JSON-RPC 2.0 Request object.
 * @see https://www.jsonrpc.org/specification#request_object
 */
export default class Request extends Message {
    /**
     * Creates a JSON-RPC Request.
     * @param id - The identifier for the request, the response will have the same identifier.
     * @param method - Name of method to execute on the server.
     * @param params - Arguments to pass to the method.
     */
    constructor(public id: number|string|null, public method: string, public params?: Array<any>|Object) {
        super();
    }
}