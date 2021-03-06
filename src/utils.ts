import { ValueIteratee } from "lodash"
import { uniqBy } from "lodash-es"

function mod(a: number, b: number) {
  return a >= 0 ? a % b : (a % b) + b
}

/**
 * Get the element of the array at the given index, modulo its length
 */
export function getCyclic<T>(array: T[], index: number): T {
  return array[mod(index, array.length)]
}

/**
 * Repeat a value n times
 */
export function repeat<T>(value: T, n: number) {
  return Array<T>(n).fill(value)
}

/**
 * Create an object from the array using the iteratee
 */
export function mapObject<T, U>(
  arr: T[],
  iteratee: (item: T, i: number) => [string | number, U],
): { [key: string]: U } {
  return Object.fromEntries(arr.map(iteratee))
}

export function flatMapUniq<T, U>(
  arr: T[],
  iteratee1: (key: T) => U[],
  iteratee2: ValueIteratee<U>,
) {
  return uniqBy(arr.flatMap(iteratee1), iteratee2)
}

/**
 * Get the single element from the given array.
 */
export function getSingle<T>(array: T[]): T {
  if (array.length !== 1) {
    throw new Error(
      `Expected array to have one element: ${JSON.stringify(array)}`,
    )
  }
  return array[0]
}

export function choose<T>(choices: T[]): T {
  const index = Math.floor(Math.random() * choices.length)
  return choices[index]
}

/**
 * Split the list in two at index (exclusive)
 */
export function splitAt<T>(list: T[], index: number) {
  return [list.slice(0, index), list.slice(index)]
}

/**
 * Return the list "pivoted" so that the given value starts first
 */
export function pivot<T>(list: T[], value: T) {
  const index = list.indexOf(value)
  const [front, back] = splitAt(list, index)
  return [...back, ...front]
}

export const escape = (str: string) => str.replace(/ /g, "-")
