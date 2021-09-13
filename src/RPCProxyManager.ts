
import Client from "./Client";
import { EventEmitter2 as EventEmitter } from 'eventemitter2';

type RPCInvoker = (...args: any[]) => Promise<unknown>;
/**
 * Class for creating Proxy objects that sit on top of the `RPC` object.
 *
 * If the `error` event is listened to, will not throw errors raised during the RPC
 * invocation and instead will pass the error to the event.
 *
 * The `invoke` event can be used to modify the request before being sent to the RPC client.
 * @example
 *
 * interface MyAPI {
 *   doThis(foo: number): Promise<string>;
 * }
 *
 *
 * let client = new Client(transport);
 * let proxyManager = new RPCProxyManager<MyAPI>(client);
 * let rpc = proxyManager.createProxy();
 *
 * rpc.once('invoke', (method, args) => {
 *   args[0] += 5678;
 * });
 *
 * let that = await rpc.doThis(1234);
 */
export class RPCProxyManager<T extends Object> extends EventEmitter {
  /**
   *
   * @param rpcClient Underlying RPC client object to use
   */
  constructor(public rpcClient: Client) {
    super({
      wildcard: false
    });
  }

  /**
   * Creates the `Proxy` object based off of the `Client` backend
   */
  public createProxy() {
    let self: RPCProxyManager<T> = this;
    return new Proxy({} as T, {
      get(target: T, method: string | symbol, receiver: any): RPCInvoker {
        return (...args: any[]) => self.onRpcInvoke(String(method), args);
      },
      set(target: T, p: string | symbol, value: any, receiver: any): boolean {
        return false;
      },
      deleteProperty(target: T, p: string | symbol): boolean {
        return false;
      },
      has(target: T, p: string | symbol): boolean {
        return true;
      }
    });
  }

  /**
   * Invokes the method using the arguments provided
   * @param method
   * @param args
   * @protected
   */
  protected async onRpcInvoke(method: string, args: unknown[]): Promise<unknown> {
    try {
      await this.emitAsync('invoke', method, args);
      return this.rpcClient.invoke(method, args);
    } catch (err) {
      if (this.listeners('error').length) {
        await this.emitAsync('error', err);
      } else {
        throw err;
      }
    }
  }
}

export default RPCProxyManager;
