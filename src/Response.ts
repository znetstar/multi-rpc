import Message from "./Message";
import { RPCError } from "./Errors";

/**
 * Represents a JSON-RPC 2.0 Response object.
 * @see https://www.jsonrpc.org/specification#response_object
 */
export default class Response extends Message {
    /**
     * The error from executing the request.
     */
    public error?: RPCError;

    /**
     * The result from executing the request.
     */
    public result?: any;

    /**
     * Creates a JSON-RPC Response.
     * @param id - The ID of request that corresponds to the response.
     * @param resultOrError - Either a RPCError instance for the "error" field or any other type for the "result" field.
     */
    constructor(public id: number|string|null, resultOrError: any) {
        super();
        if (resultOrError instanceof RPCError) {
            this.error = resultOrError;
        } else {
            this.result = resultOrError;
        }
    }
    
    /**
     * Prepares response for serialization.
     */
    public serialize(): any {
        const res = super.serialize();
        if (this.error)
            res.error = this.error.serialize();
        return res;
    }
}