const { assert } = require("chai");
const Chance = require('chance');
const chance = new Chance();

const { 
    PersistantTransport,
    NonExistantClient,
    TransportIsNotPersistant,
    TransportInServerState,
    TransportInClientState,
    Message,
    JSONSerializer
} = require("../lib");

describe("PersistentTransport", function () {
    describe("#addConnection(connection, id)", function () {
        it("Should add connection to the map of connections with a generated ID, and return that ID", function () {
            const serializer = new JSONSerializer();
            const transport = new PersistantTransport(serializer);
            transport.connections = new Map();
            const connection = chance.string();
            const clientId = transport.addConnection(connection);
            assert.isOk(clientId, "Did not return a valid id");
            const client = transport.connections.get(clientId);
            assert.isTrue(transport.connections.has(clientId), "Connection table does not include the connection");
            assert.equal(connection, client, "The item in the connection table with the generated id is not the same object that was passed to addConnection");
        });

        it("Should add connection to the map of connections with a provided ID, and return that ID", function () {
            const serializer = new JSONSerializer();
            const transport = new PersistantTransport(serializer);
            transport.connections = new Map();
            const connection = chance.string();
            const clientId = chance.guid();
            const resultId = transport.addConnection(connection, clientId);
            assert.equal(resultId, clientId, "ID returned by add connection was not the same ID that was passed");
            const client = transport.connections.get(clientId);
            assert.isTrue(transport.connections.has(clientId), "Connection table does not include the connection");
            assert.equal(connection, client, "The item in the connection table with the generated id is not the same object that was passed to addConnection");
        });
    });

    describe("#removeConnection", function () {
        it("Should remove a connection from the table of connections by ID", function () {
            const serializer = new JSONSerializer();
            const transport = new PersistantTransport(serializer);
            transport.connections = new Map();
            const id = chance.guid();
            transport.connections.set(id, chance.string());
            transport.removeConnection(id);
            assert.isFalse(transport.connections.has(id), "ID still exists in the connection table");           
        });
    });

    describe("#sendTo(id, message: Message)", function () {
        it("Should call #sendConnection with the connection matching the ID and a Message", async function () {
            return new Promise((resolve, reject) => {
                this.timeout(500);
                const serializer = new JSONSerializer();
                const transport = new PersistantTransport(serializer);
                transport.connections = new Map();

                const connection = chance.string();
                const clientId = chance.guid();
                const msg = new Message();

                transport.sendConnection = (arg_connection, arg_message) => {
                    assert.equal(connection, arg_connection, "Connection was not the connection object matching the ID");
                    assert.equal(msg, arg_message, "Message object was not the same object passed");
                    resolve();
                };
                
                transport.connections.set(clientId, connection);
                transport.sendTo(clientId, msg).catch(reject);
            });
        }); 
        
        it("Should throw TransportInClientState if the transport has a connection set", async function () {
            const serializer = new JSONSerializer();
            const transport = new PersistantTransport(serializer);
            transport.connection = chance.string();
            const id = chance.guid();
            transport.connections = new Map([
                [ id, chance.string() ]
            ]);

            transport.sendConnection = () => {};

            let fn = () => {};
            try {
                await transport.sendTo(id, new Message());
            } catch (error) {
                fn = () => { throw error; };
            } finally {
                assert.throws(fn, TransportInClientState);
            }
        });

        it("Should throw NonExistantClient if the connection referenced does not exist in the connection table", async function () {
            const serializer = new JSONSerializer();
            const transport = new PersistantTransport(serializer);
            transport.connections = new Map();

            let fn = () => {};
            try {
                await transport.sendTo(chance.guid(), new Message());
            } catch (error) {
                fn = () => { throw error; };
            } finally {
                assert.throws(fn, NonExistantClient);
            }
        });
    });

    describe("#send(message: Message)", function () {
        it("Should call #sendConnection with the connection to the server", async function () {
            return new Promise((resolve, reject) => {
                this.timeout(500);
                const serializer = new JSONSerializer();
                const transport = new PersistantTransport(serializer);

                const connection = chance.string();
                const msg = new Message();

                transport.sendConnection = (arg_connection, arg_message) => {
                    assert.equal(connection, arg_connection, "Connection was not the connection object matching the ID");
                    assert.equal(msg, arg_message, "Message object was not the same object passed");
                    resolve();
                };
                
                transport.connection = connection;
                transport.send(msg).catch(reject);
            });
        }); 
        
        it("Should throw TransportInServerState if the transport has a connection table", async function () {
            const serializer = new JSONSerializer();
            const transport = new PersistantTransport(serializer);
            transport.connection = chance.string();
            transport.connections = new Map([
                [ chance.guid(), chance.string() ]
            ]);

            transport.sendConnection = () => {};

            let fn = () => {};
            try {
                await transport.send(new Message());
            } catch (error) {
                fn = () => { throw error; };
            } finally {
                assert.throws(fn, TransportInServerState);
            }
        });
    });
});