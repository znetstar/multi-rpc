import Serializer from "../Serializer";
import { ParseError } from "../Errors";
import Response from "../Response";
import Message from "../Message";
import * as detectNode from "detect-node";

let TextDecoder;
if (detectNode) {
    TextDecoder = require("util").TextDecoder;
} else {
    TextDecoder = require("text-encoding").TextDecoder;
}

const textDecoder = new TextDecoder();

/**
 * Represents a serializer that can serialize and deserialize JSON.
 */
export default class JSONSerializer extends Serializer {
    /**
     * The content type of the serialized object.
     */
    public get content_type(): string { return "application/json"; }

    /**
     * Serializes a message to JSON.
     * @param object - Message to serialize.
     */
    serialize(object: Message): string {
        return JSON.stringify(object.serialize());
    }

    /**
     * Deserializes JSON to a message.
     * @param data - Either a JSON string or binary containing JSON.
     */
    deserialize(data: Uint8Array|string){
        if (data instanceof Uint8Array)
            data = textDecoder.decode(data);
        
        let jsonObject;
        try {
            jsonObject = JSON.parse(<string>data);
        } catch (error) {
            throw new ParseError(error);
        }

        return super.deserialize(jsonObject);
    }
}