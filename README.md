# multi-rpc

[![NPM](https://nodei.co/npm/multi-rpc.png)](https://nodei.co/npm/multi-rpc/)

[![Build Status](https://travis-ci.org/znetstar/multi-rpc.svg?branch=master)](https://travis-ci.org/znetstar/multi-rpc) [![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fznetstar%2Fmulti-rpc.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fznetstar%2Fmulti-rpc?ref=badge_shield)

Multi-RPC is a [JSON RPC 2](https://www.jsonrpc.org/specification) client/server implementation designed with multiple transports and serialization methods in mind. It works both in Node and the browser.

Out of the box it supports serialization with JSON and MessagePack over TCP and WebSocket. Writing new serializers and transports is pretty straightforward.

A server can listen on multiple transports which allows for listening using multiple protcols or on multiple interfaces.

Connections via persistent transports like WebSocket or TCP are kept alive and the server can send notifications to clients (a feature which is not offically in the standard). 

# Example

