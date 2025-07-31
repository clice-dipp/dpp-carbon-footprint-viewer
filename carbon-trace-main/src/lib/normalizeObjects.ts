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

type Obj = { [key: string]: any };

/**
 * Ensures all objects in the array have the same attributes.
 * If an attribute is missing, assigns the value "does not exist".
 * @param objects Array of objects to normalize.
 * @returns Array of normalized objects.
 */
export default function normalizeObjects(objects: Obj[]): Obj[] {
  // Helper function to recursively collect all keys
  function collectKeys(obj: Obj, prefix = ''): Set<string> {
    const keys = new Set<string>();
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.add(fullKey);
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        const nestedKeys = collectKeys(obj[key], fullKey);
        nestedKeys.forEach(k => keys.add(k));
      }
    }
    return keys;
  }

  // Collect all unique keys from all objects
  const allKeys = new Set<string>();
  objects.forEach(obj => {
    const keys = collectKeys(obj);
    keys.forEach(key => allKeys.add(key));
  });

  // Helper function to set missing keys with "does not exist"
  function setMissingKeys(obj: Obj, keys: Set<string>, prefix = ''): Obj {
    const result: Obj = Array.isArray(obj) ? [] : {};
    keys.forEach(key => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const keyParts = fullKey.split('.');
      let current = obj;
      let currentResult = result;
      for (let i = 0; i < keyParts.length; i++) {
        const part = keyParts[i];
        if (i === keyParts.length - 1) {
          if (!part || !current || !(part in current)) {
            currentResult[part] = 'does not exist';
          } else {
            currentResult[part] = current[part];
          }
        } else {
          if (!(part in current)) {
            currentResult[part] = {};
          } else if (typeof current[part] !== 'object' || Array.isArray(current[part])) {
            currentResult[part] = current[part];
          } else {
            currentResult[part] = currentResult[part] || {};
          }
          current = current[part];
          currentResult = currentResult[part];
        }
      }
    });
    return result;
  }

  // Normalize all objects
  return objects.map(obj => setMissingKeys(obj, allKeys));
}

// Example usage:
const objects = [
  { name: 'Alice', details: { age: 25, city: 'London' } },
  { name: 'Bob', details: { age: 30 }, extra: 'data' },
  { name: 'Charlie', address: { city: 'New York' } }
];

const normalizedObjects = normalizeObjects(objects);
