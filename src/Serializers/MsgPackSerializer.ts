import * as msgpack from "msgpack-lite";
import Serializer from "../Serializer";
import Message from "../Message";
import { ParseError } from "../Errors";

export default class MsgPackSerializer extends Serializer {
    serialize(object: Message): Uint8Array {
        return msgpack.encode(object);
    }

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