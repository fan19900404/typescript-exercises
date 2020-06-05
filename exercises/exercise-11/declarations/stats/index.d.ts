declare module 'stats' {
  type GetIndex = <T>(input: T[], comparator: (a: T, b: T) => number) => number;
  type GetElement = <T>(
    input: T[],
    comparator: (a: T, b: T) => number
  ) => T | null;

  export const getMaxIndex: GetIndex;
  export const getMinIndex: GetIndex;
  export const getMedianIndex: GetIndex;

  export const getMaxElement: GetElement;
  export const getMinElement: GetElement;
  export const getMedianElement: GetElement;

  export function getAverageValue<T, K extends keyof T>(
    input: T[],
    getValue: (opt: T) => T[K]
  ): T[K]|null;
}
