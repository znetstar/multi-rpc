import {InstanceComparable} from "./InstanceComparable";
import Serializer from "./Serializer";

/**
 * Contains information on the request that was made by a client.
 */
export default class ClientRequest implements InstanceComparable<ClientRequest> {
    public static get comparableSymbol() { return Symbol.for('ClientRequest'); }
  public get comparableSymbol() { return ((this as any).__proto__.constructor.comparableSymbol); }
    public isSibling(instance: ClientRequest): boolean {
      return instance.comparableSymbol === this.comparableSymbol;
    }
    /**
     * Creates a ClientRequest object.
     * @param clientId - The unique ID of the client.
     * @param respond - A function that will be called send the response to the client.
     * @param additionalData - Any additional data that will be needed to service the request (IP Address, authentication, etc.).
     * @param serializer - Serializer to use for this request only. Overrides the transport's serializer.
     */
    constructor(public clientId: any, public respond?: Function, public additionalData?: any, public serializer?: Serializer) {

    }
}
