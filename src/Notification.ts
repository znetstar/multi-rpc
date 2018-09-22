import Message from "./Message";

export default class Notification extends Message {
    constructor(public method: string, public params?: any[]) {
        super();
    }
}