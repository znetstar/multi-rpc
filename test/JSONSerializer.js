const { Serializer, ParseError } = require("../lib");

class JSONSerializer extends Serializer {
    serialize(object) { return JSON.stringify(object.serialize()); }
    deserialize(string) { 
        try {
            return super.deserialize(JSON.parse(string)); 
        } catch (error) {
            throw new ParseError();
        }
    }
}

module.exports = { JSONSerializer };