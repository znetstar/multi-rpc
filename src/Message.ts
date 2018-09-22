export default abstract class Message {
    constructor(public jsonrpc: string = "2.0") {
    }
}