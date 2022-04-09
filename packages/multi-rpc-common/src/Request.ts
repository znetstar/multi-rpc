import Message from "./Message";
import {InstanceComparable} from "./InstanceComparable";

/**
 * Represents a JSON-RPC 2.0 Request object.
 * @see https://www.jsonrpc.org/specification#request_object
 */
export default class Request extends Message  implements InstanceComparable<Request> {
  public static get comparableSymbol() { return Symbol.for('Request'); }
public get comparableSymbol() { return ((this as any).__proto__.constructor.comparableSymbol); }
    public isSibling(instance: Request): boolean {
      return instance.comparableSymbol === this.comparableSymbol;
    }
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
