# Changelog

## [2.5.0] - 2022-02-02
### Adds
- JSON5 as a serialization/deserialization method via `@znetstar/encode-tools@1.4.0`

## [2.1.0] - 2021-12-23
### Changes
- Upgrades multi-rpc-common

## [1.9.0] - 2021-11-12
### Changes
- Upgrades multi-rpc-common

## [1.8.2] - 2021-09-13
### Changes
- Upgrades multi-rpc-core

## [1.8.1] - 2021-09-13
### Changes
- Upgrades multi-rpc-core

## [1.8.0] - 2021-09-13
### Changes
- Upgrades multi-rpc-core

## [1.7.7] - 2021-08-29
### Changes
- Upgrades multi-rpc-common

## [1.7.6] - 2021-08-23
### Changes
- UUpgrades multi-rpc-common

## [1.7.3] - 2021-07-20
### Changes
- UUpgrades multi-rpc-common

## [1.7.1] - 2021-07-20
### Changes
- Adds a new serializer based on `@etomon/encode-tools`.
- Upgrades most packages.

## [1.5.6] - 2019-01-16
### Changed
- Updates multi-rpc-core.

## [1.5.5] - 2019-01-15
### Changed
- Updates tcp transport.

## [1.5.4] - 2019-01-03
### Changed
- Updates websocket transport.

## [1.5.3] - 2019-01-02
### Changed
- Updates multi-rpc-common.

## [1.5.1] - 2018-12-24
### Changed
- Fixes a bug with reconnection.

## [1.4.1] - 2018-12-24
### Changed
- Update websocket transport.

## [1.4.0] - 2018-12-23
### Added
- WebSocket and TCP clients attempt to reconnect to server upon disconnect.

## [1.3.0] - 2018-12-23
### Added
- WebSocket and TCP clients attempt to reconnect to server upon disconnect.

## [1.2.5] - 2018-12-22
### Changed
- Updates multi-rpc-common.

## [1.2.4] - 2018-12-22
### Changed
- Update websocket transport.

## [1.2.3] - 2018-12-21
### Changed
- Fixes serveral bugs that occur when the message response is undefined.

## [1.2.2] - 2018-12-21
### Changed
- Adds `ServerSideTransport` interface.

## [1.2.1] - 2018-12-21
### Changed
- Breaks the project up into separate modules.

## [1.1.9] - 2018-12-16
### Changed
- Removes callback from the `sendConnection` function on `WebSocketTransport`. 

## [1.1.8] - 2018-12-16
### Added
- Adds a proper return type to the client-side `invoke` function.

## [1.1.7] - 2018-12-15
### Added
- Adds serialization function to messages and errors.

## [1.1.2] - 2018-12-15
### Changes
- Non-object errors are passed directly to the consturctor of `InternalError`.

## [1.1.1] - 2018-12-14
### Added
- Returns HTTP 204 when a notification is sent over HTTP.

## [1.1.0] - 2018-09-26
### Added
- Can now set all rpc methods by passing an object with function values to `Server.methods` or any child properties (e.g. `Server.methods.foo = { bar: () => {} };`).

## [1.0.5] - 2018-09-25
### Changed
- Adds missing dependency.

## [1.0.4] - 2018-09-25
### Changed
- Bug fixes.

## [1.0.3] - 2018-09-25
### Changed
- Bug fixes.

### Added
- Will not return errors as the "innerError" field of "data" in the "error" objects.

## [1.0.1] - 2018-09-24
### Added
- Transports can be added/removed from the server dynamically.

## [1.0.0] - 2018-09-24
### Added
- Inital release. Includes TCP, HTTP and WebSocket transports, and JSON and MessagePack serializers. 
