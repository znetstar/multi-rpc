/**
 * A generic RPC Error.
 */
export class RPCError extends Error {
    /**
     * Ensures that only the fields specified in the standard are returned during serialization.
     */
    public toJSON() {
        return {
            message: this.message,
            code: this.code,
            data: this.data
        };
    }

    /**
     * Creates a generic RPC Error object.
     * @param message - Message for the error.
     * @param code - The error code, as required by the specification.
     * @param data - Additional data that should be included in the error.
     */
    constructor(message: string, public code: number, public data?: any) {
        super(message);
    }
}

/**
 * An error that occurs when the message cannot be deserialized. 
 */
export class ParseError extends RPCError {
    /**
     * Creates a ParseError Object.
     * @param data - Additional data that should be included in the error.
     */
    constructor(public data?: any) {
        super("Parse error", -32700, data);
    }
}

/**
 * An error that occurs when the request is not formatted correctly.
 */
export class InvalidRequest extends RPCError {
    /**
     * Creates an InvalidRequest Object.
     * @param data - Additional data that should be included in the error.
     */
    constructor(public data?: any) {
        super("Invalid Request", -32600, data);
    }
}

/**
 * An error that occurs when a method has been called that does not exist.
 */
export class MethodNotFound extends RPCError {
    /**
     * Creates a MethodNotFound Object.
     * @param data - Additional data that should be included in the error.
     */
    constructor(public data?: any) {
        super("Method not found", -32601, data);
    }
}

/**
 * An error that could occur when a method has been called with invalid arguments.
 * This error can only be raised when named paramaters are used.
 */
export class InvalidParams extends RPCError {
    /**
     * Creates an InvalidParams Object.
     * @param data - Additional data that should be included in the error.
     */
    constructor(public data?: any) {
        super("Invalid method parameter(s)", -32602, data);
    }
}

/**
 * An unknown internal error.
 */
export class InternalError extends RPCError {
    /**
     * Creates an InternalError Object.
     * @param data - Additional data that should be included in the error.
     */
    constructor(public data?: any) {
        super("Internal error", -32603, data);
    }
}

/**
 * A server error.
 */
export class ServerError extends RPCError {
    /**
     * Creates a ServerError object.
     * @param code - The error code. Must be above -32099 but below -32000.
     * @param data - Additional data that should be included in the error.
     */
    constructor(code: number, public data?: any) {
        super("Server error", code, data);
        if (code > -32000 || code < -32099)
            throw new Error(`Error code for ServerError must be between -32099 and -32000`);
    }
}