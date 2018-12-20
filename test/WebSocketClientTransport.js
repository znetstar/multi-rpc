const http = require("http");
const { w3cwebsocket, server } = require("websocket");
const { assert } = require("chai");
const getPort = require('get-port');
const Chance = require('chance');
const chance = new Chance();
const { JSONSerializer } = require('multi-rpc-json-serializer');
const { TransportInServerState } = require('multi-rpc-common');
const { WebSocketClientTransport } = require("../lib");

const { 
    Request,
    Notification
} = require("multi-rpc-common");

function randomPort() { return chance.integer({ min: 1024, max: 65535 }) }

describe("WebSocketClientTransport", function () {
    describe("#connect()", function () {
        it("Should throw TransportInServerState if the Transport is already in a server state", async function () {
            const serializer = new JSONSerializer();
            const port = randomPort();
            const transport = new WebSocketClientTransport(serializer, `ws://127.0.0.1:${port}`);
            transport.connections = new Map();
            let fn = () => {};
            try {
                await transport.connect();
            } catch (error) {
                fn = () => { throw error };
            } finally {
                assert.throws(fn, TransportInServerState);
            }
        });

        it("Should throw if the connection details do not exist", async function () {
            const serializer = new JSONSerializer();
            const port = randomPort();
            const transport = new WebSocketClientTransport(serializer, `ws://127.0.0.1:${port}`);

            let fn = () => {};
            try {
                await transport.connect();
            } catch (error) {
                fn = () => { throw error };
            } finally {
                assert.throws(fn);
            }
        });

        it("Should successfully connect to a WebSocket server", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const transport = new WebSocketClientTransport(serializer, `ws://127.0.0.1:${port}`);

            const httpServer = http.createServer((req, res) => { 
                res.writeHead(404); res.end();  
            });
            const wsServer = new server({ httpServer, autoAcceptConnections: false });

            return new Promise((resolve, reject) => {
                httpServer.listen(port, () => {
                    wsServer.on("request", function () {
                        resolve();
                    });

                    transport.connect().catch((error) => {
                        reject(error);
                    });
                });
            });
        });
    });

    describe("#sendConnection(connection: Socket, message: Message)", function () {
        it("Should successfully send a message to a WebSocket server using the provided socket", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const transport = new WebSocketClientTransport(serializer, chance.string());

            const httpServer = new (http.Server)((req, res) => { res.writeHead(404); res.end();  });
            const wsServer = new server({ httpServer, autoAcceptConnections: false  });
            httpServer.listen(port);

            const socket = new w3cwebsocket(`ws://127.0.0.1:${port}`);
            
            const p = new Promise((resolve, reject) => {
                wsServer.on("request", () => {
                    resolve();
                });

                socket.onerror = (error) => {
                    reject(error);
                };

                socket.onopen = () => {
                    transport.sendConnection(socket, new Notification(chance.string()));
                };
            });

            return p;
        });
    });

    describe("#send(message: Message)", function () {
        it("Should successfully send a message to a WebSocket server", function (done) {
            (async () => {
                const serializer = new JSONSerializer();
                const port = await getPort();
                const transport = new WebSocketClientTransport(serializer, `ws://127.0.0.1:${port}`);

                const httpServer = http.createServer((req, res) => { res.writeHead(404); res.end();  });
                const wsServer = new server({ httpServer, autoAcceptConnections: false  });
                httpServer.listen(port);

                wsServer.on("request", () => {
                    done();
                });

                await transport.send(new Notification(chance.string()));
            })();
        });
    });
});