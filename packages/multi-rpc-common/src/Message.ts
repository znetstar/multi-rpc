import { cloneDeep } from "lodash";
import {InstanceComparable} from "./InstanceComparable";
/**
 * The base class for all Message types.
 */

export default abstract class Message implements InstanceComparable<Message> {
    public static get comparableSymbol() { return Symbol.for('Message'); }
public get comparableSymbol() { return ((this as any).__proto__.constructor.comparableSymbol); }
    public isSibling(instance: Message): boolean {
      return instance.comparableSymbol === this.comparableSymbol;
    }
    constructor(public jsonrpc: string = "2.0") {
    }

    /**
     * Prepares mesasge for serialization.
     */
    public serialize(): any {
        return cloneDeep(this);
    }
}
