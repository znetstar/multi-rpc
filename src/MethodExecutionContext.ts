import {ClientRequest} from "multi-rpc-common";

export interface MethodExecutionContextOptions {
    methods: Map<string, Function>;
    clientRequest?: ClientRequest;
}

export const MethodExecutionContextSelf = 'context';

/**
   Function that holds information for the current method being executed (the "this" object during execution)
*/
export class MethodExecutionContext {
    constructor(protected options: MethodExecutionContextOptions = { methods: new Map<string, Function>()}) {

    }

    public get methods(): { [name: string]: Function } {
        let obj:any = {};

        for (let [k,v] of this.options.methods) {
            obj[k] = v;
        }

        return obj;
    }

    public get clientRequest(): ClientRequest|undefined { return this.options.clientRequest; }

    public static createProxy(options?: MethodExecutionContextOptions) {
        let context = new MethodExecutionContext(options);
        return new Proxy(context, {
            get(target: MethodExecutionContext, p: PropertyKey, receiver: any): any {
                if (p === MethodExecutionContextSelf)
                    return context;
                return ((target as any)[p] || target.options.methods.get(p as string)).bind(target);
            },
            set(target: MethodExecutionContext, p: PropertyKey, value: any, receiver: any): boolean {
                if (p === MethodExecutionContextSelf || (p as any) in (target  as any))
                    return false;
                target.options.methods.set(p as string, value.bind(target));
                return true;
            },
            has(target: MethodExecutionContext, p: PropertyKey): boolean {
                if (p === MethodExecutionContextSelf)
                    return true;
                return (p as any) in (target as any) || target.options.methods.has(p as string);
            },
            deleteProperty(target: MethodExecutionContext, p: PropertyKey): boolean {
                if (p === MethodExecutionContextSelf || (p as any) in (target  as any))
                    return false;
                target.options.methods.delete(p as string);
                return true;
            }
        })
    }
}