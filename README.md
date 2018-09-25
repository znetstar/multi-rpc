# multi-rpc

[![NPM](https://nodei.co/npm/multi-rpc.png)](https://nodei.co/npm/multi-rpc/)

[![Build Status](https://travis-ci.org/znetstar/multi-rpc.svg?branch=master)](https://travis-ci.org/znetstar/multi-rpc) [![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fznetstar%2Fmulti-rpc.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fznetstar%2Fmulti-rpc?ref=badge_shield)

Multi-RPC is a [JSON RPC 2](https://www.jsonrpc.org/specification) client/server implementation designed with multiple transports and serialization methods in mind. It works both in Node and the browser.

Out of the box it supports serialization with JSON and MessagePack over TCP, HTTP and WebSocket. Writing new serializers and transports is pretty straightforward.

A server can listen on multiple transports which allows for listening using multiple protcols or on multiple interfaces.

Connections via persistent transports like WebSocket or TCP are kept alive and the server can send notifications to clients (a feature which is not offically in the standard). 

## Example

```
(async () => {
    const { 
        Server, 
        Client,
        JSONSerializer,
        TCPTransport
    } = require('multi-rpc');

    const serializer = new JSONSerializer();

    const serverTransport = new TCPTransport(serializer, 1234);
    const clientTransport = new TCPTransport(serializer, 1234);

    const server = new Server(serverTransport);
    const client = new Client(clientTransport);

    server.methods.foo = (arg1, arg2, arg3) => {
        console.log(arg1, arg2, arg3);
        return arg1 + arg2 + arg3;
    };

    server.listen();

    const result = await client.invoke("foo", [1,2,3]);
    const result = await client.invoke("foo", {
        arg1: 1,
        arg2: 2,
        arg3: 3
    });

    console.log(result + result);

    process.exit();
})();
```

More examples are available [in the wiki](https://github.com/znetstar/multi-rpc/wiki).

## Building

Multi-RPC is written in TypeScript. To compile JavaScript run `npm run build`.

## Documentation

Documentation is available in the `docs/` folder or [online here](https://multi-rpc.docs.zacharyboyd.nyc).

To generate docs run `npm run docs`.

## Tests

Tests are written in Mocha and can be run with `npm test`.