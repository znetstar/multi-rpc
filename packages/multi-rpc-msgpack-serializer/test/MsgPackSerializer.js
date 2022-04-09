const msgpack = require("@msgpack/msgpack");
const { assert } = require("chai");
const Chance = require('chance');

const { Response } = require('multi-rpc-common');
const { MsgPackSerializer } = require("../lib");

const chance = new Chance();

describe("MsgPackSerializer", function () {
    describe("#serialize(object: Message): Uint8Array", function () {
        it("Should return a valid MessagePack representation of the input", function () {
            const serializer = new MsgPackSerializer();
            const message = new Response(chance.integer(), chance.bool());
            let bin = serializer.serialize(message);
            const obj = msgpack.decode(bin);
          
            assert.deepEqual(message, obj, "To deserialized object does not have the same values as the one serialized");
        });

        it('Should serialize an undefined object without error', function () {
            const serializer = new MsgPackSerializer();
            
            assert.doesNotThrow(() => { serializer.serialize(void(0)); }, "Serializer threw an error attempting to serialize undefined");
        });
    });

    describe("#deserialize(data: Uint8Array): Message", function () {
        it("Should return an object from the MessagePack representation of an object", function () {
            const serializer = new MsgPackSerializer();
            const input = new Response(chance.integer(), chance.bool());
            const inputBin = msgpack.encode(input);
            let obj = serializer.deserialize(inputBin);
            assert.instanceOf(obj, Response, "The object deserialized does not have the same type as the one serialized");
            assert.deepEqual(input, obj, "The object deserialized did not have the same values as the one serialized");
        });
    });
});