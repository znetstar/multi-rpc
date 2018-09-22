import { EventEmitter2 } from "eventemitter2";
import Transport from "./Transport";
import Request from "./Request";
import Notification from "./Notification";
import ClientRequest from "./ClientRequest";
import Response from "./Response";

export class TransportIsNotPersistant extends Error {
    constructor() {
        super("This transport does not use a persistant connection to the server so \"connect\" is not valid");
    }
}

export default class Client extends EventEmitter2 {
    protected method_id: number = 1;

    constructor(protected transport: Transport) {
        super();

        transport.on('notification', (notification: Notification, clientRequest: ClientRequest) => {
            this.emit.apply(this, [ notification.method ].concat(<any>notification.params));
        }); 
    }

    public async listen(): Promise<void> { return await this.transport.listen(); }

    public async connect(): Promise<void> {
        if (!this.transport.connect)
            throw new TransportIsNotPersistant();
        
        return await this.transport.connect();
    }

    public async invoke(method: string, ...params: any[]) {
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

    public async notify(method: string, ...params: any[]) {
        const notification = new Notification(method, params);
        
        await this.transport.send(notification);
    }
}