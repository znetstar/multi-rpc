const { assert } = require("chai");
const Chance = require('chance');
const chance = new Chance();

const { 
   RPCError
} = require("../lib");

describe("RPCError", function () {
    describe("#toJSON", function () {
        it("The \"innerError\" should be the same as the error passed into the constructor of RPCError", function () {
            const errorMessage = chance.string();
            const innerError = new Error(errorMessage);
            const error = new RPCError(chance.string, chance.integer(), innerError);
            const json = JSON.stringify(error);
            const parsedError = JSON.parse(json);
            assert.equal(errorMessage, parsedError.data.innerError.message);
        });
    });
});