const { Server } = require("net");
const { assert } = require("chai");
const Chance = require('chance');
const chance = new Chance();
const getPort = require("get-port");
const { TCPTransport } = require("multi-rpc-tcp-transport");
const { JSONSerializer } = require("multi-rpc-json-serializer");
const { 
    Notification,
    Transport,
    TransportIsNotPersistent,
    Request
} =  require("multi-rpc-common");

const { Client } = require("../lib");

describe("Client", function () {
    describe("#notification - event", function (done) {
        it("When a notification is emitted on the transport it should be emitted on the event emitter", function () {
            this.timeout(500);

            const serializer = new JSONSerializer();
            const transport = new Transport(serializer);
            const client = new Client(transport);
            const event = chance.string();
            const notification = new Notification(chance.string());
            client.once(event, () => {
                done();
            });

            transport.emit("notification", notification);
        });
    });

    describe("#connect()", function () {

    });


    describe("#invoke()", function () {
        it("Should invoke a method on the server and return the response", async function () {
            const server = new Server();
            const port = await getPort();
            const result = chance.string();
            const serializer = new JSONSerializer();
            server.on("connection", (connection) => {
                connection.on("data", (data) => {
                    const msg = serializer.deserialize(data.toString());
                    assert.instanceOf(msg, Request);
                    connection.end(JSON.stringify({ id: msg.id, result, jsonrpc: "2.0" }));
                    server.close();
                });
            });

            server.listen(port);

            const transport = new TCPTransport(serializer, port);
            const client = new Client(transport);
            const resp = await client.invoke(chance.string(), [chance.string()]);
            
            assert.equal(result, resp);
        });

        it("The method ID should increase after each request", async function () {
            const server = new Server();
            const port = await getPort();
            const serializer = new JSONSerializer();
            const transport = new TCPTransport(serializer, port);
            const client = new Client(transport);
            client.invoke(chance.string(), [chance.string()]).catch(() => {});
            client.invoke(chance.string(), [chance.string()]).catch(() => {});
            assert.isAbove(client.method_id, 2);
            server.close();
        });
    });

    describe("#notify()", function () {
        it("Should send a notification", async function () {
            const server = new Server();
            const port = await getPort();
            server.on("connection", (connection) => {
                connection.on("data", (data) => {
                    const msg = serializer.deserialize(data.toString());
                    assert.instanceOf(msg, Notification);                   
                    connection.end();
                    server.close();
                });
            });

            server.listen(port);

            const serializer = new JSONSerializer();
            const transport = new TCPTransport(serializer, port);
            const client = new Client(transport);
            await client.notify(chance.string(), [chance.string()]);
        });
    });
});