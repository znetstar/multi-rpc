import { EventEmitter2 } from "eventemitter2";
import Serializer from "./Serializer";
import Message from "./Message";
import Request from "./Request";
import Notification from "./Notification";
import Response from "./Response";
import { RPCError } from "./Errors";
import ClientRequest from "./ClientRequest";
import * as uuid from "uuid";

/**
 * Transports facilitate exchanging messages between Server and Client.
 * The transport can be used either as a server (listening for connections) or as a client (maintaining a single connection).
 */
export default abstract class Transport extends EventEmitter2 {
    /**
     * Creates a Transport object. Cannot be called directly.
     * @param serializer - The serializer that will be used to serialize and deserialize requests.
     */
    constructor(protected serializer: Serializer) {
        super({
            delimiter: ':',
            maxListeners: Infinity,
            wildcard: true
        });
    }

    /**
     * Generates a unique id that can be used to distinguish between connected clients.
     * The unique id will be a UUID v4 returned as a Uint8Array.
     */
    static uniqueId(): Uint8Array {
        const uniqueId = new Uint8Array(16);
        uuid.v4(null, uniqueId, 0);
        return uniqueId;
    }

    /**
     * This method will be used to send a Message to the server, using the serializer, via the underlying protocol.
     * @param message - The message to send to the server.
     * @returns - A Promise that will resolve when the message has been sent.
     * @async
     */
    public abstract send(message: Message): Promise<void>;

    /**
     * This method is called when the server has sent a message to a client or vice versa.
     * @param data - The serialized message either in binary or as text. 
     * @param clientRequest - If acting as a server contains data on the inbound request, including the clientId.
     */
    protected receive(data: Uint8Array|string, clientRequest?: ClientRequest) {
        let message;
        try {
            message = this.serializer.deserialize(data);
        } catch (error) {
            if (clientRequest && clientRequest.respond) 
                clientRequest.respond(new Response(null, <RPCError>error));
            else
                throw error;
        }

        if (Array.isArray(message))
            /**
             * Emitted when a batch (an array of messages) has been received. 
             * @event Transport#batch
             * @fires Transport#batch
             * @param {Array<Message>} message - An array of messages to be processed sequentially.
             */
            this.emit("batch", message);

        else if (message instanceof Request)
            /**
             * Emitted when a request (method call) has been received by the server.
             * @event Transport#request
             * @fires Transport#request
             * @param {Request} message - The RPC method call.
             */
            this.emit("request", <Request>message, clientRequest);

        else if (message instanceof Notification) 
            /**
             * Emitted when a notification (event) has been received by either the server or the client.
             * @event Transport#notification
             * @fires Transport#notification
             * @param {Notification} message - The notification.
             */
            this.emit("notification", <Notification>message, clientRequest);

        else if (message instanceof Response) {
            const response = <Response>message;
            /**
             * Emitted when either the client has received a response from the server.
             * 
             * The name of the event will contain the ID of the request that was made
             * To listen for all requests listen to "response:*".
             * 
             * @event Transport#response:*
             * @fires Transport#response:*
             * @param {Response} message - The response from the request that was made.
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

    /**
     * Begin listening for incoming connections.
     * 
     * @async 
     */
    public abstract listen(): Promise<void>;
}