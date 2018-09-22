export class RPCError extends Error {
    public toJSON() {
        return {
            message: this.message,
            code: this.code,
            data: this.data
        };
    }

    constructor(message: string, public code: number, public data?: any) {
        super(message);
    }
}



export class ParseError extends RPCError {
    constructor(public data?: any) {
        super("Parse error", -32700, data);
    }
}

export class InvalidRequest extends RPCError {
    constructor(public data?: any) {
        super("Invalid Request", -32600, data);
    }
}

export class MethodNotFound extends RPCError {
    constructor(public data?: any) {
        super("Method not found", -32601, data);
    }
}

export class InvalidParams extends RPCError {
    constructor(public data?: any) {
        super("Invalid method parameter(s)", -32602, data);
    }
}

export class InternalError extends RPCError {
    constructor(public data?: any) {
        super("Internal error", -32603, data);
    }
}

export class ServerError extends RPCError {
    constructor(code: number, public data?: any) {
        super("Server error", code, data);
        if (code > -32000 || code < -32099)
            throw new Error(`Error code for ServerError must be between -32099 and -32000`);
    }
}