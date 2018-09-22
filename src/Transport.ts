import { EventEmitter } from "eventemitter3";
import Serializer from "./Serializer";
import Message from "./Message";
import Invocation from "./Invocation";
import Notification from "./Notification";
import Response from "./Response";
import { RPCError } from "./Errors";
import Request from "./Request";
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


export default abstract class Transport extends EventEmitter {
    constructor(protected serializer: Serializer) {
        super();
    }

    static uniqueId(): Uint8Array {
        const uniqueId = new Uint8Array(16);
        uuid.v4(null, uniqueId, 0);
        return uniqueId;
    }

    public abstract connection?: any;
    public abstract connections?: Map<any, any>;

    protected abstract sendConnection(connection: any, message: Message): Promise<any>;

    public async sendTo(id: any, message: Message): Promise<any> {
        if (!this.connections) {
            throw new TransportInClientState();
        }

        if (!this.connections.has(id))
            throw new NonExistantClient(id);
        
        await this.sendConnection(this.connections.get(id), message);
    }

    public async send(message: Message): Promise<any> {
        if (!this.connection) {
            throw new TransportInServerState();
        }
        await this.sendConnection(this.connection, message);
    }

    protected receive(data: Uint8Array|string, request?: Request) {
        let message;
        try {
            message = this.serializer.deserialize(data);
        } catch (error) {
            if (request && request.respond) 
                request.respond(new Response(null, <RPCError>error));
            else
                throw error;
        }

        if (message instanceof Invocation) {
            this.emit("invocation", <Invocation>message, request);
        }

        if (message instanceof Notification) {
            this.emit("notification", <Notification>message, request);
        }

        if (message instanceof Response) {
            const response = <Response>message;
            this.emit("response", response, response, request);
            this.emit(`response:${response.id}`, response, request);
        }
    }

    public abstract listen(): Promise<any>;
}