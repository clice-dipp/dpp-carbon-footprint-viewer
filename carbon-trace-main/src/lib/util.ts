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

import type { RouteLocationNormalizedLoaded, RouteLocationRaw, Router } from 'vue-router'
import Color from 'colorjs.io'
import { rgb } from 'd3'
import shells from '@/lib/api/shells'
import type { components } from '@/lib/api/AssetAdministrationShellRepository'
import IdTree from '@/lib/model/IdTree'
import Address from '@/lib/model/Address'
import AssetTree from '@/lib/model/AssetTree'
import type { AssetIdMap } from '@/lib/AssetIdMap'
import CarbonTree, { type SimulationChanges } from '@/lib/model/CarbonTree'
import CarbonData from '@/lib/model/CarbonData'
import { toDescriptionSmall } from '@/lib/api/registry'
import type { ShellDescriptionSmallInterface } from '@/lib/api/shellTypes'
import CarbonFootprint from '@/lib/model/CarbonFootprint'
import { IRI } from '@/lib/model/semanticIds'

type Asset = components["schemas"]["AssetAdministrationShell"]
type Submodel = components["schemas"]["Submodel"]

export function generateColor(seed: string): string {
  // eslint-disable-next-line new-cap
  //return (new toColor(seed)).getColor().hsl.formatted as string
  return null as string
}

export function keysCollide(
  o1: { [key: string | number | symbol]: any },
  o2: { [key: string | number | symbol]: any }
) {
  const k1 = Object.keys(o1);
  const k2 = Object.keys(o2);
  return k1.some(k => k2.includes(k));
}

export function createUpdateQuery(router: Router)
{
  return (
    parameter: string | number | {[parameter: string]: string | string[] | number | null},
    value: string | null | string[] | undefined = undefined
  ) => {
    const current = router.currentRoute.value.query;
    if (typeof parameter === "string") {
      if (value === undefined) {
        console.warn("No value set for query parameter")
        return current;
      }
      parameter = { [parameter]: value }
    }
    const parameters = {...current, ...parameter as { [v: string]: string }};
    return {
      query: Object.fromEntries(Object.entries(parameters).filter(([_, v]) => v !== null))
    };
  }
}

export function numberToString(num: number): string {
  const words = [
    'zero', 'one', 'two', 'three', 'four',
    'five', 'six', 'seven', 'eight', 'nine', 'ten'
  ];
  return words[num] || num.toString(10);
}

export function pluralizeWord(count: number | 'all' | 'All', singular: string, plural?: string): string {
  if (count === 1) {
    return singular;
  }
  if (plural !== undefined) {
    return plural;
  }
  if (singular.endsWith('y') && !singular.endsWith('ay') && !singular.endsWith('ey') && !singular.endsWith('oy') && !singular.endsWith('uy')) {
    return `${singular.slice(0, -1)}ies`;
  }
  if (singular.endsWith('s') || singular.endsWith('sh') || singular.endsWith('ch') || singular.endsWith('x') || singular.endsWith('z')) {
    return `${singular}es`;
  }
  return `${singular}s`;
}

export function pluralize(count: number | 'all' | 'All', singular: string, plural?: string): string {
  return `${typeof count === "string" ? count : numberToString(count)} ${pluralizeWord(count, singular, plural)}`;
}

/**
 * Change the URL but do not tell Vue about it (e.g. if the data transformation already happened)
 * @param router Vue router
 * @param to Vue route
 */
export function pretend(router: Router, to: RouteLocationRaw) {
  window.history.pushState({}, "", router.resolve(to).fullPath);
}

export function logAndIgnoreMethodErrors(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value

  descriptor.value = function(...args: any[]) {
    try {
      return originalMethod.apply(this, args)
    } catch (e) {
      console.error(e)
      return undefined
    }
  }

  return descriptor
}


export function logAndIgnoreClassErrors(target: Function) {
  const propertyNames = Object.getOwnPropertyNames(target.prototype);

  for (const propertyName of propertyNames) {
    const descriptor = Object.getOwnPropertyDescriptor(target.prototype, propertyName);
    const isMethod = descriptor && typeof descriptor.value === 'function';

    if (isMethod && propertyName !== 'constructor') {
      const originalMethod = descriptor.value;

      descriptor.value = function (...args: any[]) {
        try {
          return originalMethod.apply(this, args);
        } catch (e) {
          console.trace(e);
          return undefined;
        }
      };

      Object.defineProperty(target.prototype, propertyName, descriptor);
    }
  }
}

export function isString(...args: any[]): args is string[] {
  return args.every(s => typeof s === "string");
}

export function ensure<T>(value: T | undefined, error: string | Error = "Value is undefined"): T {
  if (value === undefined) {
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(error)
    }
  }
  return value;
}

export function one<T>(value: T[] | undefined, error: string | Error = "Array is not of length 1"): T {
  if (value === undefined || value.length !== 1) {
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(error)
    }
  }
  return value[0];
}

export function oneOrUndefined<T>(value: T[] | undefined, error: string | Error = "Array contains more than one element"): T | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value.length > 1) {
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(error)
    }
  }
  return value[0];
}


function bestMatchingUnit<ZeroUnit extends string, AllowedUnits extends { [index: number]: string, indexOf: (x: any) => number, length: number }, Unit extends AllowedUnits[number]>(size: number, unit: Unit, units: AllowedUnits, zeroUnit?: Unit | ZeroUnit, factor: number = 1000): Unit | ZeroUnit {
  if (size === 0) {
    return zeroUnit || unit;
  }
  let absSize = Math.abs(size);

  // Find the index of the current unit in the units array
  let unitIndex = units.indexOf(unit);
  if (unitIndex === -1) {
    throw new Error("Unsupported unit");
  }

  // Adjust size and unit to find a more readable format
  while (absSize < 1 && unitIndex > 0) {
    size *= factor;
    absSize *= factor;
    unitIndex -= 1;
  }

  while (absSize >= factor && unitIndex < units.length - 1) {
    size /= factor;
    absSize /= factor;
    unitIndex += 1;
  }
  return units[unitIndex] as Unit;
}

function convertUnits<AllowedUnits extends { [index: number]: string, indexOf: (x: any) => number, length: number }, Unit extends AllowedUnits[number]>(size: number, unit: Unit, units: AllowedUnits, toUnit: Unit, factor: number = 1000) {
  const unitDiff = units.indexOf(unit) - units.indexOf(toUnit);
  return size*(factor**unitDiff);
}

function readableValue<AllowedUnits extends { [index: number]: string, indexOf: (x: any) => number, length: number }, Unit extends AllowedUnits[number]>(size: number, unit: Unit, units: AllowedUnits, zeroUnit?: Unit | string, toUnit?: Unit, factor: number = 1000): string {
  const matchingUnit = toUnit || bestMatchingUnit(size, unit, units, zeroUnit);
  return `${(convertUnits(size, unit, units, matchingUnit, factor)).toLocaleString(undefined, { maximumFractionDigits: 2 })}${matchingUnit}`;
}

export const allowedGrams = ["µg", "mg", "g", "kg"] as const;
export const allowedMeters = ["mm", "cm", "m", "km"] as const;

export function convertGrams(size: number, unit: typeof allowedGrams[number], toUnit: typeof allowedGrams[number]) {
  return convertUnits(size, unit, allowedGrams, toUnit);
}

export function bestMatchingGrams(size: number, unit: typeof allowedGrams[number]) {
  return bestMatchingUnit(size, unit, allowedGrams, "g", 1000)
}

export function grams(size: number, unit: typeof allowedGrams[number], toUnit?: typeof allowedGrams[number]) {
  return readableValue(size, unit, allowedGrams, "g", toUnit);
}

export function convertMeters(size: number, unit: typeof allowedMeters[number], toUnit: typeof allowedMeters[number]) {
  return convertUnits(size, unit, allowedMeters, toUnit);
}

export function bestMatchingMeters(size: number, unit: typeof allowedMeters[number]) {
  return bestMatchingUnit(size, unit, allowedMeters, "m", 1000)
}

export function meters(size: number, unit: typeof allowedMeters[number], toUnit?: typeof allowedMeters[number]) {
  return readableValue(size, unit, allowedMeters, "m", toUnit);
}

export function percent(size: number) {
  return `${(Math.round(size*10000)/100).toLocaleString()}%`
}

export function quote(str: string) {
  return `”${str}“`
}

export function toD3Color(color: Color) {
  const sRGBColor = color.to('srgb');

  const r = sRGBColor.r * 255;
  const g = sRGBColor.g * 255;
  const b = sRGBColor.b * 255;

  return rgb(r, g, b);
}

async function getAssetShell(aasIdentifierOrUrl: string, urlPrefix: string = "url-") {
  const assetShells = structuredClone(await shells.multiSourceShells([aasIdentifierOrUrl], urlPrefix));
  if (Array.isArray(assetShells)) {
    if (assetShells.length !== 1) {
      throw new Error("loadFullAssetsInfo only supports one asset per shell.");
    }
    return assetShells[0] as Asset;
  } else {
    return assetShells as Asset;
  }
}

export async function loadFullAssetInfo(aasIdentifierOrUrl: string, idMap?: AssetIdMap, urlPrefix: string = "url-", onWarning: (msgTitle: string, msgDetails: string) => void = () => {}, simulationChanges?: SimulationChanges | string):
  Promise<{
    asset: Asset,
    submodelReferences: string[],
    description?: ShellDescriptionSmallInterface,
    submodels: IdTree<Submodel[]>,
    address: Address,
    hierarchy?: AssetTree,
    carbonTree?: CarbonTree,
    carbonFootprint?: CarbonFootprint
  }> {
  const asset = await getAssetShell(aasIdentifierOrUrl, urlPrefix);
  const submodelReferences = await shells.submodelReferences(asset.id);
  const description = toDescriptionSmall(asset);
  const submodels = new IdTree<Submodel[]>(await Promise.all(submodelReferences.map((ref) => shells.submodel(asset.id, ref))))
  const address = new Address(submodels);
  const hierarchy = AssetTree.hasAssetTree(submodels) ? new AssetTree(submodels) : undefined;
  simulationChanges = typeof simulationChanges === "string" ? CarbonTree.parseChanges(simulationChanges) : simulationChanges;
  // console.log("CHANGES", simulationChanges);
  if (hierarchy) {
    await hierarchy.buildFullStructure(async (globalAssetId) => {
      // TODO: Reicht auch submodelBySemanticId?
      const subAsset = await getAssetShell(btoa(globalAssetId));
      const subReferences = await shells.submodelReferences(subAsset.id);
      return new IdTree<Submodel[]>(await Promise.all(subReferences.map((ref) => shells.submodel(subAsset.id, ref))))
    });
  }
  const carbonData = hierarchy !== undefined && idMap !== undefined ? await (new CarbonData(hierarchy, idMap)).ready() : undefined;
  const carbonTree = carbonData !== undefined
    ? new CarbonTree(carbonData.tree(), undefined, undefined, undefined, undefined, false, simulationChanges)
    : undefined;
  const cfs = [...submodels.all([IRI.CARBON_FOOTPRINT['0/9'], IRI.CARBON_FOOTPRINT['1/0']], "CarbonFootprint")];
  // const cf = submodels.oneOrUndefined([IRI.CARBON_FOOTPRINT['0/9'], IRI.CARBON_FOOTPRINT['1/0']], "CarbonFootprint");
  let carbonFootprint;
  try {
    carbonFootprint = cfs.length ? CarbonFootprint.fromIdTree(cfs) : undefined;
  } catch (err) {
    console.warn(err, onWarning);
    onWarning(
      `Cannot parse Carbon Footprint for ${description?.name}`,
      `Even though ${description?.name} (with id Short ${description?.idShort}) seems to provide a Carbon Footprint, it is not readable. Be vary when analysing the carbon footprints!`
    )
  }
  return {
    asset,
    description,
    submodelReferences,
    submodels,
    address,
    hierarchy,
    carbonTree,
    carbonFootprint
  }
}

export function or<S extends { length: number }, T extends { length: number }>(first: S | undefined, second: (() => T | undefined) | T | undefined): S | T | undefined {
  if (first !== undefined && first.length > 0) {
    return first
  }
  return typeof second === "function" ? second() : second;
}

export function scaleColor (value: number, minColor: readonly [number, number, number], maxColor: readonly [number, number, number]): [number, number, number] {
  return [
    minColor[0] + (maxColor[0] - minColor[0]) * value,
    minColor[1] + (maxColor[1] - minColor[1]) * value,
    minColor[2] + (maxColor[2] - minColor[2]) * value,
  ];
}

const toHex = (color: number): string => {
  const hex = color.toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
};

export function rgbToHex(r: number, g: number, b: number): string {
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    throw new Error("Invalid rgb. r, g, and b must be between 0 and 255.");
  }

  // Combine the hex values for r, g, and b
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function remToPx(rem: number) {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

export function ucfirst(str: string) {
  return str[0].toUpperCase() + str.slice(1);
}


export type SVGElementConfig = {
  tag: string; // Tag name of the SVG element (e.g., 'tspan', 'text', etc.)
  attributes?: { [key: string]: string | number }; // Optional attributes for the SVG element
  content?: string | SVGElementConfig[]; // Text content or nested SVG elements
};

export function createSVGElement(config: SVGElementConfig): SVGElement {
  const SVG_NS = 'http://www.w3.org/2000/svg'

  // Create the SVG element with the specified tag name
  const element = document.createElementNS(SVG_NS, config.tag)

  // Set the attributes if provided
  if (config.attributes) {
    for (const [key, value] of Object.entries(config.attributes)) {
      element.setAttribute(key, value.toString(10))
    }
  }

  // Add content, which can be either a string or an array of nested elements
  if (typeof config.content === 'string') {
    element.textContent = config.content
  } else if (Array.isArray(config.content)) {
    config.content.forEach(childConfig => {
      const childElement = createSVGElement(childConfig)
      element.appendChild(childElement)
    })
  }

  return element
}

export function createSVGElements(configs: SVGElementConfig[]): SVGElement[] {
  return configs.map(createSVGElement)
}

const SIMULATION_HASH_PREFIX = "simulationChanges="

export function simulationHash(payload?: string) {
  window.location.hash = payload ? SIMULATION_HASH_PREFIX + payload : "";
}

export function simulationFromRoute(route: RouteLocationNormalizedLoaded) {
  if (!route.hash || !route.hash.startsWith(`#${SIMULATION_HASH_PREFIX}`)) {
    return undefined;
  }
  return route.hash.substring(SIMULATION_HASH_PREFIX.length + 1);
}

export function diffToString(value: number, valueString?: string, zeroString?: string, maximumFractionDigits: number = 1) {
  if (Math.abs(value) < Number.EPSILON) {
    value = 0;
  }
  if (value === 0) {
    return `±${zeroString || valueString || value.toLocaleString(undefined, { maximumFractionDigits })}`;
  }
  if (value < 0) {
    return valueString || value.toLocaleString(undefined, { maximumFractionDigits });
  }
  return `+${valueString || value.toLocaleString(undefined, { maximumFractionDigits })}`;
}
