import { cloneDeep } from "lodash";
/**
 * The base class for all Message types.
 */

export default abstract class Message {
    constructor(public jsonrpc: string = "2.0") {
    }

    /**
     * Prepares mesasge for serialization.
     */
    public serialize(): any {
        return cloneDeep(this);
    }
}