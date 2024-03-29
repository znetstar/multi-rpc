import * as _  from "lodash";
import { serializeError } from "serialize-error";
import {InstanceComparable} from "./InstanceComparable";

/**
 * A generic RPC Error.
 */
export class RPCError extends Error  implements InstanceComparable<RPCError> {
  public static get comparableSymbol() { return Symbol.for('RPCError'); }
  public get comparableSymbol() { return ((this as any).__proto__.constructor.comparableSymbol); }
  public isSibling(instance: RPCError): boolean {
    return instance.comparableSymbol === this.comparableSymbol;
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

    /**
     * Prepares error for serialization
     */
    public serialize(): any {
        return {
            message: this.message,
            code: this.code,
            data: (this.data instanceof Error) ? serializeError(this.data) : this.data
        };
    }
}

/**
 * An error that occurs when the message cannot be deserialized.
 */
export class ParseError extends RPCError implements InstanceComparable<ParseError> {
  public static get comparableSymbol() { return Symbol.for('ParseError'); }
  public get comparableSymbol() { return ((this as any).__proto__.constructor.comparableSymbol); }
  public isSibling(instance: ParseError): boolean {
    return instance.comparableSymbol === this.comparableSymbol;
  }
    /**
     * RPC Error code
     */
    public static get code(): number {
        return -32700;
    }

    /**
     * Creates a ParseError Object.
     * @param data - Additional data that should be included in the error.
     */
    constructor(public data?: any) {
        super("Parse error", ParseError.code, data);
    }
}

/**
 * An error that occurs when the request is not formatted correctly.
 */
export class InvalidRequest extends RPCError implements InstanceComparable<InvalidRequest> {
  public static get comparableSymbol() { return Symbol.for('InvalidRequest'); }
  public get comparableSymbol() { return ((this as any).__proto__.constructor.comparableSymbol); }
  public isSibling(instance: InvalidRequest): boolean {
    return instance.comparableSymbol === this.comparableSymbol;
  }
    /**
     * RPC Error code
     */
    public static get code(): number {
        return -32600;
    }

    /**
     * Creates an InvalidRequest Object.
     * @param data - Additional data that should be included in the error.
     */
    constructor(public data?: any) {
        super("Invalid Request", InvalidRequest.code, data);
    }
}

/**
 * An error that occurs when a method has been called that does not exist.
 */
export class MethodNotFound extends RPCError implements InstanceComparable<MethodNotFound> {
  public static get comparableSymbol() { return Symbol.for('MethodNotFound'); }
  public get comparableSymbol() { return ((this as any).__proto__.constructor.comparableSymbol); }
  public isSibling(instance: MethodNotFound): boolean {
    return instance.comparableSymbol === this.comparableSymbol;
  }
    /**
     * RPC Error code
     */
    public static get code(): number {
        return -32601;
    }

    /**
     * Creates a MethodNotFound Object.
     * @param data - Additional data that should be included in the error.
     */
    constructor(public data?: any) {
        super("Method not found", MethodNotFound.code, data);
    }
}

/**
 * An error that could occur when a method has been called with invalid arguments.
 * This error can only be raised when named paramaters are used.
 */
export class InvalidParams extends RPCError  implements InstanceComparable<InvalidParams> {
  public static get comparableSymbol() { return Symbol.for('InvalidParams'); }
  public get comparableSymbol() { return ((this as any).__proto__.constructor.comparableSymbol); }
  public isSibling(instance: InvalidParams): boolean {
    return instance.comparableSymbol === this.comparableSymbol;
  }
    /**
     * RPC Error code
     */
    public static get code(): number {
        return -32602;
    }

    /**
     * Creates an InvalidParams Object.
     * @param data - Additional data that should be included in the error.
     */
    constructor(public data?: any) {
        super("Invalid method parameter(s)", InvalidParams.code, data);
    }
}

/**
 * An unknown internal error.
 */
export class InternalError extends RPCError implements InstanceComparable<InternalError> {
  public static get comparableSymbol() { return Symbol.for('InternalError'); }
  public get comparableSymbol() { return ((this as any).__proto__.constructor.comparableSymbol); }
  public isSibling(instance: InternalError): boolean {
    return instance.comparableSymbol === this.comparableSymbol;
  }
    /**
     * RPC Error code
     */
    public static get code(): number {
        return -32603;
    }

    /**
     * Creates an InternalError Object.
     * @param data - Additional data that should be included in the error.
     */
    constructor(public data?: any) {
        super("Internal error", InternalError.code, data);
    }
}

/**
 * A server error.
 */
export class ServerError extends RPCError implements InstanceComparable<ServerError> {
  public static get comparableSymbol() { return Symbol.for('ServerError'); }
  public get comparableSymbol() { return ((this as any).__proto__.constructor.comparableSymbol); }
  public isSibling(instance: ServerError): boolean {
    return instance.comparableSymbol === this.comparableSymbol;
  }
    /**
     * Creates a ServerError object.
     * @param code - The error code. Must be above -32099 but below -32000.
     * @param data - Additional data that should be included in the error.
     */
    constructor(code: number, public data?: any) {
        super("Server error", code, data);
        if (!ServerError.isServerErrorCode(code))
            throw new Error(`Error code for ServerError must be between -32099 and -32000`);
    }

    /**
     * Checks if the error code is within the "ServerError" range as defined in the specification.
     * @param code - Error code to check.
     */
    public static isServerErrorCode(code: number) {
        return (code <= -32000 || code >= -32099);
    }
}

/**
 * An interface that represents a predefined RPC error.
 */
export default interface PredefinedRPCError<T> {
    new(data?: any): T;
}

/**
 * A map of all predefined RPC errors.
 */
export const RPCErrorsByCode: Map<number, PredefinedRPCError<RPCError>> = new Map<number, PredefinedRPCError<RPCError>>([
    [ ParseError.code, ParseError ],
    [ InvalidRequest.code, InvalidRequest ],
    [ MethodNotFound.code, MethodNotFound ],
    [ InvalidParams.code, InvalidParams ],
    [ InternalError.code, InternalError ]
]);

Object.freeze(RPCErrorsByCode);
