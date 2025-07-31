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

import { ref, watch } from "vue";

const DEFAULT_PREFIX = "carbon-trace"

function localStorageKey(key: string, space: string, prefix: string) {
  if (prefix && !prefix.endsWith(":")) {
    prefix += ":";
  }
  if (space && !space.endsWith(":")) {
    space += ":";
  }
  return prefix + space + key;
}

export function getLocalStorage<Type>(
  key: string,
  defaultValue: Type,
  space = "",
  prefix = DEFAULT_PREFIX
) {
  const item = localStorage.getItem(localStorageKey(key, space, prefix));
  if (item === null) {
    return defaultValue;
  }
  try {
    return JSON.parse(item as string) as Type;
  } catch (SyntaxError) {
    console.warn(
      `localStorage of ${prefix}${space}${key} was not valid JSON. Falling back to defaultValue.`
    );
  }
  return defaultValue;
}

export function setLocalStorage<Type>(
  key: string,
  value: Type,
  space = "",
  prefix = DEFAULT_PREFIX
) {
  localStorage.setItem(
    localStorageKey(key, space, prefix),
    JSON.stringify(value)
  );
}

/**
 * Ref which saves its status in the localStorage.
 */
export function storageRef<Type>(
  key: string,
  defaultValue: Type,
  space = "",
  prefix = DEFAULT_PREFIX
) {
  const reference = ref(getLocalStorage(key, defaultValue, space, prefix));

  watch(
    reference,
    (newValue) => {
      setLocalStorage(key, newValue, space, prefix);
    },
    { deep: true }
  );

  return reference;
}

const UNDEFINED = Object();
// TODO: Make cache deletable, delete after adding shells.
export function cached(target: any, propertyKey: string, descriptor: PropertyDescriptor): typeof descriptor.value  {
  const originalMethod = descriptor.value;
  const methodCache: WeakMap<any, { [argString: string]: typeof descriptor.value }> = new WeakMap()
  descriptor.value = function cache (...args: any[]) {
    const argString = args.toString();
    let cacheValue = methodCache.get(this);
    if (cacheValue !== undefined && cacheValue[argString] !== undefined) {
      const value = cacheValue[argString];
      return value === UNDEFINED ? undefined : value;
    }
    const val = originalMethod.apply(this, args);
    if (cacheValue === undefined) {
      cacheValue = {}
      methodCache.set(this, cacheValue)
    }
    cacheValue[argString] = val === undefined ? UNDEFINED : val;
    return val;
  };
  return descriptor;
}
