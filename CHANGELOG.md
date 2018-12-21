# Changelog

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