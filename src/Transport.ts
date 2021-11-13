import {EventEmitter2} from "eventemitter2";
import Serializer from "./Serializer";
import Message from "./Message";
import Request from "./Request";
import Notification from "./Notification";
import Response from "./Response";
import {RPCError} from "./Errors";
import ClientRequest from "./ClientRequest";
import {InstanceComparable} from "./InstanceComparable";
import {EncodeTools} from '@etomon/encode-tools';
import {IDFormat} from "@etomon/encode-tools/lib/EncodeTools";

/**
 * Transports facilitate the exchange of messages between Server and Client.
 * The transport can be used either as a server (listening for connections) or as a client (maintaining a single connection to a server).
 */
export default abstract class Transport extends EventEmitter2  implements InstanceComparable<Transport> {
    public static get comparableSymbol() { return Symbol.for('Transport'); }
    public get comparableSymbol() { return ((this as any).__proto__.constructor.comparableSymbol); }
    public isSibling(instance: Transport): boolean {
      return instance.comparableSymbol === this.comparableSymbol;
    }
    /**
     * Creates a Transport object.
     * @param serializer - The serializer that will be used to serialize and deserialize requests.
     */
    constructor(protected serializer: Serializer) {
        super({
            delimiter: ':',
            wildcard: true
        });
    }

    /**
     * Generates a unique id that can be used to distinguish between connected clients.
     * The unique id will be a UUID v4 returned as a Uint8Array.
     */
    static uniqueId(): Uint8Array {
        return EncodeTools.WithDefaults.uniqueId(IDFormat.uuidv4);
    }

    /**
     * This method will be used to send a Message to the server, using the serializer, via the underlying protocol.
     * @param message - The message to send to the server.
     * @returns - A Promise that will resolve when the message has been sent.
     * @async
     */
    public abstract send(message: Message): Promise<void>;

    /**
     * This method is called when the server has sent a message to a client and vice versa.
     * @param data - The serialized message as either binary or text.
     * @param clientRequest - Contains data on the inbound request, including the client's ID.
     */
    protected receive(data: Uint8Array|string, clientRequest?: ClientRequest) {
        let message;
        try {
            const serializer = clientRequest?.serializer || this.serializer;
            message = serializer.deserialize(data);
        } catch (error) {
            if (clientRequest && clientRequest.respond) {
                const resp = new Response((error.data && error.data.id), <RPCError>error);
                if (error.data && error.data.id)
                    delete error.data.id;

                clientRequest.respond(resp);
            }
            else
                throw error;
        }

        if (Array.isArray(message))
            /**
             * Emitted when a batch (an array of messages) has been received.
             * @event Transport#batch
             * @fires Transport#batch
             * @param {Array<Message>} message - An array of messages to be processed sequentially.
             * @param {ClientRequest} clientRequest - Contains data on the inbound request, including the client's ID.
             */
            this.emit("batch", message, clientRequest);

        else if (message.comparableSymbol === Request.comparableSymbol)
            /**
             * Emitted when a request (method call) has been received by the server.
             * @event Transport#request
             * @fires Transport#request
             * @param {Request} message - The RPC method call.
             * @param {ClientRequest} clientRequest - Contains data on the inbound request, including the client's ID.
             */
            this.emit("request", <Request>message, clientRequest);

        else if (message.comparableSymbol === Notification.comparableSymbol)
            /**
             * Emitted when a notification (event) has been received by either the server or the client.
             * @event Transport#notification
             * @fires Transport#notification
             * @param {Notification} message - The notification.
             * @param {ClientRequest} clientRequest - Contains data on the inbound request, including the client's ID.
             */
            this.emit("notification", <Notification>message, clientRequest);

        else if (message.comparableSymbol === Response.comparableSymbol) {
            const response = <Response>message;
            /**
             * Emitted when the client has received a response from the server.
             *
             * The name of the event will contain the ID of the request that was made.
             * To listen for all requests listen to "response:*".
             *
             * @event Transport#response:*
             * @fires Transport#response:*
             * @param {Response} message - The response from the request that was made.
             * @param {ClientRequest} clientRequest - Contains data on the inbound request, including the client's ID.
             *
             * @example
             * // response: { "id": 1, "result": { "foo": "bar" } }
             * Transport.on("response:1", (msg) => {
             *  console.log(msg) // output: { "foo": "bar" }
             * })
             */
            this.emit(`response:${response.id}`, response, clientRequest);
        }
    }
}
