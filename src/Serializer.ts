import Message from "./Message";
import Request from "./Request";
import Notification from "./Notification";
import Response from "./Response";
import { InvalidRequest, RPCError } from "./Errors";

/**
 * Checks if the fields in the object are valid fields.
 * @param fieldsNeeded - Valid fields for the object. 
 * @param fieldsPresent - Fields on the object.
 * @ignore
 */
const allowedFields = (fieldsNeeded: string[], object: Object): boolean => {
    const fieldsPresent = Object.keys(object);
    return fieldsPresent.every((field) => fieldsNeeded.concat([ "jsonrpc" ]).includes(field));
};

/**
 * Base class for a message serializer.
 */
export default abstract class Serializer {
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
     * @param batch - Indicates if the message may be a batch request.
     */
    deserialize(object: any, batch: boolean = true): Request|Notification|Response|Array<Request>|Array<Notification>|Array<Response> {
        let result;
        
        // Handle batch requests
        if (batch && typeof(object) === 'object' && Array.isArray(object)) {
            return object.map<any>((message: Object) => this.deserialize(message, false));
        }

        // Check for invalid requests. Object must be an "object", not be "null" and have the "jsonrpc" field set to "2.0"
        if (
            !allowedFields([ "id", "method", "params", "error", "result" ], object)
            || (
                object === null 
                || typeof(object) !== "object" 
                || object.jsonrpc !== "2.0"
            )
        ) 
            throw new InvalidRequest();

        // Check for "Request"
        if (
            !allowedFields([ "id", "method", "params" ], object)
            // Method must be a string
            || typeof(object.method) === "string"
            // ID must be a string, number or null.
            && (
                typeof(object.id) === "string" 
                || (typeof(object.id) === "number")
                || (object.id === null)
            )
        )
            result = new Request(object.id, object.method, object.params);
        // Check for "Notification"
        else if (
            !allowedFields([ "method", "params" ], object)
            // Method must be a string
            || typeof(object.method) === "string"
            // ID must not exist
            && typeof(object.id) === "undefined"
        )
            result = new Notification(object.method, object.params);
        // Check for "Response"
        else if (
            !allowedFields([ "id", "result" ], object)
            // The ID must be a string, number or null
            || (
                typeof(object.id) === "string" 
                || (typeof(object.id) === "number")
                || (object.id === null)
            )
            // "result" must exist
            && typeof(object.result) !== "undefined"
        ) 
            result = new Response(object.id, object.result);
        // Check for "Response" with an error
        else if (
            !allowedFields([ "id", "error" ], object)
            // "error" must exist
            || typeof(object.error) !== "undefined"
        ) {
            const error = new RPCError(object.error.message, object.error.code, object.error.data);
            result = new Response(object.id, error);
        }
        else
            throw new InvalidRequest();

        return <Request|Notification|Response>result;
    }
}