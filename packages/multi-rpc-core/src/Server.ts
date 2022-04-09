
import { EventEmitter2 } from "eventemitter2";
const parseFn = require("parse-function");
import { parse as acornParse } from "acorn";
import * as _ from "lodash";
import { Transport, PersistentTransport, Request, Notification, Response, MethodNotFound, RPCError, InternalError, InvalidParams, ClientRequest, ServerSideTransport as IServerSideTransport } from "multi-rpc-common";
import { allowedFields } from "multi-rpc-common/lib/Serializer";
import {MethodExecutionContext, MethodExecutionContextOptions} from "./MethodExecutionContext";

type ServerSideTransport = Transport&IServerSideTransport;

/**
 * This error is thrown when an object with non-function values is set to a property on "methodHost"
 */
export class ValuesAreNotFunctions extends Error {
    constructor() {
        super("The value is a object that contains is values that are not functions");
    }
}

/**
 * This error is thrown when a non-function value is set to a property on "methodHost"
 */
export class ValueIsNotAFunction extends Error {
    constructor() {
        super("The value is not a function");
    }
}

/**
 * This error is thrown when "methods" is set to a value that isn't an object.
 */
export class ValueIsNotAnObject extends Error {
    constructor() {
        super("The methods property must be set to an object");
    }
}

/**
 * Gets the names of all the arguments in a function.
 * Adapted from https://bit.ly/2psjxwi
 * @param fn - The function to examine.
 * @ignore
 */
export function getFunctionArguments(fn: Function): string[] {
    return parseFn()
    .parse(fn, {
        parse: acornParse,
        ecmaVersion: 2017
    })
    .args;
}

/**
 * Returns an array with arguments in the order from the function signature from a map of arguments to values.
 * @param args - Map of arguments to values.
 * @param fn - Function to draw the signature from.
 * @throws {InvalidParams} - If any fields in the object provided are not arguments in the function provided.
 * @ignore
 * @example
 * let args = { foo: "bar", baz: "flob" };
 * let fn = (foo, baz) => {};
 *
 * matchNamedArguments(args, fn) === ["bar", "flob"];
 */
export function matchNamedArguments(args: any, fn: Function) {
    const argNames = getFunctionArguments(fn);

    if (!allowedFields(argNames, args))
        throw new InvalidParams();

    return argNames.map((argName) => args[argName]);
}

/**
 * Recursively iterates through all values in an object ensuring that they are functions.
 * @param object - Object to check.
 */
export function checkObjectForFunctionsOnly(object: any): boolean {
    for (const key in object) {
        const value = object[key];
        if (typeof(value) === 'object') {
            const val = checkObjectForFunctionsOnly(value);
            if (!val) return false;
        }
        else if (typeof(value) !== 'function')
            return false;
    }
    return true;
}

/**
 * An RPC server that will listen for clients.
 */
export default class Server extends EventEmitter2 {
    /**
     * Transports the server is currently listening on.
     */
    public transports: ServerSideTransport[];

    /**
     * This Proxy handler details how methods will be looked up when requested.
     * By methods can be referenced by dot-notation.
     *
     * @example
     * const myFunc = () => { ... };
     * new Server(transport, { foo: { bar: myFunc } })
     * (Server.methods["foo.bar"] === myFunc) === true
     */
    protected methodHandler: any = {
        set: (host: any, prop: any, value: any) =>  {
            if (typeof(value) === 'object') {
                if (!checkObjectForFunctionsOnly(value))
                    throw new ValuesAreNotFunctions();

                (<any>this.methodHost)[prop] = value;
            }

            else if (typeof(value) !== "function")
                throw new ValueIsNotAFunction();


            if (typeof(prop) === 'string') {
                let steps = prop.split('.');
                let target = host;
                for (let step of steps.slice(0, steps.length - 1)) {
                    target[step] = {};
                    target = target[step];
                }
                let lastStep = steps.slice(steps.length - 1)[0];
                target[lastStep] = value;
            } else {
                host[prop] = value;
            }
            return true;
        },
        get: (host: any, prop: any): Function => {
            if (typeof(prop) === 'string') {
                const steps = prop.split('.');
                let result = host;
                for (let step of steps) {
                    result = result[step];
                }

                return result;
            } else {
                return host[prop];
            }
        },
        has: (host: any, prop: any) => {
            if (typeof(prop) === 'string') {
                const steps = prop.split('.');
                let result = host;
                for (let step of steps) {
                    result = result[step];
                }

                return Boolean(result);
            } else {
                return Boolean(host[prop]);
            }
        }
    };

    /**
     * A Proxy that can be used to set/access the methods that clients can execute.
     *
     * @example
     *
     * Server.methods["foo"] = () => {
     *  ...
     * };
     *
     * Client.invoke("foo");
     */
    public get methods(): { [name: string]: Function } {
        return this.createMethodsObject() as any;
    }

    protected createMethodsObject(clientRequest?: ClientRequest): { [name: string]: Function } {
        return new Proxy(MethodExecutionContext.createProxy({ methods: this.methodHost, clientRequest }), this.methodHandler) as any;
    }


    /**
     * Can be used to overwrite all methods.
     * The value must be an object, and values in the object must be functions.
     */
    public set methods(value: { [name: string]: Function }) {
        if (typeof(value) !== 'object') {
            throw new ValueIsNotAnObject();
        }

        if (!checkObjectForFunctionsOnly(value))
            throw new ValuesAreNotFunctions();

        this.methodHost = Server.methodHostFromObject(value);
    }


    /**
     * A map containing methods that will be executed upon request from the client.
     */
    protected methodHost: Map<string, Function>;

    /**
     * Creates a RPC server using one or more transports.
     * Using multiple transports the server can listen for RPC requests on multiple protocols.
     * @param transports - An array of transports or single transport that the server will listen on.
     * @param methodHost - An object containing methods that will be executed upon request from the client.
     *
     * @example
     * let tcpTransport = new TCPTransport(1234);
     * let methods = {
     *  foo: (bar) => {
     *     console.log(bar);
     *  }
     * };
     * new Server(tcpTransport, methods);
     */
    constructor(transports?: ServerSideTransport|Array<ServerSideTransport>, methodHost: { [name: string]: Function } =  {}) {
        super();

        if (!Object.values(methodHost).every((fn) => typeof(fn) === "function"))
            throw ValueIsNotAFunction;

        this.methodHost = Server.methodHostFromObject(methodHost);

        this.transports = [];

        for (let transport of [].concat(transports).filter(Boolean)) {
            this.addTransport(transport);
        }
    }

    protected static methodHostFromObject(obj: { [name: string]: Function }): Map<string, Function> {
        let methodHost = new Map<string, Function>();
        for (let k in obj)
            methodHost.set(k, obj[k]);

        return methodHost;
    }

    /**
     * Adds a transport to the transports on the server.
     * @param transport - Transport to add.
     */
    public addTransport(transport: ServerSideTransport) {
        transport.on("request", this.invoke.bind(this));
        transport.on("notification", this.notification.bind(this));
        transport.on("batch", this.batch.bind(this));
        if (this.transports.indexOf(transport) === -1)
            this.transports.push(transport);
    }

    /**
     * Removes a transport from the transports on the server.
     * @param transport - Transport to remove.
     */
    public removeTransport(transport: ServerSideTransport) {
        const index = this.transports.indexOf(transport);
        this.transports.splice(index, 1);
    }

    /**
     * A map of clients IDs to transport the client is connected on.
     * This can be used to determine what transport a client is connected to.
     * This of course only applies to PersistentTransports
     */
    protected get clientsByTransport(): Map<any, PersistentTransport> {
        const entries = (<Array<Transport>>this.transports)
        .filter((transport: Transport) => transport instanceof PersistentTransport)
        .map((transport: PersistentTransport) => {
            return Array.from(transport.connections.keys())
                .map((id: any) => [ id, transport ]);
        });

        return new Map<any, PersistentTransport>(_.flatten(entries) as any);
    }

    /**
     * This method is called when the server recieves a batch request (an array with multiple requests).
     * Requests will be executed sequentially and responses will be in the same order as the corresponding requests.
     * Notifications will be executed but of course will generate no response.
     * If a request has an error the error will stand in place of a response, but subsequent requests will still be executed.
     * @listens Transport#batch
     * @param messages - An array of either Request or Notification objects.
     * @param clientRequest - The ClientRequest object that contains information on the request that was made (e.g. client's ID).
     */
    protected async batch(messages: Array<Request|Notification>, clientRequest: ClientRequest): Promise<void> {
        let batchPromises = messages.map(async (message: Request|Notification) => {
            if (message instanceof Request) {
                try {
                    const result = await this.executeMethod(<Request>message, clientRequest);
                    return new Response(message.id, result);
                } catch (rpcError) {
                    return new Response(message.id, rpcError);
                }
            }
            else if (message instanceof Notification) {
                this.notification(message);
            }
        }).filter(Boolean);

        const batchResponses: Response[] = [];

        for (const promise of batchPromises) {
            const response = await promise;
            batchResponses.push(response);
        }

        clientRequest.respond(batchResponses.filter(Boolean));
    }

    /**
     * This method is called when the server recieves a RPC Request. It will execute the method specified and send the response (or an error) to the client.
     *
     * @listens Transport#Request
     * @param request - The Request object containing details (method, params).
     * @param clientRequest - The ClientRequest object that contains information on the request (e.g. client's ID).
     * @async
     */
    protected async invoke(request: Request, clientRequest?: ClientRequest): Promise<void> {
        let response;

        try {
            const result = await this.executeMethod(request, clientRequest);
            response = new Response(request.id, result);
        } catch (error) {
            if (error instanceof RPCError)
                response = new Response(request.id, error);
            else
                response = new Response(request.id, new InternalError(error));
        } finally {
            clientRequest.respond(response);
        }
    }

    /**
     * This method is called when the server receives a notification from a client.
     *
     * @listens Transport#notification
     * @param notification - The notification.
     *
     * If the notification provides params as an array it will be emitted as an event.
     *
     * @example
     * // As an event
     * // request: { "method": "foo", "params": [ "bar" ], "jsonrpc": "2.0" }
     * Server.on("foo", (param1) => { param1 === "bar"; });
     * // With named arguments
     * // request: { "method": "foo", "params": { "param1": "bar" }, "jsonrpc": "2.0" }
     * Server.methods["foo"] = (baz, flob, param1) => { param1 === "bar";  };
     */
    public async notification(notification: Notification): Promise<void>;
    /**
    * This method is called when the server receives a notification from a client.
    *
    * @listens Transport#notification
    * @param notification - The notification.
    * @param clientRequest - The ClientRequest object that contains information on the request (e.g. client's ID).
    *
    * If the notification provides params as an array it will be emitted as an event.
    *
    * @example
    * // As an event
    * // request: { "method": "foo", "params": [ "bar" ], "jsonrpc": "2.0" }
    * Server.on("foo", (param1) => { param1 === "bar"; });
    * // With named arguments
    * // request: { "method": "foo", "params": { "param1": "bar" }, "jsonrpc": "2.0" }
    * Server.methods["foo"] = (baz, flob, param1) => { param1 === "bar";  };
    */
    public async notification(notification: Notification, clientRequest: ClientRequest): Promise<void>;
    public async notification(notification: Notification, clientRequest?: ClientRequest): Promise<void> {
        let methods = this.createMethodsObject(clientRequest);
        if (typeof(notification.params) === "undefined" || Array.isArray(notification.params))
            this.emit.apply(this, [ notification.method ].concat(<any>notification.params || []));

        if (this.methodHost.has(notification.method))
            await this.executeMethod(notification, clientRequest);

        if (clientRequest)
            clientRequest.respond();
    }

    /**
     * This method executes the method specified in the request and returns the result of the request.
     * @param request - The incoming request.
     * @async
     * @throws {MethodNotFound} - If the method requested does not exist.
     * @throws {InternalError} - If the underlying method throws an Error that is not an RPCError. The "data" field of the RPCError will be the error that was thrown by the method.
     * @throws {RPCError} - If the underlying method throws an RPC Error.
     */
    protected async executeMethod (request: Request|Notification, clientRequest?: ClientRequest) {
        if (!(this.methodHost.has(request.method)))
            throw new MethodNotFound();

        let methods = this.createMethodsObject(clientRequest);

        const method = <Function>methods[request.method];

        if (typeof(request.params) !== "undefined" && !Array.isArray(request.params))
            request.params = matchNamedArguments(request.params, this.methodHost.get(request.method));

        let result = await method.apply({ context: methods }, request.params);
        if (typeof(result) === 'undefined')
            result = null;

        return result;
    }

    /**
     * This feature is not offically supported by JSON-RPC 2.0
     *
     * Using this method the server can send a notification to a client connection.
     *
     * @param id - The ID of the client.
     * @param notification - The notification to send.
     * @async
     */
    public async sendTo(id: any, notification: Notification) {
        this.clientsByTransport.get(id).sendTo(id, notification);
    }

    /**
     * This feature is not offically supported by JSON-RPC 2.0
     *
     * Using this method the server can send notifications to all clients connected.
     *
     * @param notification - The notification to send to all clients.
     * @async
     */
    public async sendAll(notification: Notification) {
        for (let [id, transport] of this.clientsByTransport) {
            await transport.sendTo(id, notification);
        }
    }

    /**
     * Begins listening for incoming connections.
     *
     * @async
     */
    public async listen(): Promise<void> {
        for (let transport of <Array<ServerSideTransport>>this.transports) {
            await transport.listen();
        }
    }

    /**
     * Closes all underlying transports.
     * @async
     */
    public async close(): Promise<void> {
        for (let transport of <Array<ServerSideTransport>>this.transports) {
            await transport.close();
        }
    }
}
