
# Changelog

## [3.1.0] - 2021-12-12
### Changes
- Replaces `@eto
- mon/encode-tools` with `@znetstar/encode-tools` for better browser support.

## [3.0.0] - 2021-12-12
### Added
- Upgrades `@etomon/enoode-tools`


## [2.5.0] - 2021-11-12
### Added
- A `Serializer` instance can be passed in the `ClientRequest` to override the `Transport`'s `Serializer`.

## [2.4.0] - 2021-08-23
### Added
- Uses a `Symbol` to determine the constructor for the various `Message` and `Transport` classes,  because `instanceof` often fails if there are differing `multi-rpc-common` packages in the module path.


## [2.4.0] - 2021-08-23
### Added
- Uses a `Symbol` to determine the constructor for the various `Message` and `Transport` classes,  because `instanceof` often fails if there are differing `multi-rpc-common` packages in the module path.

## [2.3.2] - 2021-07-20
### Added
- Fixes an issue with `Message.serialize` not being called.


## [2.3.0] - 2021-07-20
### Added
- Uses `@etomon/encode-tools` for serializing messages, which enables the usage of `cbor` and `bson` serialization formats, in addition to the existing `msgpack` and `json`.

## [2.2.6] - 2019-01-02
### Added
- Adds missing event listener.

## [2.2.5] - 2019-01-02
### Added
- Merges ReconnectInterface into PersistentTransport.

## [2.2.2] - 2019-01-02
### Added
- Reconnect interface now has a property which can be used to turn off/on reconnection.

## [2.2.0] - 2019-01-02
### Added
- Adds an interface for a transport that reconnects to the server automatically.

## [2.1.0] - 2018-12-22
### Added
- Errors are now deserialized to the appropriate type (e.g. error with code -32603 becomes an internal error). 

## [2.0.1] - 2018-12-20
### Added
- Adds close function to PersistentTransport.

## [2.0.0] - 2018-12-20
### Changes
- Corrects spelling.

## [1.0.8] - 2018-12-20
### Changes
- Adds errors from PersistentTransport.

## [1.0.5] - 2018-12-20
### Changes
- Fixes a bug in ServerSideTransport.

## [1.0.4] - 2018-12-19
### Changes
- Moves server-side transport logic to seperate interface.

## [1.0.3] - 2018-12-19
### Added
- Adds Persistent transport

## [1.0.2] - 2018-12-18
### Added
- Adds tests

## [1.0.1] - 2018-12-17
### Added
- Add ClientRequest Transport and Serializer

## [1.0.0] - 2018-12-17
### Added
- Inital release.
