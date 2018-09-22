import { EventEmitter2 } from "eventemitter2";
import Serializer from "./Serializer";
import Message from "./Message";
import Request from "./Request";
import Notification from "./Notification";
import Response from "./Response";
import { RPCError } from "./Errors";
import ClientRequest from "./ClientRequest";
import * as uuid from "uuid";

export class NonExistantClient extends Error {
    constructor(id: any) {
        super(`Non existant client: ${id}`);
    }
}

export class TransportInServerState extends Error {
    constructor() {
        super(`Transport is currently in a server capacity.`);
    }
}

export class TransportInClientState extends Error {
    constructor() {
        super(`Transport is currently in a client capacity.`);
    }
}


export default abstract class Transport extends EventEmitter2 {
    constructor(protected serializer: Serializer) {
        super({
            delimiter: ':',
            maxListeners: Infinity,
            wildcard: true
        });
    }

    static uniqueId(): Uint8Array {
        const uniqueId = new Uint8Array(16);
        uuid.v4(null, uniqueId, 0);
        return uniqueId;
    }

    public abstract connect?(): Promise<any>;

    public abstract connection?: any;
    public abstract connections?: Map<any, any>;

    public addConnection(connection: any, id: any = Transport.uniqueId()): void {
        this.connections.set(id, connection);
        return id;
    }

    public removeConnection(id: any) {
        this.connections.delete(id);
    }

    protected abstract sendConnection(connection: any, message: Message): Promise<void>;

    public async sendTo(id: any, message: Message): Promise<void> {
        if (!this.connections) {
            throw new TransportInClientState();
        }

        if (!this.connections.has(id))
            throw new NonExistantClient(id);
        
        await this.sendConnection(this.connections.get(id), message);
    }

    public async send(message: Message): Promise<void> {
        if (!this.connection) {
            throw new TransportInServerState();
        }
        await this.sendConnection(this.connection, message);
    }

    protected receive(data: Uint8Array|string, clientRequest?: ClientRequest) {
        let message;
        try {
            message = this.serializer.deserialize(data);
        } catch (error) {
            if (clientRequest && clientRequest.respond) 
                clientRequest.respond(new Response(null, <RPCError>error));
            else
                throw error;
        }

        if (message instanceof Request) {
            this.emit("request", <Request>message, clientRequest);
        }

        else if (message instanceof Notification) {
            this.emit("notification", <Notification>message, clientRequest);
        }

        else if (message instanceof Response) {
            const response = <Response>message;
            this.emit(`response:${response.id}`, response, clientRequest);
        }
    }

    public abstract listen(): Promise<void>;
}