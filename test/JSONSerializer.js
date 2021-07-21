const { Serializer, ParseError, EncodeToolsSerializer } = require("../lib");

class JSONSerializer extends EncodeToolsSerializer {
    constructor() {
      super({
        serializationFormat: 'json'
      });
    }
}

module.exports = { JSONSerializer };
