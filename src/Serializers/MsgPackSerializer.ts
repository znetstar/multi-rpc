import * as msgpack from "msgpack-lite";
import Serializer from "../Serializer";
import Message from "../Message";
import { ParseError } from "../Errors";

/**
 * Represents a serializer that can serialize and deserialize MessagePack.
 * 
 */
export default class MsgPackSerializer extends Serializer {
    /**
     * The content type of the serialized object.
     */
    public get content_type(): string { return "application/msgpack"; }

    /**
     * Serializes a message using MsgPack.
     * @param object - Message to serialize.
     */
    serialize(object: Message): Uint8Array {
        return msgpack.encode(object);
    }

    /**
     * Deserializes MsgPack to a message.
     * @param data - MsgPack to deserialize.
     */
    deserialize(data: Uint8Array) {
        let msgPackObject;

        try {
            msgPackObject = msgpack.decode(data);
        } catch (error) {
            throw new ParseError(error);
        }

        return super.deserialize(msgPackObject);
    }
}