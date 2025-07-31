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

import type { AssetIdMap } from '@/lib/AssetIdMap'
import type { Connections } from '@/lib/model/AssetTree'
import AssetTree from '@/lib/model/AssetTree'
import IdTree from '@/lib/model/IdTree'
import Shells from '@/lib/api/shells'
import type { components } from '@/lib/api/AssetAdministrationShellRepository'
import { ErrorClient } from '@/lib/ErrorDataHandler'
import { IRDI, IRI } from '@/lib/model/semanticIds'
import type { CarbonFootprintType, CarbonTreeType } from '@/lib/model/CarbonFootprintType'
import { ensure } from '@/lib/util'
import { toCarbonFootprintData } from '@/lib/model/CarbonFootprint'


export default class CarbonData {

  connections: { [from: string]: Connections };

  private pendingPromises: Promise<any>[] = [];

  private shells: { [id: string]: IdTree<components['schemas']['AssetAdministrationShell']> } = {};

  private footprintsById: { [id: string]: CarbonFootprintType } = {};

  private readonly nodesById: { [id: string]: IdTree<components['schemas']['Entity']>} = {};

  carbonTreeNodeById: { [id: string]: CarbonTreeType } = {};

  private entryId: string;

  constructor(hierarchy: AssetTree, idMap: AssetIdMap) {
    this.nodesById = CarbonData.parseNodes(hierarchy.nodesByGlobalAssetId, idMap);
    this.connections = CarbonData.parseConnections(hierarchy.connections, idMap);
    this.entryId = idMap.byGlobalAssetId[ensure(hierarchy.entry.data.globalAssetId)].id;
    this.pendingPromises.push(...Object.keys(this.nodesById).map((id) => this.loadShell(id)));
  }

  private async loadShell(aasIdentifier: string) {
    for await (const cf of Shells.submodelsBySemanticId(aasIdentifier, [ IRI.CARBON_FOOTPRINT['0/9'], IRI.CARBON_FOOTPRINT['1/0'] ])) {
      if (!(aasIdentifier in this.footprintsById)) {
        this.footprintsById[aasIdentifier] = {
          product: [],
          transport: [],
        };
      }
      toCarbonFootprintData(new IdTree(cf), this.footprintsById[aasIdentifier]);
    }
    return Promise.all([
      Shells.shell(aasIdentifier).then((d) => {
        this.shells[aasIdentifier] = new IdTree(d);
      }).catch(ErrorClient.addFromApi)
    ]);
  }

  private createOrGetShell(id: string) {
    if (this.carbonTreeNodeById[id]) {
      return this.carbonTreeNodeById[id];
    }
    const shell = this.shells[id];
    const node = this.nodesById[id];
    const footprint = this.footprintsById[id];

    this.carbonTreeNodeById[id] = {
      asset: {
        id,
        idShort: ensure(shell.idShort),
        displayName: shell.displayName,
        description: shell.description,
        footprint
      },
      entity: {
        idShort: ensure(node.idShort),
        displayName: node.displayName,
        description: node.description,
      },
      connections: {},
    };
    return this.carbonTreeNodeById[id];
  }

  private buildCarbonTree() {
    for (const [from, c] of Object.entries(this.connections)) {
      for (const [to, { connection }] of Object.entries(c)) {
        const fromNode = this.createOrGetShell(from);
        const toNode = this.createOrGetShell(to);
        toNode.parent = fromNode;
        fromNode.connections[to] = toNode;
        toNode.connection = {
          idShort: ensure(connection.idShort),
          bulkCount: this.nodesById[to].oneOrUndefined(IRI.HIERARCHY.BULK_COUNT, "BulkCount")?.valueAs(parseFloat),
          displayName: connection.displayName,
          description: connection.description,
        }
      }
    }
  }

  async ready() {
    await Promise.all(this.pendingPromises).catch(ErrorClient.add);
    this.pendingPromises = [];
    this.buildCarbonTree();
    return this;
  }

  tree(): Omit<CarbonTreeType, "connection" | "parent"> {
    return this.carbonTreeNodeById[this.entryId];
  }

  private static parseNodes<T extends object>(nodes: {[globalAssetId: string]: IdTree<T>}, idMap: AssetIdMap) {
    return Object.fromEntries(
      Object.entries(nodes)
        .map(([globalAssetId, entity]) => [idMap.byGlobalAssetId[globalAssetId].id, entity])
    );
  }

  private static parseConnections(connections: { [from: string]: Connections }, idMap: AssetIdMap) {
    return Object.fromEntries(Object.entries(connections)
      .map(
        ([from, subConnections]) => {
          return [
            idMap.byGlobalAssetId[from].id,
            Object.fromEntries(
              Object.entries(subConnections)
                .map(([to, connection]) => [idMap.byGlobalAssetId[to].id, connection])
            )
          ]
        }
      )
    )
  }

}
