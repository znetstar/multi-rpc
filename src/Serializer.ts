import Message from "./Message";
import Invocation from "./Invocation";
import Notification from "./Notification";
import Response from "./Response";
import { InvalidRequest, RPCError } from "./Errors";


export default abstract class Serializer {
    abstract serialize(object: any): Uint8Array|string;

    deserialize(object: any): Invocation|Notification|Response {
        let result;
        if (object === null || typeof(object) !== 'object' || object.jsonrpc !== '2.0') {
            throw new InvalidRequest();
        }

        if (object.method && object.id) 
            result = new Invocation(object.id, object.method, object.params);
        else if (object.methods)
            result = new Notification(object.method, object.params);
        else if (object.id && object.result) 
            result = new Response(object.id, object.result);
        else if (object.id && object.error) {
            const error = new RPCError(object.error.message, object.error.code, object.error.data);
            result = new Response(object.id, error);
        }
        else
            throw new InvalidRequest();

        return <Invocation|Notification|Response>result;
    }
}