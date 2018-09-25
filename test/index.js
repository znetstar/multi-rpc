describe("multi-rpc", function () {
    require("./Serializer");
    describe("Serializers", function () {
        require("./Serializers/JSONSerializer");
        require("./Serializers/MsgPackSerializer");
    });
    require("./Transport");
    require("./PersistentTransport");
    describe("Transports", function () {
        require("./Transports/HTTPTransport");
        require("./Transports/TCPTransport");
        require("./Transports/WebSocketTransport");
    });
    require("./Client");
    require("./Server");
    require("./Error");
});