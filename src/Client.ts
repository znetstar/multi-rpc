import { EventEmitter } from "eventemitter3";
import Transport from "./Transport";
import Invocation from "./Invocation";
import Notification from "./Notification";
import Request from "./Request";
import Response from "./Response";
import { MethodNotFound, RPCError, InternalError } from "./Errors";

export default class Client extends EventEmitter {
    protected method_id: number = 1;

    constructor(protected transport: Transport) {
        super();

        transport.on('notification', (notification: Notification, request: Request) => {
            this.emit.apply(this, [notification.method].concat(notification.params));
        }); 
    }

    public async invoke(method: string, ...params: any[]) {
        let id = this.method_id++;
        const invocation = new Invocation(id, method, params);
        
        let p = new Promise((resolve, reject) => {
            this.transport.once(`response:${id}`, (response: Response) => {
                if (response.error) 
                    return reject(response.error);
                
                resolve(response.result);
            });
        });

        await this.transport.send(invocation);
        
        return p;
    }

    public async notify(method: string, ...params: any[]) {
        const notification = new Notification(method, params);
        
        await this.transport.send(notification);
    }
}