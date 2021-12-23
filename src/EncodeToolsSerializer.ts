import Serializer from "./Serializer";
import Message from "./Message";
import {
  EncodeTools,
  EncodingOptions,
  BinaryEncoding,
  SerializationFormat, SerializationFormatMimeTypes
} from '@znetstar/encode-tools/lib/EncodeTools';
import {Buffer} from 'buffer';
import {ParseError} from "./Errors";

type Encodable =  Request | Notification | Response | Array<Request> | Array<Notification> | Array<Response>;

/**
 * An implementation of `Serializer` that internally uses `@znetstar/encode-tools` for encoding/decoding.
 * Any serialization methods supported by `@znetstar/encode-tools` (today JSON, MessagePack, CBOR, and BSON)
 * are supported when using this Serializer.
 */
export class EncodeToolsSerializer extends  Serializer{
  protected encoder = new EncodeTools({
    ...this.encodingOptions,
    binaryEncoding: BinaryEncoding.nodeBuffer
  });

  /**
   *
   * @param encodingOptions Options for the encoder. Change `serializationFormat` to change the serialization format of this serializer.
   */
  constructor(protected encodingOptions: EncodingOptions) {
    super();
  }

  public serialize(object: Message): Uint8Array | string {
    const bin = this.encoder.serializeObject<Message>(object.serialize());
    if (typeof(bin) === 'string') {
      return bin;
    } else {
      return bin as any as Uint8Array;
    }
  }
  public deserialize(bin: Uint8Array|string, batch: boolean = true) {
    try {
      const object = this.encoder.deserializeObject<any>(Buffer.from(bin));
      return super.deserialize(object, batch);
    } catch (error) {
      throw new ParseError();
    }
  }

  get content_type(): string {
    return SerializationFormatMimeTypes.get(this.encodingOptions.serializationFormat);
  }
}

export default EncodeToolsSerializer;
