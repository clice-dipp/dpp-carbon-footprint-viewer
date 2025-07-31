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

import type { components } from '@/lib/api/AssetAdministrationShellRepository'

type Extension = components['schemas']['Extension'];

/**
 * Possible Extension types as strings
 */
export type ExtensionTypeName = NonNullable<components['schemas']['Extension']['valueType']>;

/**
 * Mapping of possible extension types to its javascript equivalent
 */
export type ExtensionType<Type extends ExtensionTypeName> = Type extends 'ANY_URI'
  ? URL
  : Type extends ('BASE64BINARY' | 'HEX_BINARY' | 'STRING')
    ? string
    : Type extends 'BOOLEAN'
      ? boolean
      : Type extends ('BYTE' | 'INT' | 'INTEGER' | 'SHORT' | 'LONG' | 'UNSIGNED_BYTE' | 'UNSIGNED_SHORT' | 'UNSIGNED_LONG'
          | 'UNSIGNED_INT' | 'POSITIVE_INTEGER' | 'NEGATIVE_INTEGER' | 'NON_NEGATIVE_INTEGER' | 'NON_POSITIVE_INTEGER'
          | 'DURATION' | 'DECIMAL' | 'DOUBLE' | 'FLOAT')
        ? number
        : Type extends ('DATE' | 'TIME' | 'DATE_TIME' | 'GYEAR' | 'GMONTH' | 'GDAY' | 'GYEAR_MONTH' | 'GMONTH_DAY')
          ? Date
          : null;

/**
 * Object representing multiple extension values and their names
 */
export type ExtensionValuesObject = { [extensionName: string]: ExtensionType<any> }

// Parsing methods
/**
 * Parser method not changing anything
 */
function doNotChange (value: string) {
  return value
}

/**
 * Parse a string to a radix 10 number
 */
function parseInt10 (value: string) {
  return parseInt(value, 10)
}

/**
 * Create a parser method parsing a date
 * @param prefix prefix to add to the value string passed to the returned method
 * @param suffix suffix to add to the value string passed to the returned method
 */
function parseDate (prefix: string = '', suffix: string = '') {
  return (value: string) => new Date(prefix + value + suffix)
}

/**
 * Parse hexCode string to a decoded string
 */
function hexDecode (hexString: string) {
  let result = ''
  for (let i = 0; i < hexString.length; i += 2) {
    result += String.fromCharCode(parseInt(hexString.substring(i, i + 2), 16))
  }
  return result
}

/**
 * Parse a duration to a positive number of seconds this duration represents
 */
function parseDuration (duration: string) {
  const isNegative = duration.startsWith('-')
  if (isNegative) {
    duration = duration.substring(1)
  }

  const regex = /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/
  const matches = duration.match(regex)

  if (!matches) {
    throw new Error('Invalid duration format')
  }

  const years = parseInt(matches[1], 10) || 0
  const months = parseInt(matches[2], 10) || 0
  const days = parseInt(matches[3], 10) || 0
  const hours = parseInt(matches[4], 10) || 0
  const minutes = parseInt(matches[5], 10) || 0
  const seconds = parseFloat(matches[6]) || 0

  // Assuming 1 year = 365 days, 1 month = 30 days
  const totalSeconds = (((years * 365 + months * 30 + days) * 24 + hours) * 60 + minutes) * 60 + seconds

  return isNegative ? -totalSeconds : totalSeconds
}

/**
 * type of the parser object
 */
type ParsersObject = { [ key in ExtensionTypeName ]: (value: string) => ExtensionType<key>};

/**
 * parser object offering parsers to any aas extension type to parse to a matching js type
 */
const parsers: ParsersObject = {
  STRING: doNotChange,
  BOOLEAN: (value: string) => ['true', '1'].includes(value.toLowerCase()),
  DECIMAL: parseFloat,
  DOUBLE: parseFloat,
  FLOAT: parseFloat,
  INTEGER: parseInt10,
  INT: parseInt10,
  BYTE: parseInt10,
  SHORT: parseInt10,
  LONG: parseInt10,
  UNSIGNED_BYTE: parseInt10,
  UNSIGNED_SHORT: parseInt10,
  UNSIGNED_LONG: parseInt10,
  UNSIGNED_INT: parseInt10,
  POSITIVE_INTEGER: parseInt10,
  NEGATIVE_INTEGER: parseInt10,
  NON_NEGATIVE_INTEGER: parseInt10,
  NON_POSITIVE_INTEGER: parseInt10,
  DATE: parseDate(),
  TIME: parseDate('1970-01-01T'),
  DATE_TIME: parseDate(),
  GYEAR: parseDate('', '-01-01'),
  GMONTH: parseDate('1970-', '-01'),
  GDAY: parseDate('1970-01-'),
  GYEAR_MONTH: parseDate('', '-01'),
  GMONTH_DAY: parseDate('1970-'),
  ANY_URI: (value: string) => new URL(value),
  BASE64BINARY: atob,
  HEX_BINARY: hexDecode,
  DURATION: parseDuration
}

/**
 * Get the parsed value of an extension value
 * @param value Unparsed value of the extension
 * @param type Parsed value of the extension
 */
export function getExtensionValue<TypeName extends ExtensionTypeName> (value: string, type: TypeName): ExtensionType<TypeName> {
  return parsers[type](value)
}

/**
 * Parse an array of extensions to an object where the key is the idShort of the extension and the value is the
 * parsed value of the extension
 * @param extensions extensions to parse
 */
export function getAllExtensionValues (extensions: Extension[]): ExtensionValuesObject {
  const values: { [key: string]: ExtensionType<any> } = {}
  for (const e of extensions) {
    try {
      values[e.idShort] = getExtensionValue(e.value!, e.valueType!)
    } catch (TypeError) {
      console.warn('Could not get value or valueType from extension:', e)
    }
  }
  return values
}
