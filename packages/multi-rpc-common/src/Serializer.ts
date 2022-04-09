import Message from "./Message";
import Request from "./Request";
import Notification from "./Notification";
import Response from "./Response";
import { InvalidRequest, ServerError,  RPCError, RPCErrorsByCode } from "./Errors";

/**
 * Checks if the fields in the object are valid fields.
 * @param fieldsNeeded - Valid fields for the object.
 * @param fieldsPresent - Fields on the object.
 * @ignore
 */
export function allowedFields (fieldsNeeded: string[], object: Object): boolean {
    const fieldsPresent = Object.keys(object);
    return fieldsPresent.every((field) => fieldsNeeded.includes(field));
};

/**
 * Base class for a message serializer.
 */
export default abstract class Serializer {
    /**
     * The content type of the serialized object.
     */
    public abstract get content_type(): string;

    /**
     * Serializes an object to either binary or a string.
     * @param object - Object to be serialized.
     */
    abstract serialize(object: Message): Uint8Array|string;

    /**
     * Deserializes an existing object to a message.
     * This method verifies that the object conforms to the JSON-RPC 2.0 specification
     *
     * @param object - The object.
     * @param batch - Indicates if the message may be a batch request (array of messages).
     */
    deserialize(object: any, batch: boolean = true): Request|Notification|Response|Array<Request>|Array<Notification>|Array<Response> {
        let result;

        // Handle batch requests
        if (batch && typeof(object) === 'object' && Array.isArray(object)) {
            return object.map<any>((incomingMessage: Object) => {
                const message = deserialize(incomingMessage, false);
                if (!((message as Message).comparableSymbol === Notification.comparableSymbol || (message as Message).comparableSymbol === Request.comparableSymbol))
                    throw new InvalidRequest();
                return message;
            });
        }

        // Check for invalid requests. Object must be an "object", not be "null" and have the "jsonrpc" field set to "2.0"
        if (
            !allowedFields([ "jsonrpc", "id", "method", "params", "error", "result" ], object)
            || (
                object === null
                || typeof(object) !== "object"
                || object.jsonrpc !== "2.0"
            )
        )
            throw new InvalidRequest({ id: object.id });

        // Check for "Request"
        if (
            allowedFields([ "jsonrpc", "id", "method", "params" ], object)
            // Method must be a string
            && typeof(object.method) === "string"
            // ID must be a string, number or null.
            && (
                typeof(object.id) === "string"
                || (typeof(object.id) === "number")
                || (object.id === null)
            )
            // If params exists it must be a not-null Object or an Array
            && (
                (typeof(object.params) === "undefined")
                || (
                    typeof(object.params) === "object"
                    && (object.params !== null)
                )
            )
        )
            result = new Request(object.id, object.method, object.params);
        // Check for "Notification"
        else if (
            allowedFields([ "jsonrpc", "method", "params" ], object)
            // Method must be a string
            && typeof(object.method) === "string"
            // ID must not exist
            && typeof(object.id) === "undefined"
            // If params exists it must be a not-null Object or an Array
            && (
                (typeof(object.params) === "undefined")
                || (
                    typeof(object.params) === "object"
                    && (object.params !== null)
                )
            )
        )
            result = new Notification(object.method, object.params);
        // Check for "Response"
        else if (
            allowedFields([ "jsonrpc", "id", "result" ], object)
            // The ID must be a string, number or null
            && (
                typeof(object.id) === "string"
                || (typeof(object.id) === "number")
                || (object.id === null)
            )
            // "result" must exist
            && typeof(object.result) !== "undefined"
            && typeof(object.error) === "undefined"
        )
            result = new Response(object.id, object.result);
        // Check for "Response" with an error
        else if (
            allowedFields([ "jsonrpc", "id", "error" ], object)
            // "error" must exist and be valid
            && (
                typeof(object.error) === "object"
                && object.error !== null
                // the "error" object must only use the "data", "code" and "mesage" fields
                && allowedFields(["data", "code", "message"], object.error)
                && (
                    // "code" must be a integer
                    Number.isInteger(object.error.code)
                    // "message" must be a string
                    && typeof(object.error.message) === "string"
                )
            )
            // "result must not exist"
            && typeof(object.result) === "undefined"
        ) {
            const { message, data, code } = object.error;
            let error: RPCError;
            // check if the code matches an existing RPC error
            if (RPCErrorsByCode.has(code))
                error = new (RPCErrorsByCode.get(code))(data);
            else if (ServerError.isServerErrorCode(code))
                error = new ServerError(code, data);
            else
                error = new RPCError(message, code, data);

            result = new Response(object.id, error);
        }
        else
            throw new InvalidRequest({ id: object.id });

        return <Request|Notification|Response>result;
    }
}

const deserialize = Serializer.prototype.deserialize;
