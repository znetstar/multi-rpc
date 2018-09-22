import Message from "./Message";
import { RPCError } from "./Errors";

export default class Response extends Message {
    public error?: RPCError;
    public result?: any;

    constructor(public id: number, resultOrError: any) {
        super();
        if (resultOrError instanceof RPCError) {
            this.error = resultOrError;
        } else {
            this.result = resultOrError;
        }
    }
}