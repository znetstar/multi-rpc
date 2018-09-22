
import { EventEmitter2 } from "eventemitter2";
import * as _ from "lodash";
import Transport from "./Transport";
import Request from "./Request";
import Notification from "./Notification";
import Response from "./Response";
import { MethodNotFound, RPCError, InternalError } from "./Errors";
import ClientRequest from "./ClientRequest";
import Message from "./Message";

export default class Server extends EventEmitter2 { 
    protected transports: Transport[];

    constructor(transports: Transport|Array<Transport>, protected method_host: any = {}) {
        super();
        this.transports = [].concat(transports);

        for (let transport of this.transports) {
            transport.on("request", this.invoke.bind(this));
            transport.on("notification", this.notification.bind(this));
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

    public async listen(): Promise<void> {
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

    public async sendAll(message: Message) {
        for (let [id, transport] of this.clientsByTransport) {
            await transport.sendTo(id, message);
        }
    }

    public notification(notification: Notification, clientRequest?: ClientRequest) {
        this.emit.apply(this.method_host, [notification.method].concat(<any>notification.params));
    }

    protected async invoke(request: Request, clientRequest?: ClientRequest): Promise<void> {
        if (!(request.method in this.methods))
            return clientRequest.respond(new Response(request.id, new MethodNotFound()));
        
        const method = this.methods[request.method];
        try {
            let result = await method.apply(this.method_host, request.params);
            if (typeof(result) === 'undefined')
                result = null;
            
            clientRequest.respond(new Response(request.id, result));
        } catch (error) {
            if (error instanceof RPCError)
                clientRequest.respond(new Response(request.id, error));
            else {
                error.toJSON = RPCError.prototype.toJSON.bind(error);
                clientRequest.respond(new Response(request.id, new InternalError(error)));
            }
        }
    } 
}