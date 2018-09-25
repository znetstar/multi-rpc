const http = require("http");
const { assert } = require("chai");
const getPort = require('get-port');
const Chance = require('chance');
const chance = new Chance();
const request = require("request-promise-native");

const { 
    HTTPTransport,
    JSONSerializer,
    Request,
    Response,
    Notification
} = require("../../lib");

describe("HTTPTransport", function () {
    describe("#send(message: Message)", function () {
        it("Should successfully send a message to a HTTP server", function (done) {
            (async () => {
                const serializer = new JSONSerializer();
                const port = await getPort();
                const transport = new HTTPTransport(serializer, `http://127.0.0.1:${port}`);

                const httpServer = http.createServer(() => { 
                    done();
                 });

                httpServer.listen(port);

                await transport.send(new Notification(chance.string()));
            })();
        });
    });

    describe("#listen()", async function () {
        it("Should begin listening on a given port", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const transport = new HTTPTransport(serializer, port);

            await transport.listen();
            
            await request({
                url: `http://127.0.0.1:${port}`
            });
        });

        it("Should begin listening on an existing server", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const server = new (http.Server)();
            server.listen(port);
            const transport = new HTTPTransport(serializer, server);

            await transport.listen();

            await request({
                url: `http://127.0.0.1:${port}`
            });
        });
    });

    describe("#receive()", async function () {
        it("Should parse a valid JSON-RPC request", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const transport = new HTTPTransport(serializer, port);

            const p = new Promise((resolve, reject) => {
                transport.once("request", (req) => {
                    assert.ok(req);
                    assert.instanceOf(req, Request);
                    transport.close();
                    resolve();
                });
            });

            await transport.listen();

            request({
                url: `http://127.0.0.1:${port}`,
                json: {
                    jsonrpc: "2.0",
                    method: chance.string(),
                    id: chance.integer()
                }
            }).catch(() => {})
            
            return p;
        });
    });

    describe("close()", function () {
        it("Should close the underlying HTTP Servers", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const transport = new HTTPTransport(serializer, port);
        
            await transport.listen();
            await transport.close();
            let fn = () => {};
            try {
                const x = await request({
                    url: `http://127.0.0.1:${port}`
                });
                console.log(x)
            } catch (error) {
                fn = () => { throw error; };
            } finally {
                assert.throws(fn);
            }
        });

        it("Should close the underlying HTTP Server but not the HTTP Server if an HTTP Server was provided.", async function () {
            const serializer = new JSONSerializer();
            const port = await getPort();
            const srv = new (http.Server)((req, res) => {
                res.writeHead(200);
                res.end();
            });

            srv.listen(port);
            const transport = new HTTPTransport(serializer, srv);
        
            await transport.listen();
            
            let fn = () => {};
            try {
                await request({
                    url: `http://127.0.0.1:${port}`
                });
            } catch (err) {
                fn = () => { throw err; };
            } finally {
                assert.doesNotThrow(fn);
            }
        });
    });
});