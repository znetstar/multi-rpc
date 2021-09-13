# Changelog

## [1.3.0] - 2021-09-13
### Added 
- Adds a `RPCProxyManager` object, which wraps `Client.invoke` as a ES6 `Proxy` so `client.invoke('foo', 1234)` can become `proxy.foo(1234)`.

## [1.2.0] - 2021-07-20
### Changes
- Makes `multi-rcp-common` a peer-dependency
- Fixes issues with the named params parser

## [1.0.4] - 2019-01-16
### Changes
- Removes error thrown if transport isn't persistent.

## [1.0.3] - 2019-01-02
### Changes
- Updates multi-rpc-common

## [1.0.2] - 2019-01-02
### Changes
- Makes transport public

## [1.0.1] - 2018-12-22
### Changes
- Updates multi-rpc-common

## [1.0.0] - 2018-12-20
### Added
- Inital release.
