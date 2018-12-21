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

    const result1 = await client.invoke("foo", [1,2,3]);
    const result2 = await client.invoke("foo", {
        arg1: 1,
        arg2: 2,
        arg3: 3
    });

    console.log(result1 + result2);

    process.exit();
})();
```

More examples are available [in the wiki](https://github.com/znetstar/multi-rpc/wiki).

## Projects layout

The Multi-RPC package is comprised of several modules which can be installed individually.

| Name                                                                                                               | Description                                            | Browser compatible |
|--------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------|--------------------|
| [multi-browser](https://github.com/znetstar/multi-rpc-browser)                                                     | Excludes server-side transports                        | ✓                  |
| [multi-rpc-common](https://github.com/znetstar/multi-rpc-common)                                                   | Common classes used throughout the project.            | ✓                  |
| [multi-rpc-core](https://github.com/znetstar/multi-rpc-core)                                                       | Server/Client implementation                           | ✓                  |
| [multi-rpc-http-client-side-transport](https://github.com/znetstar/multi-rpc-http-client-side-transport)                     | A HTTP client-side transport                           | ✓                  |
| [multi-rpc-http-transport](https://github.com/znetstar/multi-rpc-http-transport)                                   | A HTTP transport with client/server functionality      |                    |
| [multi-rpc-json-serializer](https://github.com/znetstar/multi-rpc-json-serializer)                                 | A JSON serializer                                      | ✓                  |
| [multi-rpc-msgpack-serializer](https://github.com/znetstar/multi-rpc-msgpack-serializer)                           | A MSGPack Serializer                                   | ✓                  |
| [multi-rpc-tcp-transport](https://github.com/znetstar/multi-rpc-tcp-transport)                                     | A TCP transport with client/server functionality       |                    |
| [multi-rpc-websocket-client-side-transport](https://github.com/znetstar/multi-rpc-websocket-client-side-transport) | A WebSocket client-side transport                      | ✓                  |
| [multi-rpc-websocket-transport](https://github.com/znetstar/multi-rpc-websocket-transport)                         | A WebSocket transport with client/server functionality |                    |

## Tests & Documentation

For mocha tests and documention refer to the individual package (e.g. multi-rpc-common).

## Building

Multi-RPC is written in TypeScript. To compile JavaScript run `npm run build`.