const { w3cwebsocket, server } = require("websocket");
const http = require("http");
const { assert } = require("chai");
const getPort = require('get-port');
const Chance = require('chance');
const chance = new Chance();
const request = require("request-promise-native");

const { 
    WebSocketTransport,
    TransportInServerState,
    JSONSerializer,
    Notification,
    Request
} = require("../../lib");

function randomPort() { return chance.integer({ min: 1024, max: 65535 }) }

describe("WebSocketTransport", function () {
    describe("#connect()", function () {
        it("Should throw TransportInServerState if the Transport is already in a server state", async function () {
            const serializer = new JSONSerializer();
            const port = randomPort();
            const transport = new WebSocketTransport(serializer, `ws://127.0.0.1:${port}`);
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
            const transport = new WebSocketTransport(serializer, `ws://127.0.0.1:${port}`);

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
            const transport = new WebSocketTransport(serializer, `ws://127.0.0.1:${port}`);

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
            const transport = new WebSocketTransport(serializer, chance.string());

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
                const transport = new WebSocketTransport(serializer, `ws://127.0.0.1:${port}`);

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

    describe("#receive()", async function () {
        it("Should parse a valid JSON-RPC request", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const transport = new WebSocketTransport(serializer, port);

            const p = new Promise((resolve, reject) => {
                transport.once("request", (req) => {
                    assert.ok(req);
                    assert.instanceOf(req, Request);
                    transport.close();
                    resolve();
                });
            });

            await transport.listen();

            const ws = new w3cwebsocket(`ws://127.0.0.1:${port}`);
            ws.onopen = () => {
                ws.send(new Buffer(JSON.stringify({ id: chance.integer(), method: chance.string(), jsonrpc: "2.0" }), "utf8"));
            };

            return p;
        });
    });

    describe("#listen()", async function () {
        it("Should begin listening on a given port", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const transport = new WebSocketTransport(serializer, port);

            await transport.listen();
            
            const webSocket = new w3cwebsocket(`ws://127.0.0.1:${port}`);
            const p = new Promise((resolve, reject) => {
                webSocket.onerror = (error) => {
                    reject(error);
                };
                webSocket.onopen = () => {
                    resolve();
                };
            });
            return p;
        });

        it("Should begin listening on an existing server", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const server = new (http.Server)();
            server.listen(port);
            const transport = new WebSocketTransport(serializer, server);

            await transport.listen();

            const webSocket = new w3cwebsocket(`ws://127.0.0.1:${port}`);
            const p = new Promise((resolve, reject) => {
                webSocket.onerror = (error) => {
                    reject(error);
                };
                webSocket.onopen = () => {
                    resolve();
                };             
            });

            return p;
        });
    });

    describe("close()", function () {
        it("Should close the underlying WebSocket/HTTP Servers", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const transport = new WebSocketTransport(serializer, port);
        
            await transport.listen();
        
            let socket = new w3cwebsocket(`ws://127.0.0.1:${port}`);
            const p = new Promise((resolve, reject) => {
                socket.onerror = (error) => {
                    reject(error);
                };

                socket.onclose = () => {
                    resolve();
                };
                
                socket.onopen = () => {
                    transport.close();
                }; 
            });
            return p;
        });

        it("Should close the underlying WebSocket Server but not the HTTP Server if an HTTP Server was provided.", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const srv = new (http.Server)((req, res) => {
                res.writeHead(200);
                res.end();
            });

            srv.listen(port);
            const transport = new WebSocketTransport(serializer, srv);
        
            await transport.listen();
        
            let socket = new w3cwebsocket(`ws://127.0.0.1:${port}`);
            const p = new Promise((resolve, reject) => {
                socket.onerror = (error) => {
                    reject(error);
                };

                socket.onclose = async () => {
                    let fn = () => {};
                    try {
                        await request({
                            url: `http://127.0.0.1:${port}`
                        });
                    } catch (error) {
                        fn = () => { throw error };
                    } finally {
                        assert.doesNotThrow(fn);
                        resolve();
                    }
                };
                
                socket.onopen = () => {
                    transport.close();
                }; 
            });
            return p;
        });
    });
});