const http = require("http");
const { w3cwebsocket, server } = require("websocket");
const { assert } = require("chai");
const getPort = require('get-port');
const Chance = require('chance');
const chance = new Chance();
const { JSONSerializer } = require('multi-rpc-json-serializer');
const { WebSocketTransport } = require("../lib");
const request = require('request-promise-native');

const { 
    Request
} = require("multi-rpc-common");

describe("WebSocketTransport", function () {
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