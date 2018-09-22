import Serializer from "../Serializer";
import { ParseError } from "../Errors";
import Response from "../Response";
import Message from "../Message";
import { TextEncoder, TextDecoder } from "util";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export default class JSONSerializer extends Serializer {
    serialize(object: Message): string {
        return JSON.stringify(object);
    }

    deserialize(data: Uint8Array|string){
        if (data instanceof Uint8Array)
            data = textDecoder.decode(data);
        
        let jsonObject;
        try {
            jsonObject = JSON.parse(data);
        } catch (error) {
            throw new ParseError(error);
        }

        return super.deserialize(jsonObject);
    }
}