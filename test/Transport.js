const { assert } = require("chai");
const Chance = require('chance');
const chance = new Chance();

const { JSONSerializer } = require("./JSONSerializer");

const { 
    Transport, 
    ClientRequest, 
    Response, 
    ParseError, 
    Message, 
    RPCError,
    Request,
    Notification,
    Serializer
} = require("../lib");

describe("Transport", function () {
    describe("#receive(data: Uint8Array|string, clientRequest: ClientRequest)", function () {
        it("Should respond with a ParseError response if a malformatted message is passed", function (done) {
            const json = new JSONSerializer();
            const transport = new Transport(json);
            const message = chance.string();
            const req = new ClientRequest(chance.guid(), (response) => {
                assert.instanceOf(response, Response, "Did not return a response");
                assert.ok(response.error, "Did not return an error");
                assert.notOk(response.result, "Returned a result");
                assert.instanceOf(response.error, ParseError, "Error was not ParseError");
                done();
            });

            transport.receive(message, req);
        });

        it("Should throw a ParseError response if a malformatted message is passed and no clientRequest is passed", function () {
            const json = new JSONSerializer();
            const transport = new Transport(json);
            const message = chance.string();

            assert.throws(() => { transport.receive(message); });
        });

        it("Should fire the batch event if a batch message is passed", function (done) {
            this.timeout(500);
            const json = new JSONSerializer();
            const transport = new Transport(json);
            const message = [
                { jsonrpc: "2.0", id: chance.integer(), method: chance.string() },
                { jsonrpc: "2.0", id: chance.integer(), method: chance.string() },
                { jsonrpc: "2.0", id: chance.integer(), method: chance.string() }
            ];

            transport.once("batch", () => {
                done();
            });

            transport.receive(JSON.stringify(message));
        });

        it("Should fire the batch event if a batch message is passed", function (done) {
            this.timeout(500);
            const json = new JSONSerializer();
            const transport = new Transport(json);
            const message = [
                { jsonrpc: "2.0", id: chance.integer(), method: chance.string() },
                { jsonrpc: "2.0", id: chance.integer(), method: chance.string() },
                { jsonrpc: "2.0", id: chance.integer(), method: chance.string() }
            ];

            transport.once("batch", (messages) => {
                assert.isArray(messages);
                for (let message of messages) {
                    assert.instanceOf(message, Message);
                }

                done();
            });

            transport.receive(JSON.stringify(message));
        });

        it("Should fire the request event if a request message is passed", function (done) {
            this.timeout(500);
            const json = new JSONSerializer();
            const transport = new Transport(json);
            const message = { jsonrpc: "2.0", id: chance.integer(), method: chance.string() };

            transport.once("request", (message) => {
                assert.instanceOf(message, Request);
                done();
            });

            transport.receive(JSON.stringify(message));
        });

        it("Should fire the notification event if a notification message is passed", function (done) {
            this.timeout(500);
            const json = new JSONSerializer();
            const transport = new Transport(json);
            const message = { jsonrpc: "2.0", method: chance.string() };

            transport.once("notification", (message) => {
                assert.instanceOf(message, Notification);
                done();
            });

            transport.receive(JSON.stringify(message));
        });

        it("Should fire the response event if a response message is passed", function (done) {
            this.timeout(500);
            const json = new JSONSerializer();
            const transport = new Transport(json);
            const id = chance.integer();
            const message = { jsonrpc: "2.0", error: { data: chance.string(), code: chance.integer(), message: chance.string() }, id  };

            transport.once(`response:${id}`, (message) => {
                assert.instanceOf(message, Response);
                assert.instanceOf(message.error, RPCError);
                done();
            });

            transport.receive(JSON.stringify(message));
        });
    }); 

    describe("#uniqueId()", function () {
        it("should return a valid UUID", function () {
            assert.match(Buffer.from(Transport.uniqueId()).toString("hex"), /^[0-9a-f]{8}[0-9a-f]{4}[1-5][0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12}$/i)
        });
    });
});