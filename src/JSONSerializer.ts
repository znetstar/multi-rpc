import {EncodeToolsSerializer} from "multi-rpc-common";
import {SerializationFormat} from "@znetstar/encode-tools/lib/EncodeTools";

const { TextDecoder } = require("text-encoding");
const textDecoder = new TextDecoder();

/**
 * Represents a serializer that can serialize and deserialize JSON.
 */
export default class JSONSerializer extends EncodeToolsSerializer {
    constructor() {
      super({
        serializationFormat: SerializationFormat.json,
        useToPojoBeforeSerializing: true
      });
    }
}
