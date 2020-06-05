declare module 'str-utils' {
  // export const ...
  // export function ...

  /**
   * Reverses a string.
   * @param value 原本字符串
   */
  export function strReverse(value: string): string;
  export function strToLower(value: string): string;
  export function strToUpper(value: string): string;
  export function strRandomize(value: string): string;
  export function strInvertCase(value: string): string;
}
