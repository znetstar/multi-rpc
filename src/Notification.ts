import Message from "./Message";
import {InstanceComparable} from "./InstanceComparable";

/**
 * Represents a JSON-RPC 2.0 Notification Notification object.
 * @see https://www.jsonrpc.org/specification#notification
 */
export default class Notification extends Message  implements InstanceComparable<Notification> {
    public static get comparableSymbol() { return Symbol.for('Notification'); }
    public get comparableSymbol() { return ((this as any).__proto__.constructor.comparableSymbol); }
    public isSibling(instance: Notification): boolean {
      return instance.comparableSymbol === this.comparableSymbol;
    }
    /**
     * Creates a Notification object.
     * @param method - The method (or event name).
     * @param params - The arguments for the event.
     */
    constructor(public method: string, public params?: Array<any>|Object) {
        super();

    }
}
