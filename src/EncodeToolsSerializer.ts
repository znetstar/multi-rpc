import Serializer from "./Serializer";
import Message from "./Message";
import {
  EncodeTools,
  EncodingOptions,
  BinaryEncoding,
  SerializationFormat, SerializationFormatMimeTypes
} from '@etomon/encode-tools/lib/EncodeTools';
import {Buffer} from 'buffer';
import {ParseError} from "./Errors";

type Encodable =  Request | Notification | Response | Array<Request> | Array<Notification> | Array<Response>;

export class EncodeToolsSerializer extends  Serializer{
  protected encoder = new EncodeTools({
    ...this.encodingOptions,
    binaryEncoding: BinaryEncoding.nodeBuffer
  });
  constructor(protected encodingOptions: EncodingOptions) {
    super();
  }
  public serialize(object: Message): Uint8Array | string {
    const bin = this.encoder.serializeObject<Message>(object);
    if (typeof(bin) === 'string') {
      return bin;
    } else {
      return bin as any as Uint8Array;
    }
  }
  public deserialize(bin: Uint8Array|string, batch: boolean = true) {
    try {
      const object = this.encoder.deserializeObject<any>(bin);
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
