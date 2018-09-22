
import { EventEmitter } from "eventemitter3";
import * as _ from "lodash";
import Transport from "./Transport";
import Invocation from "./Invocation";
import Notification from "./Notification";
import Response from "./Response";
import { MethodNotFound, RPCError, InternalError } from "./Errors";
import Request from "./Request";
import Message from "./Message";

export default class Server extends EventEmitter { 
    constructor(protected transports: Transport|Array<Transport>, protected method_host: any) {
        super();
        this.transports = [].concat(transports);

        for (let transport of this.transports) {
            transport.on("invocation", this.invoke, this);
            transport.on("notification", this.notification, this);
        }
    }

    protected method_handler: Object = {
        get: (host: any, prop: any) => {
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

    public async listen(): Promise<any> {
        for (let transport of <Array<Transport>>this.transports) {
            await transport.listen();
        }
    }

    public get methods() {
        return new Proxy(this.method_host, this.method_handler)
    }

    protected get clientsByTransport(): Map<any, Transport> {
        const entries = (<Array<Transport>>this.transports).map((transport: Transport) => {
            return Array.from(transport.connections.keys())
                .map((id: any) => [ id, transport ]);
        });

        return new Map<any, Transport>(_.flatten(entries));
    }

    public async sendTo(id: any, message: Message) {
        this.clientsByTransport.get(id).sendTo(id, message);
    }

    protected notification(notification: Notification, request?: Request) {
        this.emit.apply(this.method_host, [notification.method].concat(notification.params));
    }

    protected async invoke(invocation: Invocation, request?: Request): Promise<any> {
        if (!(invocation.method in this.methods))
            return request.respond(new Response(invocation.id, new MethodNotFound()));
        
        const method = this.methods[invocation.method];
        try {
            let result = await method.apply(this.method_host, invocation.params);
            if (typeof(result) === 'undefined')
                result = null;
            
            request.respond(new Response(invocation.id, result));
        } catch (error) {
            if (error instanceof RPCError)
                request.respond(new Response(invocation.id, error));
            else {
                error.toJSON = RPCError.prototype.toJSON.bind(error);
                request.respond(new Response(invocation.id, new InternalError(error)));
            }
        }
    } 
}