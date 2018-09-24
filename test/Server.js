const { Socket } = require("net");
const { assert } = require("chai");
const Chance = require('chance');
const chance = new Chance();
const getPort = require("get-port");

const { getFunctionArguments, matchNamedArguments } = require("../lib/Server");

const { 
    Server,
    InvalidParams,
    Transport,
    JSONSerializer,
    ValueIsNotAFunction,
    Notification,
    Request,
    Response,
    RPCError,
    ClientRequest,
    Client,
    TCPTransport
} = require("../lib");


describe("getFunctionArgumentNames(fn: Function)", function () {
    it("Should return the arguments in a function", function() {
        const fn = (foo, bar, baz) => {};
        assert.deepEqual([ "foo", "bar", "baz" ], getFunctionArguments(fn));
    });
});

describe("getFunctionArgumentNames", function () {
    it("Should return an array with arguments matched in the order they occur in the function signature", function() {
        const fn = (foo, bar, baz) => {};
        const namedArgs = { bar: chance.integer(), baz: chance.bool(), foo: chance.string()  };
        const args = matchNamedArguments(namedArgs, fn);
        assert.deepEqual([ namedArgs.foo, namedArgs.bar, namedArgs.baz ], args);
    });

    it("Should throw InvalidParams if the arguments provided in the object do not exist in the function", function() {
        const fn = (foo, bar) => {};
        const namedArgs = { baz: chance.bool(), foo: chance.string()  };

        assert.throws(() => { matchNamedArguments(namedArgs, fn); }, InvalidParams);
    });
});

describe("Server", function () {
    describe("#methods", function () {
        describe("#set(host, prop, value)", function () {
            it("Should set a property the target object", function () {
                const methodHost = {};
                const methodName = chance.string();
                const methodValue = () => {};

                const srv = new Server(new Transport(new JSONSerializer()));
                srv.methods[methodName] = methodValue;

                assert.equal(srv.methodHost[methodName], methodValue);
            });

            it("Should set a property the target object expanding dot-notation", function () {
                const methodNameSteps = [ chance.string(), chance.string(), chance.string() ];
                const methodValue = () => {};
                const methodName = methodNameSteps.join(".");

                const srv = new Server(new Transport(new JSONSerializer()));
                srv.methods[methodName] = methodValue;

                const obj = {};
                obj[methodNameSteps[1]] = {};
                obj[methodNameSteps[1]][methodNameSteps[2]] = methodValue;

                assert.deepEqual(obj, srv.methodHost[methodNameSteps[0]]);
            });

            it("Should throw if the value provided is not a function", function () {
                const srv = new Server(new Transport(new JSONSerializer()));
                assert.throws(() => { srv.methods[chance.string()] = chance.string(); }, ValueIsNotAFunction);
            });
        });

        describe("#get(host, prop)", function () {
            it("Should retrieve a method", function () {
                const srv = new Server(new Transport(new JSONSerializer()));
                const methodName = chance.string();
                srv.methodHost[methodName] = () => {};
                assert.equal("function", typeof(srv.methods[methodName])); 
            });

            it("Should expand dot-notation in retrieving", function () {
                const srv = new Server(new Transport(new JSONSerializer()));
                const methodName = chance.string();
                const objName = chance.string();
                const obj = {};
                obj[methodName] = () => {};
                srv.methodHost[objName] = obj;
                assert.equal("function", typeof(srv.methods[`${objName}.${methodName}`]));                
            });
        });

        describe("#has(host, prop)", function () {
            it("Should validate a method exists in the host", function () {
                const srv = new Server(new Transport(new JSONSerializer()));
                const methodName = chance.string();
                srv.methodHost[methodName] = () => {};
                assert.isOk(( methodName in srv.methods ));
            });

            it("Should expand dot-notation in validating the method exists on the host", function () {
                const srv = new Server(new Transport(new JSONSerializer()));
                const methodName = chance.string();
                const objName = chance.string();
                const obj = {};
                obj[methodName] = () => {};
                srv.methodHost[objName] = obj;

                assert.isOk(( `${objName}.${methodName}` in srv.methods ));            
            });            
        });
    });

    describe("#clientsByTransport", function () {
         
            const transportA = new Transport(new JSONSerializer());
            const transportB = new Transport(new JSONSerializer());

            const conA = chance.guid();
            const conB = chance.guid();

            const relationship = {};
            relationship[conA] = transportA;
            relationship[conB] = transportB;

            const srv = new Server([ transportA, transportB ]);
            transportA.connections = new Map([
                [ conA, chance.string() ]
            ]);
            transportB.connections = new Map([
                [ conB, chance.string() ]
            ]);

            for (const [ id, transport ] of srv.clientsByTransport.entries()) {
                assert.equal(relationship[id], transport);
            }
    });

    describe("#batch(messages: Array<Request|Notification>, clientRequest: ClientRequest)", async function () {
        it("Should execute requests sequentially", async function () {
            let i = "";
            const methods = {
                add: (x) => {
                    i = i + x;
                    return i;
                }
            };
            const srv = new Server(new Transport(new JSONSerializer()), methods);

            const str1 = chance.string();
            const str2 = chance.string();
            const str3 = chance.string();

            const reqs = [
                new Request(chance.integer(), "add", [ str1 ]),
                new Request(chance.integer(), "add", [ str2 ]),
                new Request(chance.integer(), "add", [ str3 ]),
            ];

           
            return new Promise((resolve, reject) => {
                const clientReq = new ClientRequest(chance.guid(), (resp) => {
                    assert.isArray(resp);
                    assert.isTrue(resp.every((r) => r instanceof Response));
                    assert.isTrue(resp.every((r) => typeof(r.error) === 'undefined'));
                    assert.deepEqual([str1, str2, str3].join(''), i, "Requests were not executed sequentially or at all");
                    if (resp.error) return reject();
                    resolve();
                });

                srv.batch(reqs, clientReq).catch(reject);
            });
        });

        it("Should return errors if a request is unsuccessful", async function () {
            const methods = {
                foo: () => {}
            };
            const srv = new Server(new Transport(new JSONSerializer()), methods);

            const reqs = [
                new Request(chance.integer(), "foo", [  ]),
                new Request(chance.integer(), "bar", [  ]),
                new Request(chance.integer(), "foo", [  ]),
            ];

           
            return new Promise((resolve, reject) => {
                const clientReq = new ClientRequest(chance.guid(), (resp) => {
                    assert.instanceOf(resp[1].error, RPCError);
                    resolve();
                });

                srv.batch(reqs, clientReq).catch(reject);
            });
        });

        it("Notifications should send back nothing", async function () {
            const methods = {
                foo: () => {}
            };
            const srv = new Server(new Transport(new JSONSerializer()), methods);
            const note = new Notification("foo");
            const reqs = [ 
                new Request(chance.integer(), "foo", [  ]),
                note,
                new Request(chance.integer(), "foo", [  ]),
            ];

           
            return new Promise((resolve, reject) => {
                const clientReq = new ClientRequest(chance.guid(), (resp) => {
                    assert.equal(resp.length, 2);
                    resolve();
                });

                srv.batch(reqs, clientReq).catch(reject);
            });
        });
    });

    describe("#invoke(request: Request, clientRequest: ClientRequest)", function () {
        it("Should successfully invoke a function on the server", function () {
            const data = chance.string();
            const methods = {
                foo: () => {
                    return data;
                }
            };

            const srv = new Server(new Transport(new JSONSerializer()), methods);
            const req = new Request(chance.integer(), "foo");
        
            return new Promise((resolve, reject) => {
                const clientReq = new ClientRequest(chance.guid(), (resp) => {
                    assert.equal(resp.result, data);
                    resolve();
                });

                srv.invoke(req, clientReq).catch(reject);
            });    
        });  

        it("Should successfully invoke a function on the server with params", function () {
            const methods = {
                echo: (what) => {
                    return what;
                }
            };

            const data = chance.string();
            const srv = new Server(new Transport(new JSONSerializer()), methods);
            const req = new Request(chance.integer(), "echo", [ data ]);
        
            return new Promise((resolve, reject) => {
                const clientReq = new ClientRequest(chance.guid(), (resp) => {
                    assert.equal(resp.result, data);
                    resolve();
                });

                srv.invoke(req, clientReq).catch(reject);
            });    
        }); 

        it("Should successfully invoke a function on the server with named params", function () {
            const methods = {
                echo: (foo, bar, baz, what) => {
                    return what;
                }
            };

            const data = chance.string();
            const srv = new Server(new Transport(new JSONSerializer()), methods);
            const req = new Request(chance.integer(), "echo", { what: data });
        
            return new Promise((resolve, reject) => {
                const clientReq = new ClientRequest(chance.guid(), (resp) => {
                    assert.equal(resp.result, data);
                    resolve();
                });

                srv.invoke(req, clientReq).catch(reject);
            });    
        }); 


        it("Should successfully return an error if the request is invalid", function () {
            const methods = {
                foo: () => {
                }
            };

            const srv = new Server(new Transport(new JSONSerializer()), methods);
            const req = new Request(chance.integer(), "bar");
        
            return new Promise((resolve, reject) => {
                const clientReq = new ClientRequest(chance.guid(), (resp) => {
                    assert.instanceOf(resp.error, RPCError);
                    resolve();
                });

                srv.invoke(req, clientReq).catch(reject);
            });    
        }); 
    });

    describe("notification(notification: Notification)", function () {
        it("Should emit the notification on the event emitter", function () {
            const data = chance.string();

            const srv = new Server(new Transport(new JSONSerializer()), {});
            const req = new Request(chance.integer(), "foo", [ data ]);
        
            return new Promise((resolve, reject) => {
                srv.once("foo", (param) => {
                    assert.equal(param, data);
                    resolve();
                });

                srv.notification(req);
            });             
        });

        it("Should call the method on named in the notification", function () {
            const data = chance.string();

            return new Promise((resolve, reject) => {
                const methods = {
                    foo: (foo, bar, baz, what) => {
                        assert.equal(data, what);
                        resolve();
                    }
                };
    
                const srv = new Server(new Transport(new JSONSerializer()), methods);
                const req = new Request(chance.integer(), "foo", { what: data });
            
                srv.notification(req)
            });             
        });
    });

    describe("sendTo(id, notification: Notification)", function () {
        it("Should send a notification to the client by its ID", async function () {
            const port = await getPort();
            const srvTcpTransport = new TCPTransport(new JSONSerializer(), port);
            const clientTcpTransport = new TCPTransport(new JSONSerializer(), port); 

            const srv = new Server(srvTcpTransport, {});
            const client = new Client(clientTcpTransport);

            return new Promise(async (resolve, reject) => {
                client.once("foo", () => {
                    resolve();
                });
                try {
                    await srv.listen();
                    setImmediate(async () => {
                        await client.connect();
                        setImmediate(async (srv, client) => {
                            try {
                                const clientId = Array.from(srv.clientsByTransport.keys())[0];
                                const note = new Notification("foo");
                                await srv.sendTo(clientId, note);
                            } catch (err) {
                                reject(err);
                            } 
                        }, srv, client);
                    });
                } catch (err) {
                    reject(err);
                }
            });
        });

        it("Should send a notification to all clients", async function () {
            const port = await getPort();
            this.timeout(2000);
            const srvTcpTransport = new TCPTransport(new JSONSerializer(), port);
            const client1TcpTransport = new TCPTransport(new JSONSerializer(), port); 
            const client2TcpTransport = new TCPTransport(new JSONSerializer(), port); 

            const srv = new Server(srvTcpTransport, {});
            const client1 = new Client(client1TcpTransport);
            const client2 = new Client(client2TcpTransport);

            return new Promise(async (resolve, reject) => {
                let done = 0;
                client1.once("foo", () => {
                    if (++done === 2)
                        resolve();
                });

                client2.once("foo", () => {
                    if (++done === 2)
                        resolve();
                });

                await srv.listen();
                await client1.connect();
                await client2.connect(); 

                try {
                    setImmediate(async (srv) => {
                        try {
                            const note = new Notification("foo");
                            await srv.sendAll(note);
                        } catch (err) {
                            reject(err);
                        }
                    }, srv);
                } catch (err) {
                    reject(err);
                }
            });
        });
    });

    describe("close()", function () {
        it("Should close the underlying transports", async function () {
            const portA = await getPort();
            const portB = await getPort();

            const transportA = new TCPTransport(new JSONSerializer(), portA);
            const transportB = new TCPTransport(new JSONSerializer(), portB);

            const srv = new Server([ transportA, transportB ]);
            await srv.listen();
            await srv.close();

            let fn = () => {};
            try {
                await new Promise((resolve, reject) => {
                    const sock = new Socket();
                    sock.on("error", (err) => {
                        reject(err);
                    });
    
                    sock.on("connect", () => {
                        resolve();
                    });
    
                    sock.connect(portA);
                });
    
                await new Promise((resolve, reject) => {
                    const sock = new Socket();
                    sock.on("error", (err) => {
                        reject(err);
                    });
    
                    sock.on("connect", () => {
                        resolve();
                    });
    
                    sock.connect(portB);
                });
            } catch (err) {
                fn = () => { throw err; };
            } finally {
                assert.throws(fn);
            }
        })
    });
});