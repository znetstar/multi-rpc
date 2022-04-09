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
const {
  RPCProxyManager
} = require('../lib/RPCProxyManager');

const { Client } = require("../lib");

describe("RPCProxyManager", function () {
  describe("#createProxy", function (done) {
    it('should call the underlying rpc client method with the arguments provided', async function () {
      const server = new Server();
      const port = await getPort();
      const result = chance.string();
      const method = chance.string();
      const arg  = chance.string();
      const serializer = new JSONSerializer();
      server.on("connection", (connection) => {
        connection.on("data", (data) => {
          const msg = serializer.deserialize(data.toString());
          assert.instanceOf(msg, Request);

          assert.equal(msg.method, method);
          assert.deepEqual(msg.params, [ arg ]);

          connection.end(JSON.stringify({ id: msg.id, result, jsonrpc: "2.0" }));
          server.close();
        });
      });

      server.listen(port);

      const transport = new TCPTransport(serializer, port);
      const client = new Client(transport);
      const rpc = (new RPCProxyManager(client)).createProxy();
      const resp = await rpc[method](arg);
      assert.equal(result, resp);
    });
  });

});
