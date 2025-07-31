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

import type {
  AssetInfo, BasicInfo,
  CarbonTreeType,
  ProductCarbonFootprint,
  TransportCarbonFootprint
} from '@/lib/model/CarbonFootprintType'
import { LifeCyclePhases } from '@/lib/lifeCycleUtil'
import type { SankeyLink, SankeyNode } from 'd3-sankey'
import type CarbonTree from '@/lib/model/CarbonTree'

/**
 * Connection information between two nodes
 */
type ConnectionData = {

  /**
   * Information about how the two nodes are connected
   */
  info: string[],

  /**
   * PCF created by the target node
   */
  pcf: number,

  /**
   * TCF created by the target node
   */
  tcf: number,
}
export type AssetNode = {
  /**
   * global asset id of the asset
   */
  id: string,

  /**
   * Its children and how they are connected
   */
  children: [AssetNode, ConnectionData][],
}
/**
 * Data contained in a node (which represents an asset)
 */
export type NodeData = CarbonTree;
/**
 * Data between links of two nodes
 */
export type LinkData<Type extends 'transport' | 'product'> = {
  /**
   * Whether its a link for a transport or product carbon footprint
   */
  type: Type
  /**
   * source node to whose value this value is added
   */
  source: CarbonTree,
  /**
   * target node which generates this footprint
   */
  target: CarbonTree,
  /**
   * footprint (CO2eq) in kg
   */
  value: number,
  /**
   * color of the link when visualizing
   */
  color: d3.Color,
  /**
   * all available data on the footprint this link refers to
   */
  footprint: Type extends 'transport' ? TransportCarbonFootprint : ProductCarbonFootprint,
  /**
   * life cycle phase of the product carbon footprint this link refers to
   * if it refers to a transport carbon footprint, it's the value of its sibling product carbon footprint
   */
  productLifeCyclePhases: LifeCyclePhases, // LifeCycle phase of the product from its pcf data (tcf copies lifeCycle from pcf)
}
export type Node = SankeyNode<NodeData, LinkData<'transport' | 'product'>>;
export type Link = SankeyLink<NodeData, LinkData<'transport' | 'product'>>;

/**
 * Error thrown when a circular dependency is detected (e.g. node1 links to node2 links to node1)
 */
export class CircularDependencyError extends Error {
  constructor(msg: string) {
    super(msg)
    Object.setPrototypeOf(this, CircularDependencyError.prototype)
  }
}

/**
 * Unit of the CO2eq
 */
export const UNIT = 'kg'

export function isLinkData(value: any): value is LinkData<any> {
  return value.type === "transport" || value.type === "product";
}

/**
 * Check whether a value is a LinkData object
 * @param link value to check
 * @param type which LinkData type to check for ('transport', 'product', any)
 * @returns whether it is a LinkData of the specified type
 */
export function hasLinkData<Type extends 'transport' | 'product' = any>(link: any, type?: Type): link is LinkData<Type> {
  if (type) return type === link.type
  return ['transport', 'product'].includes(link.type)
}
