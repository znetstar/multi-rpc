const http = require("http");
const { assert } = require("chai");
const getPort = require('get-port');
const Chance = require('chance');
const chance = new Chance();
const { JSONSerializer } = require('./JSONSerializer');
const { HTTPClientTransport } = require("../lib");
const { 
    Request,
    Notification
} = require("multi-rpc-common");


describe("HTTPTransport", function () {
    describe("#send(message: Message)", function () {
        it("Should successfully send a message to a HTTP server", function (done) {
            (async () => {
                const serializer = new JSONSerializer();
                const port = await getPort();
                const transport = new HTTPClientTransport(serializer, `http://127.0.0.1:${port}`);

                const httpServer = http.createServer(() => { 
                    done();
                 });

                httpServer.listen(port);

                await transport.send(new Notification(chance.string()));
            })();
        });
    });
});