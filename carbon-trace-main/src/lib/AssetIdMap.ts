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

export interface AssetIdsInterface {
  id: string;
  idShort?: string;
  globalAssetId?: string;
  specificAssetIds?: Iterable<string>;
}

export class AssetIds implements AssetIdsInterface {
  id: string;

  idShort?: string;

  globalAssetId?: string;

  specificAssetIds: Set<string>;

  constructor(
    id: string | AssetIdsInterface,
    idShort?: string,
    globalAssetId?: string,
    specificAssetIds?: Iterable<string>
  ) {
    if (typeof id === "string") {
      this.id = id;
      this.idShort = idShort;
      this.globalAssetId = globalAssetId;
      this.specificAssetIds = new Set(specificAssetIds);
    } else {
      this.id = id.id;
      this.idShort = id.idShort;
      this.globalAssetId = id.globalAssetId;
      this.specificAssetIds = new Set(id.specificAssetIds);
    }
  }

  equals(assetIds: { id: string, idShort?: string, globalAssetId?: string, specificAssetIds?: Iterable<string> }) {
    if (assetIds.id !== this.id || assetIds.idShort !== this.idShort || assetIds.globalAssetId !== this.globalAssetId) {
      return false;
    }
    const specificIds = [...(assetIds.specificAssetIds || [])];
    return specificIds.length === this.specificAssetIds.size && specificIds.every(assetId => this.specificAssetIds.has(assetId));
  }
}


export class AssetIdMap {
  byGlobalAssetId: { [globalAssetId: string]: AssetIds; } = {};

  byId: { [id: string]: AssetIds[]; } = {};

  byIdShort: { [idShort: string]: AssetIds[]; } = {};

  bySpecificId: { [specificAssetId: string]: AssetIds[]; } = {};

  constructor(assetIds: Iterable<AssetIds> = []) {
    for (const assetId of assetIds) {
      this.add(assetId);
    }
  }

  onlyById(id: string) {
    return AssetIdMap.getOnly(this.byId, id);
  }

  onlyByIdShort(idShort: string) {
    return AssetIdMap.getOnly(this.byIdShort, idShort);
  }

  onlyBySpecificId(specificId: string) {
    return AssetIdMap.getOnly(this.bySpecificId, specificId);
  }

  private static getOnly<T>(obj: { [key: string]: T[] }, key: string): T | undefined {
    const array = obj[key];
    if (array === undefined || array.length === 0) { return undefined; }
    if (array.length === 1) { return array[0]; }
    throw TypeError(`Array does not contain only one value: ${JSON.stringify(array)}`);
  }

  add(assetIds: AssetIdsInterface) {
    const ids = (assetIds instanceof AssetIds) ? assetIds : new AssetIds(assetIds);
    const { globalAssetId, id, idShort, specificAssetIds } = ids;

    if (globalAssetId !== undefined) {
      if (this.byGlobalAssetId[globalAssetId]) {
        if (!this.byGlobalAssetId[globalAssetId].equals(ids)) {
          throw new TypeError("A different asset with same global asset id is already registered.")
        } else {
          return; // A same one was already added, so this won't be added below as well since it's the same.
        }
      } else {
        this.byGlobalAssetId[globalAssetId] = ids;
      }
    }

    if (!this.byId[id]) {
      this.byId[id] = [ids];
    } else if (!this.byId[id].some(ids.equals)) {
      this.byId[id].push(ids);
    } else {
      return; // A same one was already added, so this won't be added below as well since it's the same.
    }
    // Now it cannot be the same as any other, since the id attribute is mandatory.

    if (idShort !== undefined) {
      if (!this.byIdShort[idShort]) {
        this.byIdShort[idShort] = [ids];
      } else  {
        this.byIdShort[idShort].push(ids);
      }
    }

    for (const specificId of specificAssetIds) {
      if (!this.bySpecificId[specificId]) {
        this.bySpecificId[specificId] = [ids];
      } else {
        this.bySpecificId[specificId].push(ids);
      }
    }
  }
}
