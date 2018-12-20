const { Server, Socket } = require("net");
const { assert } = require("chai");
const getPort = require('get-port');
const Chance = require('chance');
const chance = new Chance();

const { TCPTransport } = require("../lib");

const {
    TransportInServerState,
    Notification,
    Request
} = require("multi-rpc-common");

const { JSONSerializer } = require("multi-rpc-json-serializer");

function randomPort() { return chance.integer({ min: 1024, max: 65535 }) }

describe("TCPTransport", function () {
    describe("#connect()", function () {
        it("Should throw TransportInServerState if the Transport is already in a server state", async function () {
            const serializer = new JSONSerializer();
            const port = randomPort();
            const transport = new TCPTransport(serializer, port);
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

        it("Should throw ECONNREFUSED if the connection details do not exist", async function () {
            const serializer = new JSONSerializer();
            const port = randomPort();
            const transport = new TCPTransport(serializer, port);

            let fn = () => {};
            try {
                await transport.connect();
            } catch (error) {
                fn = () => { throw error };
            } finally {
                assert.throws(fn, /ECONNREFUSED/g);
            }
        });

        it("Should successfully connect to a TCP server", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const transport = new TCPTransport(serializer, port);

            const p = new Promise((resolve, reject) => {
                const server = new Server((socket) => {
                    socket.on("data", () => {
                        resolve();
                    });

                    socket.on("error", (err) => {
                        reject(err);
                    });
                });

                server.listen(port, "127.0.0.1");
            });

            await transport.connect();
            transport.connection.write(chance.string());

            return p;
        });
    });

    describe("#sendConnection(connection: Socket, message: Message)", function () {
        it("Should successfully send a message to a TCP server using the provided socket", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const transport = new TCPTransport(serializer, randomPort());


            let socket = new Socket();

            const p = new Promise((resolve, reject) => {
                socket.on("error", reject);
                const server = new Server((socket) => {
                    socket.on("data", (data) => {
                        const msg = serializer.deserialize(new Uint8Array(data));
                        assert.instanceOf(msg, Notification);
                        resolve();
                    });

                    socket.on("error", (err) => {
                        reject(err);
                    });
                });

                server.listen(port, "127.0.0.1");
            });
            
            socket.connect(port);
            await transport.sendConnection(socket, new Notification(chance.string()));

            return p;
        });
    });

    describe("#send(message: Message)", function () {
        it("Should successfully send a message to a TCP server", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const transport = new TCPTransport(serializer, port);

            const p = new Promise((resolve, reject) => {
                const server = new Server((socket) => {
                    socket.on("data", (data) => {
                        const msg = serializer.deserialize(new Uint8Array(data));
                        assert.instanceOf(msg, Notification);
                        resolve();
                    });

                    socket.on("error", (err) => {
                        reject(err);
                    });
                });

                server.listen(port, "127.0.0.1");
            });

            await transport.send(new Notification(chance.string()));

            return p;
        });
    });

    describe("#listen()", async function () {
        it("Should begin listening on a given port", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const transport = new TCPTransport(serializer, port);

            await transport.listen();

            let socket = new Socket();
            const p = new Promise((resolve, reject) => {
                socket.on("error", (error) => {
                    reject();
                });
                socket.on("connect", () => {
                    resolve();
                });
            });
            socket.connect(port);
            return p;
        });

        it("Should begin listening on an existing server", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const server = new Server();
            server.listen(port);
            
            let socket = new Socket();
            const p = new Promise((resolve, reject) => {
                socket.on("error", (error) => {
                    reject();
                });
                socket.on("connect", () => {
                    resolve();
                });
            });
            socket.connect(port);
            return p;
        });
    });


    describe("#receive()", async function () {
        it("Should parse a valid JSON-RPC request", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const transport = new TCPTransport(serializer, port);

            const p = new Promise((resolve, reject) => {
                transport.once("request", (req) => {
                    assert.ok(req);
                    assert.instanceOf(req, Request);
                    transport.close();
                    resolve();
                });
            });

            await transport.listen();

            const sock = new Socket();
            sock.on("connect", () => {
                sock.write(JSON.stringify({ id: chance.integer(), method: chance.string(), jsonrpc: "2.0" }));
            });
            
            sock.connect(port);

            return p;
        });
    });
    // this test does not work in travis
    // describe("close()", function () {
    //     this.timeout(5000);
    //     it("Should close the underlying TCP Server", async function () {
    //         const serializer = new JSONSerializer();
    //         const port = await getPort();
    //         const transport = new TCPTransport(serializer, port);
        
    //         await transport.listen();
        
    //         let socket = new Socket();
    //         const p = new Promise((resolve, reject) => {
    //             socket.on("error", () => {
    //                 resolve();
    //             });
                
    //             socket.on("close", () => {
    //                 resolve();
    //             });

    //             socket.on("connect", () => {
    //                 transport.close();
    //             })
    //         });
            
    //         socket.connect(port);
    //         return p;
    //     });
    // });
});
