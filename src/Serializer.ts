import Message from "./Message";
import Request from "./Request";
import Notification from "./Notification";
import Response from "./Response";
import { InvalidRequest, RPCError } from "./Errors";

const allowedFields = (fieldsNeeded: string[], fieldsPresent: string[]): boolean => {
    return fieldsPresent.every((field) => fieldsNeeded.concat([ "jsonrpc" ]).includes(field));
};

export default abstract class Serializer {
    abstract serialize(object: any): Uint8Array|string;

    deserialize(object: any): Request|Notification|Response {
        let result;
        
        // Check for invalid requests. Object must be an "object", not be "null" and have the "jsonrpc" field set to "2.0"
        if (
            !allowedFields([ "id", "method", "params", "error", "result" ], Object.keys(object))
            || (
                object === null 
                || typeof(object) !== "object" 
                || object.jsonrpc !== "2.0"
            )
        ) 
            throw new InvalidRequest();

        // Check for "Request"
        if (
            !allowedFields([ "id", "method", "params" ], Object.keys(object))
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
            !allowedFields([ "method", "params" ], Object.keys(object))
            // Method must be a string
            || typeof(object.method) === "string"
            // ID must not exist
            && typeof(object.id) === "undefined"
        )
            result = new Notification(object.method, object.params);
        // Check for "Response"
        else if (
            !allowedFields([ "id", "result" ], Object.keys(object))
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
            !allowedFields([ "id", "error" ], Object.keys(object))
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