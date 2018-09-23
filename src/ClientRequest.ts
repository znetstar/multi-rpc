/**
 * Contains information on the request that was made by a client.
 */
export default class ClientRequest {
    /**
     * 
     * @param clientId - The unique id of the client.
     * @param respond - A function that will be called send the response to the client.
     * @param additionalData - Any additonal data that will be needed to service the request (IP Address, authentication, etc.).
     */
    constructor(public clientId: any, public respond?: Function, public additionalData?: any) {

    }
}