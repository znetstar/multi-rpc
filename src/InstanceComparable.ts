export interface InstanceComparable<T> {
  isSibling(instance: T): boolean;
  comparableSymbol: Symbol;
}
