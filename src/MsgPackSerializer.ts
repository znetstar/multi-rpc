import {EncodeToolsSerializer} from "multi-rpc-common";
import {SerializationFormat} from "@etomon/encode-tools/lib/EncodeTools";

/**
 * Represents a serializer that can serialize and deserialize MessagePack.
 *
 */
export default class MsgPackSerializer extends EncodeToolsSerializer {
    constructor() {
      super({
        serializationFormat: SerializationFormat.msgpack
      });
    }
}
