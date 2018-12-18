const Chance = require('chance');
const { assert } = require('chai');
const { 
    Serializer, 
    InvalidRequest,
    Request,
    Notification,
    Response
} = require("../lib");

const chance = new Chance();

describe("Serializer", function () {
    describe("#deserialize(object: any, batch: boolean): Message", function () {
        describe("batch", function () {
            it("Must return an array of Message objects in the order they were sent", function () {
                const serializer = new Serializer();
                const req = [
                    { id: chance.integer(), method: chance.string(), jsonrpc: "2.0" }, // Request
                    { method: chance.string(), "jsonrpc": "2.0" } // Notification
                ];

                const resp = serializer.deserialize(req, true);
                assert.isArray(resp);
                assert.equal(req.length, resp.length);
                assert.instanceOf(resp[0], Request, "The first element in the response was not a Request");
                assert.instanceOf(resp[1], Notification, "The second element in the response was not a Notification");
            });

            it("Must throw InvalidRequest if a message other than a Notification or Request is in the batch", function () {
                const serializer = new Serializer();
                const req = [
                    { id: chance.integer(), method: chance.string(), jsonrpc: "2.0" }, // Request
                    { id: chance.integer(), result: chance.string(), "jsonrpc": "2.0" } // Notification
                ];
                
                assert.throws(() => { serializer.deserialize(req, true); }, InvalidRequest);
            });
        });

        describe(":Request", function () {
            it(`Must not accept a message without the "jsonrpc" field`, function () {
                const serializer = new Serializer();
                const request = {
                    id: chance.string(),
                    method: chance.string()
                };
    
                assert.throws(serializer.deserialize.bind(serializer, request, false), InvalidRequest);
            });
    
            it(`A Request object must only contain the "id", "method", "params" and "jsonrpc" fields`, function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    id: chance.string(),
                    method: chance.string(),
                    foo: "bar"
                }; 
                assert.throws(serializer.deserialize.bind(serializer, request, false), InvalidRequest);
            });

            it(`The ID field must be a string, number or "null"`, function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    id: chance.bool(),
                    method: chance.string()
                }; 
                assert.throws(serializer.deserialize.bind(serializer, request, false), InvalidRequest);
            });

            it(`The method field must be a string`, function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    id: chance.bool(),
                    method: chance.integer()
                }; 
                assert.throws(serializer.deserialize.bind(serializer, request, false), InvalidRequest);
            });

            it(`The params field must be an Array or an Object`, function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    method: chance.string(),
                    id: chance.integer(),
                    params: chance.bool()
                }; 
                assert.throws(serializer.deserialize.bind(serializer, request, false), InvalidRequest);
            });

            it("Must return a Request object", function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    id: chance.integer(),
                    method: chance.string()
                }; 

                assert.instanceOf(serializer.deserialize(request, false), Request);
            });
        });

        describe(":Notification", function () {
            it(`Must not accept a message without the "jsonrpc" field`, function () {
                const serializer = new Serializer();
                const request = {
                    id: chance.string(),
                    method: chance.string()
                };
    
                assert.throws(serializer.deserialize.bind(serializer, request, false), InvalidRequest);
            });

            it(`The method field must be a string`, function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    method: chance.integer()
                }; 
                assert.throws(serializer.deserialize.bind(serializer, request, false), InvalidRequest);
            });

            it(`The params field must be an Array or an Object`, function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    method: chance.string(),
                    params: chance.bool()
                }; 
                assert.throws(serializer.deserialize.bind(serializer, request, false), InvalidRequest);
            });

            it("Must return a Notification object", function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    method: chance.string()
                }; 

                assert.instanceOf(serializer.deserialize(request, false), Notification);
            });
        });

        describe(":Response", function () {
            it(`Must not accept a message without the "jsonrpc" field`, function () {
                const serializer = new Serializer();
                const request = {
                    id: chance.string(),
                    method: chance.string()
                };
    
                assert.throws(serializer.deserialize.bind(serializer, request, false), InvalidRequest);
            });

            it("Must not be able to set both result and an error", function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    id: chance.integer(),
                    result: { foo: chance.bool() },
                    error: { code: chance.integer(), message: chance.string(), data: chance.bool() }
                };

                assert.throws(serializer.deserialize.bind(serializer, request, false), InvalidRequest);
            });   

            it("Must throw if error contains invalid fields", function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    id: chance.integer(),
                    error: { code: chance.integer(), message: chance.string(), data: chance.bool(), foo: chance.string() }
                };

                assert.throws(serializer.deserialize.bind(serializer, request, false), InvalidRequest);
            }); 

            it("Must throw if error does not contain code", function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    id: chance.integer(),
                    error: { message: chance.string(), data: chance.bool() }
                };

                assert.throws(serializer.deserialize.bind(serializer, request, false), InvalidRequest);
            }); 
    

            it("Must throw if the code field on an error is not an integer", function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    id: chance.integer(),
                    error: { code: chance.floating(), message: chance.string(), data: chance.bool() }
                };

                assert.throws(serializer.deserialize.bind(serializer, request, false), InvalidRequest);
            }); 

            it("Must throw if the message field on an error is not a string", function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    id: chance.integer(),
                    error: { code: chance.integer(), message: chance.bool(), data: chance.bool() }
                };

                assert.throws(serializer.deserialize.bind(serializer, request, false), InvalidRequest);
            }); 

            it("Must throw if the error does not contain a message field", function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    id: chance.integer(),
                    error: { code: chance.integer(), data: chance.bool() }
                };

                assert.throws(serializer.deserialize.bind(serializer, request, false), InvalidRequest);
            }); 

            it("Must return a Response object with the error field set", function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    id: chance.integer(),
                    error: { code: chance.integer(), data: chance.bool(), message: chance.string() }
                }; 
                
                const response = serializer.deserialize(request, false);
                assert.instanceOf(response, Response);
                assert.ok(response.error);
                assert.notOk(response.result);
            });     

            it("Must return a Response object with the result field set", function () {
                const serializer = new Serializer();
                const request = {
                    jsonrpc: "2.0",
                    id: chance.integer(),
                    result: [ chance.integer() ]
                }; 
                
                const response = serializer.deserialize(request, false);
                assert.instanceOf(response, Response);
                assert.ok(response.result);
                assert.notOk(response.error);
            });          
        });
    });
});