import { EventEmitter2 } from "eventemitter2";
import { Transport, PersistentTransport, TransportIsNotPersistent, Request, Notification, ClientRequest, Response } from "multi-rpc-common";

/**
 * A client that will connect to an RPC server.
 */
export default class Client extends EventEmitter2 {
    /**
     * Keeps track of Request IDs. Will be incremented after each request.
     */
    protected method_id: number = 1;

    /**
     * Creates a client.
     * @param transport - The transport that should be used to communicate with the server.
     */
    constructor(public transport: Transport) {
        super();

        /**
         * Receives a "Notification" object from the transport and emits it.
         * The example below will log "bar" to the console.
         * @example
         * // notification: { "jsonrpc": "2.0", "method": "foo", "params": ["bar"] }
         * Client.on("foo", (string) => {
         *  console.log(string)
         * });
         * @listens Transport#notification 
         */
        transport.on('notification', (notification: Notification, clientRequest: ClientRequest) => {
            this.emit.apply(this, [ notification.method ].concat(<any>notification.params));
        }); 
    }

    /**
     * Connects to the server using the transport.
     * 
     * @async
     */
    public async connect(): Promise<void> {
        return await (<PersistentTransport>this.transport).connect();
    }

    /**
     * Invokes a method on the RPC server.
     * @param method - Method to invoke.
     * @param params - Arguments for the method.
     * @async
     * 
     * The example below will log "baz, flob"
     * @example
     * Server.methods["foo"] = { bar: (a,b) => { console.log(a,b);  } };
     * 
     * let result = await Client.invoke("foo.bar", ["baz", "flob"]);
     * let result = await Client.invoke("foo.bar", { a: "baz", b: "flob" })
     */
    public async invoke(method: string, params: Object|any[]): Promise<any> {
        let id = this.method_id++;
        const request = new Request(id, method, params);
        
        let p = new Promise((resolve, reject) => {
            this.transport.once(`response:${id}`, (response: Response) => {
                if (response.error) 
                    return reject(response.error);
                
                resolve(response.result);
            });
        });

        await this.transport.send(request);
        
        return p;
    }

    /**
     * Sends a notification to the RPC server.
     * @param method - Method to invoke (name of the event).
     * @param params - Arguments for the method.
     * @async
     */
    public async notify(method: string, ...params: any[]): Promise<void> {
        const notification = new Notification(method, params);
        
        await this.transport.send(notification);
    }

    /**
     * Closes the underlying transport.
     * @async
     */
    public async close(): Promise<void> {
        if (this.transport instanceof PersistentTransport) 
            (this.transport as PersistentTransport).close();
    }
}