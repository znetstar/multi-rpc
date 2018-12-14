# Changelog

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