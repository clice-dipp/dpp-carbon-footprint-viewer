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

import type { AssetInfo, BasicInfo, CarbonTreeType, ConnectionInfo } from '@/lib/model/CarbonFootprintType'
import CarbonFootprint from '@/lib/model/CarbonFootprint'
import _, { sum } from 'lodash'
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { LifeCyclePhases } from '@/lib/lifeCycleUtil'
import { ErrorClient } from '@/lib/ErrorDataHandler'

function epsilon0(value: number) {
  if (Math.abs(value) < Number.EPSILON) {
    return 0;
  }
  return value;
}

export enum Event {
  Change = "onchange",          // BulkCount or originalConnections changed
  ChildChange = "onchildchange" // BulkCount or connection of a child changed
}

export class CarbonTreeChangeEvent extends CustomEvent<CarbonTree> {
  constructor(tree: CarbonTree) {
    super(Event.Change, { detail: tree })
  }
}

export class CarbonTreeChildChangeEvent extends CustomEvent<CarbonTree> {
  constructor(tree: CarbonTree) {
    super(Event.ChildChange, { detail: tree })
  }
}

export type ConnectionStatus = {
  status: "original" | "deleted" | "added"
} | {
  status: "swapped" | "modified",
  originalId: string,
  otherId: string,
}

export type Connection = {
  status: "original" | "deleted" | "added"
  tree: CarbonTree
} | {
  status: "swapped" | "modified",
  original: CarbonTree,
  other: CarbonTree
}

export type SimulationChanges = {
  asset: AssetInfo<CarbonFootprint>,
  entity: BasicInfo,
  isSimulation: boolean,
  connection?: ConnectionInfo,
  connections: {[id: string]: undefined | SimulationChanges},
  connectionStatus: {[id: string]: ConnectionStatus},
  bulkCount?: number,
}


export default class CarbonTree extends EventTarget implements CarbonTreeType<CarbonFootprint> {

  // Terminology for distinguishing the original values and the modified values:
  // modified: No prefix (e.g. bulkCount, productCo2eq)
  // original: "original"-prefix (e.g. originalBulkCount, originalProductCo2eq)
  // diff: "diff"-suffix (e.g. bulkCountDiff, productCo2eqDiff)
  // Diff is always original subtracted from modified. (e.g. original = 10, modified = 12 => diff = 2)

  readonly asset: AssetInfo<CarbonFootprint>

  readonly connections: { [id: string]: CarbonTree }

  readonly connectionStatus: { [id: string]: ConnectionStatus }

  readonly originalConnections: { [id: string]: CarbonTree }

  readonly entity: BasicInfo

  readonly connection?: ConnectionInfo

  readonly parent?: CarbonTree

  readonly isSimulation: boolean

  #bulkCount?: number

  constructor(
    asset: AssetInfo | CarbonTreeType,
    entity?: BasicInfo,
    connections?: {[id: string]: CarbonTreeType},
    connection?: BasicInfo,
    parent?: CarbonTree,
    isSimulation = false,
    applyChanges?: SimulationChanges
  ) {
    super();
    const originalAsset = asset;
    if (CarbonTree.isCarbonTreeType(asset)) {
      if (asset.parent !== undefined && !(asset.parent instanceof CarbonTree)) {
        throw new Error('parent is no CarbonTree. Only parsing from parent to children allowed')
      }
      entity = asset.entity;
      connections = asset.connections;
      connection = asset.connection;
      parent = asset.parent;
      asset = asset.asset;
    }
    if (entity === undefined || connections === undefined) {
      throw new Error('entity or connections is undefined')
    }
    const createConnections = () => Object.fromEntries(
      Object.entries(connections)
        .map(([k, c]) => [k, this.#toCarbonTree(c, applyChanges?.connections[k])])
      // .map(([k, c]) => [k, c instanceof CarbonTree ? c : this.#toCarbonTree(c, applyChanges?.connections[k])])
    )
    this.asset = CarbonTree.toCarbonFootprintAsset(asset);
    this.entity = entity;
    this.connection = connection;
    this.parent = parent;
    this.connections = createConnections()
    this.originalConnections = createConnections()
    this.connectionStatus = Object.fromEntries(Object.keys(this.originalConnections).map((k) => ([k, { status: "original" }])))
    this.isSimulation = isSimulation;

    if (originalAsset instanceof CarbonTree) {
      console.warn(`asset ${asset} is already of type CarbonTree`)
      // eslint-disable-next-line no-constructor-return
      return originalAsset;
    }

    if (applyChanges && applyChanges.asset.id === this.asset.id) {
      this.asset = applyChanges.asset;
      this.entity = applyChanges.entity;
      this.isSimulation = applyChanges.isSimulation;
      this.connection = applyChanges.connection;
      this.connectionStatus = applyChanges.connectionStatus;
      this.#bulkCount = applyChanges.bulkCount;

      const additionalConnections = Object.entries(applyChanges.connections).filter(([id]) => this.connections[id] === undefined);
      for (const [id, additionalConnection] of additionalConnections) {
        this.connections[id] = this.#toCarbonTree(additionalConnection, applyChanges?.connections[id]);
      }
      const deleteFromConnections = Object.entries(this.connectionStatus)
        .filter(([id, status]) => status.status === "deleted" || (status.status === "swapped" || status.status === "modified") && id === status.originalId)
        .map(([id]) => id);
      for (const id of deleteFromConnections) {
        delete this.connections[id];
      }
    }
  }

  private static isCarbonTreeType(node: any): node is CarbonTreeType {
    return "asset" in node && "connections" in node && "entity" in node;
  }

  private static toCarbonFootprintAsset(asset: AssetInfo): AssetInfo<CarbonFootprint> {
    if (asset.footprint === undefined || asset.footprint instanceof CarbonFootprint) {
      return asset as AssetInfo<CarbonFootprint>;
    }
    const a = _.cloneDeep(asset);
    a.footprint = new CarbonFootprint(a.footprint!);
    return a as AssetInfo<CarbonFootprint>;
  }

  #toCarbonTree(tree: CarbonTreeType, applyChanges?: SimulationChanges) {
    return new CarbonTree(
      tree.asset,
      tree.entity,
      tree.connections,
      tree.connection,
      this,
      false,
      applyChanges
    )
  }

  forEach(cb: (tree: CarbonTree, i: number, depth: number, bulkCount: number) => boolean | undefined | void) {
    let i = 0;
    const todo: [CarbonTree, number, number, number][] = [[this, i, 0, 1]];
    while (todo.length > 0) {
      const current = todo.shift()!;
      if (cb(...current) !== false) {
        for (const connection of current[0].connectionsArray) {
          i += 1;
          todo.push([connection, i, current[2] + 1, connection.bulkCount * current[3]])
        }
      }
    }
  }

  resetConnection(treeId: string, withEvent = true): CarbonTree | boolean {
    const current = this.connectionStatus[treeId];
    const dispatchEvent = withEvent ? () => this.dispatchEvent(new CarbonTreeChangeEvent(this)) : () => {};
    if (current === undefined || current.status === "original") {
      return false;
    }
    if (current.status === "added") {
      delete this.connectionStatus[treeId];
      const deletedAddedTree = this.connections[treeId];
      delete this.connections[treeId];
      dispatchEvent();
      return deletedAddedTree;
    }
    if (current.status === "deleted") {
      this.connections[treeId] = this.originalConnections[treeId];
      this.connectionStatus[treeId] = { status: "original" };
      dispatchEvent();
      return true;
    }
    if (current.status === "swapped" || current.status === "modified") {
      const { originalId, otherId } = current;
      this.connections[originalId] = this.originalConnections[originalId];
      const oldSwapped = this.connections[otherId];
      delete this.connectionStatus[otherId];
      this.connectionStatus[originalId] = { status: "original" };
      dispatchEvent();
      return oldSwapped;
    }
    throw new Error(`Status ${current.status} is unknown`)
  }

  addConnection(tree: CarbonTreeType): CarbonTree {
    if (this.connections[tree.asset.id]) {
      throw new Error("Connection already exists");
    }
    const t = this.#toCarbonTree(tree);
    this.connections[t.asset.id] = t;
    this.connectionStatus[t.asset.id] = { status: "added" };
    this.dispatchEvent(new CarbonTreeChangeEvent(this));
    return t;
  }

  deleteConnection(id: string) {
    const changedSomething = this.resetConnection(id);
    if (this.connections[id] !== undefined) {
      delete this.connections[id];
      this.connectionStatus[id] = { status: "deleted" };
      this.dispatchEvent(new CarbonTreeChangeEvent(this));
    } else if (changedSomething) {
      this.dispatchEvent(new CarbonTreeChangeEvent(this));
    }
  }

  modifyConnection(oldTreeOrId: CarbonTree | string, newCarbonTree: CarbonTreeType): CarbonTree {
    return this.swapConnection(oldTreeOrId, newCarbonTree, "modified");
  }

  swapConnection(oldTreeOrId: CarbonTree | string, newCarbonTree: CarbonTreeType, status: "swapped" | "modified" = "swapped"): CarbonTree {
    const newTree = this.#toCarbonTree(newCarbonTree);
    const oldId = typeof oldTreeOrId === 'string' ? oldTreeOrId : oldTreeOrId.asset.id;
    if (this.connections[oldId] === undefined && this.originalConnections[oldId] === undefined) {
      throw new Error(`Cannot swap ${oldId} because it does not exist in the current tree`)
    }
    this.resetConnection(newTree.asset.id, false);
    this.resetConnection(oldId, false);
    delete this.connections[oldId];
    this.connections[newTree.asset.id] = newTree;
    this.connectionStatus[oldId] = { status, originalId: oldId, otherId: newTree.asset.id };
    this.connectionStatus[newTree.asset.id] = { status, originalId: oldId, otherId: newTree.asset.id };
    this.dispatchEvent(new CarbonTreeChangeEvent(this));
    return newTree;
  }

  modification(id: string | number): false | Exclude<ConnectionStatus["status"], "original"> {
    if (this.connectionStatus[id] === undefined || this.connectionStatus[id].status === "original") {
      return false;
    }
    return this.connectionStatus[id].status as Exclude<ConnectionStatus["status"], "original">;
  }

  get connectionsArray(): CarbonTree[] {
    return Object.values(this.connections);
  }

  get originalConnectionsArray(): CarbonTree[] {
    return Object.values(this.originalConnections);
  }

  get bulkCount(): number {
    if (this.#bulkCount !== undefined) {
      return this.#bulkCount;
    }
    if (this.connection?.bulkCount !== undefined) {
      return this.connection?.bulkCount;
    }
    console.debug(`No bulkCount set for ${this.entity.idShort}`)
    return 1;
  }

  set bulkCount(value: number) {
    this.#bulkCount = value;
    this.dispatchEvent(new CarbonTreeChangeEvent(this))
  }

  get originalBulkCount(): number | undefined {
    return this.connection?.bulkCount;
  }

  get bulkCountDiff(): number {
    return this.bulkCount - (this.originalBulkCount || 1);
  }

  get originalChildrenProductCo2eq(): number | undefined {
    const connections = this.originalConnectionsArray;
    if (connections.length === 0) {
      return undefined;
    }
    return _.sum(connections.map((c) => (c.originalBulkCount || 1) * c.originalProductCo2eq));
  }

  get childrenProductCo2eq(): number | undefined {
    const connections = this.connectionsArray;
    if (connections.length === 0) {
      return undefined;
    }
    return _.sum(connections.map((c) => c.bulkCount * c.productCo2eq));
  }

  get childrenProductCo2eqDiff(): number | undefined {
    const { childrenProductCo2eq, originalChildrenProductCo2eq } = this;
    if (childrenProductCo2eq === undefined || originalChildrenProductCo2eq === undefined) {
      return undefined;
    }
    return epsilon0(childrenProductCo2eq - originalChildrenProductCo2eq);
  }

  get originalProductCo2eq() {
    const { originalChildrenProductCo2eq } = this;
    if (this.asset.footprint === undefined) {
      return originalChildrenProductCo2eq || 0;
    }
    if (originalChildrenProductCo2eq === undefined) {
      return this.asset.footprint.productCo2eq;
    }
    if (originalChildrenProductCo2eq > this.asset.footprint.productCo2eq) {
      console.warn("product co2eq mismatch between own footprint and calculated sub footprints")
      ErrorClient.add({
        message: "Mismatch between asset CO2eq and its components CO2eq",
        details: `The asset's (${this.displayNames[0]}) CO2eq is lower than the sum of its components CO2eqs. (1)`,
      })
      return originalChildrenProductCo2eq;
    }
    return this.asset.footprint.productCo2eq;
  }

  get productCo2eq() {
    const childrenCo2eq = this.childrenProductCo2eq || 0;
    if (this.asset.footprint === undefined) {
      return childrenCo2eq;
    }
    const originalChildrenCo2eq = this.originalChildrenProductCo2eq || 0;
    if (originalChildrenCo2eq > this.asset.footprint.productCo2eq) {
      ErrorClient.add({
        message: "Mismatch between asset CO2eq and its components CO2eq",
        details: `The asset's (${this.displayNames[0]}) CO2eq is lower than the sum of its components CO2eqs. (2)`,
      })
      return childrenCo2eq - originalChildrenCo2eq;
    }
    return this.asset.footprint.productCo2eq + childrenCo2eq - originalChildrenCo2eq;
  }

  // This is being used even though your IDE might think otherwise.
  get fixedValue() {
    return this.totalCo2eq;
  }

  get productCo2eqDiff() {
    const { originalProductCo2eq, productCo2eq } = this;
    return epsilon0(productCo2eq - originalProductCo2eq);
  }

  get originalAssetProductCo2eq() {
    const children = this.originalChildrenProductCo2eq;
    if (children === undefined) {
      return this.asset.footprint?.productCo2eq;
    }
    if (this.asset.footprint === undefined) {
      return undefined;
    }
    return this.asset.footprint.productCo2eq - children;
  }

  get assetProductCo2eq() {
    // We cannot modify an element itself,
    // only replace it (which is then forms a new CarbonTree) or its children
    // (which does not affect the assets ProductCo2eq, except the old has no and the new has children)
    return this.originalAssetProductCo2eq;
  }

  get assetProductCo2eqDiff() {
    // See assetProductCo2eq, thus there is no diff.
    return 0;
  }

  get coveredLifeCyclePhases() {
    if (this.asset.footprint === undefined) {
      return new LifeCyclePhases();
    }
    return this.asset.footprint.coveredLifeCyclePhases;
  }

  get byChildrenCoveredLifeCyclePhases() {
    const phases: LifeCyclePhases[] = []
    const todo = this.connectionsArray
    while (todo.length > 0) {
      const current = todo.shift()!;
      phases.push(current.coveredLifeCyclePhases);
      todo.push(...current.connectionsArray);
    }
    return LifeCyclePhases.merged(...phases);
  }

  get originalByChildrenCoveredLifeCyclePhases() {
    const phases: LifeCyclePhases[] = []
    const todo = this.originalConnectionsArray
    while (todo.length > 0) {
      const current = todo.shift()!;
      phases.push(current.originalByChildrenCoveredLifeCyclePhases);
      todo.push(...current.originalConnectionsArray);
    }
    return LifeCyclePhases.merged(...phases);
  }

  get byChildrenCoveredLifeCyclePhasesDiff() {
    const lcDiff = this.byChildrenCoveredLifeCyclePhases.diff(this.originalByChildrenCoveredLifeCyclePhases);
    return { ...lcDiff, onlyOriginal: lcDiff.onlyOther, onlyCurrent: lcDiff.onlyThis };
  }

  get originalChildrenTransportCo2eq(): number | undefined {
    const connections = this.originalConnectionsArray;
    if (connections.length === 0) {
      return undefined;
    }
    return _.sum(connections.map((c) => (c.originalBulkCount || 1) * c.originalTransportCo2eq));
  }

  get originalTransportCo2eq() {
    const { originalChildrenTransportCo2eq } = this;
    if (this.asset.footprint === undefined) {
      return originalChildrenTransportCo2eq || 0;
    }
    return this.asset.footprint.transportCo2eq;
  }

  get childrenTransportCo2eq(): number | undefined {
    const connections = this.connectionsArray;
    if (connections.length === 0) {
      return undefined;
    }
    return _.sum(connections.map((c) => c.bulkCount * c.transportCo2eq));
  }

  get transportCo2eq() {
    if (this.asset.footprint === undefined) {
      return 0;
    }
    return this.asset.footprint.transportCo2eq;
  }

  get transportCo2eqDiff() {
    return epsilon0(this.transportCo2eq - this.originalTransportCo2eq);
  }

  get originalAssetTransportCo2eq() {
    return this.asset.footprint?.transportCo2eq || 0;
  }

  get assetTransportCo2eq() {
    // See assetProductCo2eq for explanation
    return this.originalAssetTransportCo2eq;
  }

  get assetTransportCo2eqDiff() {
    // See assetProductCo2eqDiff for explanation
    return 0;
  }

  get totalCo2eq() {
    return this.productCo2eq + this.transportCo2eq;
  }

  get originalTotalCo2eq() {
    return this.originalProductCo2eq + this.originalTransportCo2eq;
  }

  get totalCo2eqDiff() {
    return epsilon0(this.totalCo2eq - this.originalTotalCo2eq);
  }

  get childrenTotalCo2eq() {
    const { childrenTransportCo2eq, childrenProductCo2eq } = this;
    if (childrenTransportCo2eq === undefined && childrenProductCo2eq === undefined) {
      return undefined;
    }
    return (childrenProductCo2eq || 0) + (childrenTransportCo2eq || 0)
  }

  get originalChildrenTotalCo2eq() {
    const { originalChildrenTransportCo2eq, originalChildrenProductCo2eq } = this;
    if (originalChildrenTransportCo2eq === undefined && originalChildrenProductCo2eq === undefined) {
      return undefined;
    }
    return (originalChildrenTransportCo2eq || 0) + (originalChildrenProductCo2eq || 0)
  }

  get childrenTotalCo2eqDiff() {
    const { childrenTotalCo2eq, originalChildrenTotalCo2eq } = this;
    if (childrenTotalCo2eq === undefined || originalChildrenTotalCo2eq === undefined) {
      return undefined;
    }
    return epsilon0(childrenTotalCo2eq - originalChildrenTotalCo2eq);
  }

  get name(): string {
    return this.asset.displayName || this.asset.idShort || this.entity.displayName;
  }

  get description(): string | undefined {
    return this.entity.description || this.asset.description;
  }

  get idShort(): string {
    return this.entity.idShort;
  }

  get displayNames(): [string, string] | [string] | [] {
    return _.uniq(_.compact([this.entity.displayName, this.asset.displayName])) as [string, string];
  }

  get descriptions(): [string, string] | [string] | [] {
    return _.uniq(_.compact([this.entity.description, this.asset.description])) as [string, string];
  }

  get idShorts(): [string, string] {
    return [this.entity.idShort, this.asset.idShort]
  }

  get isCurrentConnection(): boolean {
    if (!this.parent) {
      throw new Error('Tree has no parent to check whether it is an original connection')
    }
    return typeof this.parent.connections[this.asset.id] === "string" || this.parent.connections[this.asset.id] === this.asset.id;
  }

  get isOriginalConnection(): boolean {
    if (!this.parent) {
      throw new Error('Tree has no parent to check whether it is an original connection')
    }
    return this.parent.originalConnections[this.asset.id] !== undefined;
  }

  get isSwappedOut(): boolean {
    return this.isOriginalConnection && (this.parent!.connections[this.asset.id] as CarbonTree).asset.id === this.asset.id;
  }

  get isSwappedIn(): boolean {
    return !this.isOriginalConnection && typeof this.parent!.connections[this.asset.id] === "string";
  }

  get directComponentsCount() {
    return sum(this.connectionsArray.map(c => c.bulkCount));
  }

  get allComponentsCount() {
    // Subtract the +1 from the highest hierarchy.
    return this.#allComponentsCount - 1;
  }

  get #allComponentsCount(): number {
    return sum(this.connectionsArray.map(c => c.#allComponentsCount * c.bulkCount)) + 1;
  }

  get originalDirectComponentsCount() {
    return sum(this.originalConnectionsArray.map(c => c.originalBulkCount || 1));
  }

  get originalAllComponentsCount() {
    // Subtract the +1 from the highest hierarchy.
    return this.#originalAllComponentsCount - 1;
  }

  get #originalAllComponentsCount(): number {
    return sum(this.originalConnectionsArray.map(c => c.#originalAllComponentsCount * (c.originalBulkCount || 1))) + 1;
  }

  get directComponentsCountDiff() {
    return this.directComponentsCount - this.originalDirectComponentsCount;
  }

  get allComponentsCountDiff() {
    return this.allComponentsCount - this.originalAllComponentsCount;
  }

  get hasChanges(): boolean {
    return this.bulkCountDiff !== 0
      || Object.values(this.connectionStatus).some(({ status }) => status !== "original")
      || this.connectionsArray.some((c) => c.hasChanges)
  }

  serializeChanges(forceInclusion = false): SimulationChanges | undefined {
    if (!this.hasChanges && !forceInclusion) {
      return undefined;
    }
    const {
      asset,
      entity,
      isSimulation,
      connection,
      connectionStatus,
    } = this;
    const connections = Object.fromEntries(
      Object.entries(this.connections)
      .map(([id, tree]) => ([id, tree.serializeChanges(this.connectionStatus[id].status !== "deleted" && this.connectionStatus[id].status !== "original")]))
    );

    return {
      asset,
      entity,
      isSimulation,
      connection,
      connectionStatus,
      connections,
      bulkCount: this.#bulkCount,
    }
  }

  stringifyChanges(): string {
    const changes = this.serializeChanges();
    if (changes === undefined) {
      return "";
    }
    console.log("RANDOM", Math.random() * 1000);
    console.log("=== DA CHANGE ===", changes);
    const str = JSON.stringify(changes, (key, value) => {
      if (value instanceof LifeCyclePhases) {
        return {
          "_type": "LifeCyclePhases",
          originalString: value.original
        }
      } else if (value instanceof CarbonFootprint) {
        return {
          "_type": "CarbonFootprint",
          product: value.product,
          transport: value.transport
        }
      } else if (value instanceof Date) {
        return {
          "_type": "Date",
          value: value.toUTCString()
        };
      }
      return value;
    });

    return compressToEncodedURIComponent(str);
  }

  static parseChanges(changes: string): SimulationChanges {
    const c = JSON.parse(decompressFromEncodedURIComponent(changes), (__, value) => {
      const type = value["_type"];
      if (type === "LifeCyclePhases") {
        return new LifeCyclePhases(value.originalString);
      } else if (type === "CarbonFootprint") {
        return new CarbonFootprint(value.product, value.transport);
      } else if (type === "Date") {
        return new Date(value);
      }
      return value;
    });
    console.log("Parsed CHANGES", c);
    return c;
  }
}
