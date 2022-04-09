const { TextEncoder } = require("text-encoding");
const { assert } = require("chai");
const Chance = require('chance');
const { Response } = require('multi-rpc-common');
const { JSONSerializer } = require("../lib");

const chance = new Chance();

describe("JSONSerializer", function () {
    describe("#serialize(object: Message): string", function () {
        it("Should return a valid JSON string representation of the input", function () {
            const serializer = new JSONSerializer();
            const message = new Response(chance.integer(), chance.bool());
            const str = serializer.serialize(message);
            const obj = JSON.parse(str);

            assert.deepEqual(message, obj, "To deserialized object does not have the same values as the one serialized");
        });

        it("Should serialize undefined without an error", function () {
            const serializer = new JSONSerializer();
            assert.doesNotThrow(() => { serializer.serialize(void(0)); }, "Threw an error attempting to serialize undefined");
        });
    });

    describe("#deserialize(data: Uint8Array|String): Message", function () {
        it("Should return an object from a JSON string representation of an object", function () {
            const serializer = new JSONSerializer();
            const input = new Response(chance.integer(), chance.bool());
            const inputStr = JSON.stringify(input);
            const obj = serializer.deserialize(inputStr);
            assert.instanceOf(obj, Response, "The object deserialized does not have the same type as the one serialized");
            assert.deepEqual(input, obj, "The object deserialized did not have the same values as the one serialized");
        });

        it("Should return an object from JSON representation of an object as binary", function () {
            const serializer = new JSONSerializer();
            const input = new Response(chance.integer(), chance.bool());
            const textEncoder = new TextEncoder();
            const inputBin = textEncoder.encode(JSON.stringify(input));
            const obj = serializer.deserialize(inputBin);
            assert.instanceOf(obj, Response, "The object deserialized does not have the same type as the one serialized");
            assert.deepEqual(input, obj, "The object deserialized did not have the same values as the one serialized");
        });
    });
});