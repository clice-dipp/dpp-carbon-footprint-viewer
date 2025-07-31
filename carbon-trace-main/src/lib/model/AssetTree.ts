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

import IdTree from '@/lib/model/IdTree'
import type { components } from '@/lib/api/AssetAdministrationShellRepository'
import { IRI } from '@/lib/model/semanticIds'
import _ from 'lodash'

type Submodel = components["schemas"]["Submodel"];
type Entity = components["schemas"]["Entity"];
type Relationship = components["schemas"]["RelationshipElement"];
type HierarchyFilter = (trees: IdTree[]) => IdTree

const ARCHE_TYPES = ["OneDown", "OneUp", "Full"] as const;
type ArcheType = typeof ARCHE_TYPES[number];
function isArcheType(value: any): value is ArcheType {
  return ARCHE_TYPES.includes(value);
}

export type Connection = {
  parent: IdTree<Entity>;
  child: IdTree<Entity>;
  connection: IdTree<Relationship>;
  connections?: Connections; // TODO nullable entfernen
}

export type Connections = {
  [to: string]: Connection;
}

export default class AssetTree {
  private readonly sourceTree: IdTree;

  readonly archeType: ArcheType;

  readonly hierarchy: IdTree<Submodel>;

  readonly entry: IdTree<Entity>;

  connections: {[from: string]: Connections} = {};

  nodesByGlobalAssetId: {[globalAssetId: string]: IdTree<Entity>} = {};


  constructor(idTree: IdTree, filter?: HierarchyFilter) {
    this.sourceTree = idTree;
    this.hierarchy = AssetTree.getHierarchicalStructure(idTree, filter);
    this.archeType = this.getArcheType();
    this.entry = this.hierarchy.one(IRI.HIERARCHY.ENTRY) as IdTree<Entity>;
    this.parseNodes([this.entry]);
    this.parseReferences([this.entry]);
    this.logStructure();

    const nodesCount = _.size(this.nodesByGlobalAssetId);
    const connectionsCount = _.sum(Object.values(this.connections).map(_.size));
    if (nodesCount !== connectionsCount + 1) {
      console.warn(`There seems to be a mismatch: ${nodesCount} nodes with ${connectionsCount} connections`);
    } else {
      console.debug(`There are ${nodesCount} nodes with ${connectionsCount} connections`);
    }
  }

  public async buildFullStructure(getChildSubmodels: (globalAssetId: string) => Promise<IdTree>, connections?: typeof this.connections) {
    connections = connections || this.connections;
    const promises: Promise<any>[] = [];
    for (const [, toConnections] of Object.entries(connections)) {
      for (const [toGlobalAssetId, c] of Object.entries(toConnections)) {
        if (c.connections === undefined) {
          const promise = new Promise<any>((resolve, reject) => {
            getChildSubmodels(toGlobalAssetId).then((idTree) => {
              if (!AssetTree.hasAssetTree(idTree)) {
                resolve(undefined);
                return;
              }
              const subAssetTree = new AssetTree(idTree);
              this.integrate(subAssetTree);
              this.buildFullStructure(getChildSubmodels, subAssetTree.connections).then(resolve).catch(reject);
            }).catch(reject);
          });
          promises.push(promise);
        }
      }
    }
    await Promise.all(promises);
  }

  private integrate(subAssetTree: AssetTree) {
    for (const [from, toSubConnections] of Object.entries(subAssetTree.connections)) {
      if (this.connections[from] !== undefined) {
        console.warn(`Connections of ${from} are already set!`);
      } else {
        this.connections[from] = toSubConnections;
      }
    }
    this.nodesByGlobalAssetId = Object.assign(subAssetTree.nodesByGlobalAssetId, this.nodesByGlobalAssetId);
  }

  static hasAssetTree(value: any): value is IdTree {
    return value?.childrenBySemanticId?.[IRI.HIERARCHY.STRUCTURE] !== undefined;
  }

  get reverseRelation() {
    return this.archeType === "OneUp";
  }

  private static getHierarchicalStructure(idTree: IdTree, filter?: HierarchyFilter) {
    const hierarchicalStructures = idTree.childrenBySemanticId[IRI.HIERARCHY.STRUCTURE];
    if (!hierarchicalStructures || hierarchicalStructures.length === 0) {
      throw Error(`${idTree} has no hierarchical structures`);
    }
    if (hierarchicalStructures.length !== 1) {
      if (!filter) {
        throw Error(`${idTree} has multiple hierarchical structures but no filter method was supplied`);
      }
      return filter(hierarchicalStructures) as IdTree<Submodel>;
    }
    return hierarchicalStructures[0] as IdTree<Submodel>;
  }

  private getArcheType() {
    const archeType = this.hierarchy
      .one([IRI.HIERARCHY.ARCHE_TYPE], "ArcheType").stringValue;
    if (!isArcheType(archeType)) {
      throw new Error(`'${archeType}' is not an allowed ArcheType value`);
    }
    return archeType;
  }

  private static globalAssetId(node: IdTree<Entity>) {
    const { globalAssetId, entityType } = node.data;
    if (entityType !== "SelfManagedEntity" || globalAssetId === undefined) {
      throw new Error("Only SelfManagedEntity with globalAssetId is supported for creating a tree.");
    }
    return globalAssetId;
  }

  private parseNodes(nodes: Iterable<IdTree<Entity>>) {
    for (const node of nodes) {
      const globalAssetId = AssetTree.globalAssetId(node);
      this.nodesByGlobalAssetId[globalAssetId] = node;
      this.parseNodes(node.all(IRI.HIERARCHY.NODE));
    }
  }

  private parseReferences(nodes: Iterable<IdTree<Entity>>) {
    for (const node of nodes) {
      const relation = this.reverseRelation ? IRI.HIERARCHY.IS_PART_OF : IRI.HIERARCHY.HAS_PART;
      const relationships = node.all(relation);
      for (const relationship of relationships) {
        const rel: IdTree<Relationship> = relationship.as(AssetTree.modelRelationship);
        const firstPath = rel.data.first.keys.map(k => k.value);
        const secondPath = rel.data.second.keys.map(k => k.value);
        const parent = this.resolveReference(this.reverseRelation ? secondPath : firstPath);
        const child = this.resolveReference(this.reverseRelation ? firstPath : secondPath);
        const parentConnections = this.connections[parent.data.globalAssetId] || {};
        parentConnections[child.data.globalAssetId] =  { parent, child, connection: relationship };
        this.connections[parent.data.globalAssetId!] = parentConnections;
      }
      this.parseReferences(node.all(IRI.HIERARCHY.NODE));
    }
  }

  private resolveReference(path: string[]) {
    let current: IdTree = this.sourceTree;
    for (const anyId of path) {
      current = current.one(anyId, anyId, anyId);
    }
    return current;
  }

  private static modelRelationship(relationship: IdTree<any>): IdTree<Relationship> {
     if (relationship.data.first.type === "ModelReference" && relationship.data.second.type === "ModelReference") {
       return relationship as IdTree<Relationship>
     }
     throw new Error("Only Model Relations ov type ModelReference are allowed in hierarchical structures")
  }

  private logStructure(nodeGlobalAssetId?: string, prefix = '') {
    nodeGlobalAssetId = nodeGlobalAssetId || this.entry.data.globalAssetId;
    console.debug(prefix + nodeGlobalAssetId);

    if (!this.connections[nodeGlobalAssetId!]) {
      return;
    }

    const entries = Object.entries(this.connections[nodeGlobalAssetId!]);
    // Iterate through the children of the current node
    for (let i = 0; i < entries.length; i += 1) {
      // Add a connector for children, and recurse for each child
      const childPrefix = (prefix ? '|   ' : '') + (i === entries.length - 1 ? '└── ' : '├── ');
      this.logStructure(`${entries[i][0]} (${Object.keys(entries[i][1])})`, childPrefix);
    }
  }
}
