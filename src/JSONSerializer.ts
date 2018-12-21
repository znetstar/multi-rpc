import { Serializer, ParseError, Response, Message } from "multi-rpc-common";
const { TextDecoder } = require("text-encoding");
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
        return JSON.stringify(object.serialize ? object.serialize() : object);
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