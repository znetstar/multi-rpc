# multi-jrpc

Multi-JRPC is a [JSON RPC 2.0](https://www.jsonrpc.org/specification) client/server implementation designed with multiple transports and multiple serialization methods in mind and works in Node and the browser.

Out of the box it supports serialization with JSON and MsgPack over TCP and WebSocket. Writing new serializers and transports is pretty straightforward.