/**
 *   Copyright 2025 Moritz Bock and Software GmbH (previously Software AG)
 *   
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *   
 *     http://www.apache.org/licenses/LICENSE-2.0
 *   
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

function comparePrimitive<A, B>(a: A, b: B): PrimitiveCompareReturnType<A, B> {
  const type = typeof a;
  if (type !== typeof b || type === "undefined" || type === "symbol" || type === "function") {
    return undefined as PrimitiveCompareReturnType<A, B>;
  }
  if (type === "number" || type === "bigint") {
    // @ts-ignore
    return b - a as PrimitiveCompareReturnType<A, B>;
  }
  if (type === "string" || type === "boolean") {
    // @ts-ignore
    return (a === b) as unknown as PrimitiveCompareReturnType<A, B>;
  }
  return null as PrimitiveCompareReturnType<A, B>;
}

/**
 * Compare the values of two object attributes against each other.
 * Returns a proxy which compares those and "change" the attributes to:
 *  - undefined if the attribute types of the two objects do not match, do not exist, are functions, or are undefined.
 *  - null if both values are null.
 *  - deep comparison on arrays and objects.
 *  - boolean if the values are a boolean. True if they are the same value, false if not.
 *  - b - a if they are number or bigint
 *  - a === b if they are strings.
 */
export default function comparison<A extends { [key: string | symbol]: any }, B extends { [key: string | symbol]: any }>(a: A, b: B): CompareReturnType<A, B> {
  return new Proxy([a, b] as const, {
    get: ([first, second], property) => {
      if (property in first && property in second) {
        const f = first[property];
        const s = second[property];
        const primitiveCompared = comparePrimitive(f, s);
        if (primitiveCompared !== null) {
          return primitiveCompared;
        }
        if (f === null) {
          if (s === null) {
            return null;
          }
          return undefined;
        }
        if (Array.isArray(f)) {
          if (Array.isArray(s)) {
            return f.map((one, i) => {
              const primitive = comparePrimitive(one, s[i]);
              if (primitive !== null) {
                return primitive;
              }
              return comparison(one, s[i]);
            });
          }
          return null;
        }
        return comparison(f, s);
      }
      return undefined;
    }
  }) as unknown as CompareReturnType<A, B>;
}

/*
export default function comparison<A extends { [key: string | symbol]: any }, B extends { [key: string | symbol]: any }>(a: A, b: B): CompareReturnType<A, B> {
  return new Proxy([a, b] as const, {
    get: ([first, second], property) => {
      if (property in first && property in second) {
        const f = first[property];
        const s = second[property];
        const type = typeof f;
        if (type !== typeof s || type === "undefined" || type === "symbol" || type === "function") {
          return undefined;
        }
        if (type === "object") {
          if (f === null) {
            if (s === null) {
              return null;
            }
            return undefined;
          }
          if (Array.isArray(f)) {
            if (Array.isArray(s)) {
              return f.map((one, i) => {
                const primitive = comparePrimitive(one, s[i]);
                if (primitive !== null) {
                  return primitive;
                }
                return comparison(one, s[i]);
              });
            }
            return null;
          }
          return comparison(f, s);
        }
        if (type === "number" || type === "bigint") {
          return s - f;
        }
        return f === s;
      }
      return undefined;
    }
  }) as CompareReturnType<A, B>;
 */
type SameType<A, B, MismatchType = undefined> = A extends boolean ? (B extends boolean ? boolean : undefined) : // Somehow, SameType<boolean, boolean> otherwise expands to boolean | undefined. Other Types work as expected.
  A extends B ? (B extends A ? A : MismatchType) : MismatchType;
type DeepCompare<A, B> =
  A extends Array<infer AChild> ? (B extends Array<infer BChild> ? CompareReturnType<AChild, BChild>[] : undefined)
    : A extends object ? (B extends object ? CompareAttrs<A, B> : undefined)
    : SameType<A, B>;
type UndefinedToUndefined<A> = A extends undefined ? undefined : A;
type SymbolToUndefined<A> = A extends Symbol ? undefined : A;
type FunctionToUndefined<A> = A extends Function ? undefined : A;
type NumberToNumber<A> = A extends number ? number : A extends bigint ? bigint : A;
type StringOrBooleanToBoolean<A> = A extends string ? boolean : A extends boolean ? boolean : A;
type CompareAttrs<A, B> = { [K in keyof A]: K extends keyof B ? CompareReturnType<A[K], B[K]> : undefined }


type PrimitiveCompareReturnType<A, B> = StringOrBooleanToBoolean<NumberToNumber<FunctionToUndefined<SymbolToUndefined<UndefinedToUndefined<SameType<A, B, null>>>>>>
type CompareReturnType<A, B> = StringOrBooleanToBoolean<NumberToNumber<FunctionToUndefined<SymbolToUndefined<UndefinedToUndefined<DeepCompare<A, B>>>>>>
