import Message from "./Message";

export default class Invocation extends Message {
    constructor(public id: number, public method: string, public params?: any[]|Object) {
        super();
    }
}