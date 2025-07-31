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

import { sum, size } from 'lodash'
import lang, { langOrString } from '@/lib/i18n'


type IdsParam<Others = never> = Iterable<string> | string | Others;
type IdsObjectParam = IdsParam<{ ids?: Iterable<string> | string, idShorts?: Iterable<string> | string, semanticIds?: Iterable<string> | string }>
type QueryMethod<ReturnType> = (
  semanticIds?: IdsObjectParam,
  idShorts?: IdsParam,
  ids?: IdsParam,
) => ReturnType

export default class IdTree<T extends { [key: string | number | symbol]: any } = any> {
  id?: string;

  idShort?: string;

  semanticIds: string[];

  parent?: IdTree;

  childById: {
    [id: string]: IdTree,
  };

  childByIdShort: {
    [idShort: string]: IdTree,
  };

  childrenBySemanticId: {
    [semanticId: string]: IdTree[],
  };

  data: T;

  constructor(data: T, parent?: IdTree) {
    [this.id, this.idShort, this.semanticIds] = IdTree.getIds(data);
    this.childById = {};
    this.childByIdShort = {};
    this.childrenBySemanticId = {};
    this.parent = parent;
    this.data = data;
    for (const value of Object.values(data)) {
      this.parseTree(value);
    }
  }

  any: QueryMethod<IdTree | undefined> = (...args) => {
    return this.all(...args).next().value;
  }

  oneOrUndefined: QueryMethod<IdTree | undefined> = (...args) => {
    const trees = [...this.all(...args)];
    if (trees.length > 1) {
      throw Error(`Expected max. one IdTree for the specified Ids, got ${trees.length}.`)
    }
    return trees[0];
  }

  one: QueryMethod<IdTree> = (...args) => {
    const value = this.oneOrUndefined(...args);
    if (value === undefined) {
      throw Error(`Expected exactly one IdTree (got none) for the ids: ${args.join(" or ")}`)
    }
    return value;
  }

  *all(
    semanticIds?: IdsObjectParam,
    idShorts?: IdsParam,
    ids?: IdsParam,
  ): Generator<IdTree> {
    if (IdTree.isIdObject(semanticIds)) {
      ids = semanticIds.ids;
      idShorts = semanticIds.idShorts;
      semanticIds = semanticIds.semanticIds;
    }
    ids = typeof ids === "string" ? [ids] : ids || [];
    idShorts = typeof idShorts === "string" ? [idShorts] : idShorts || [];
    semanticIds = typeof semanticIds === "string" ? [semanticIds] : semanticIds || [];
    const yielded = new Set();
    for (const id of ids) {
      const c = this.childById[id];
      if (c !== undefined && !yielded.has(c)) {
        yielded.add(c);
        yield c;
      }
    }
    for (const semanticId of semanticIds) {
      if (Array.isArray(this.childrenBySemanticId[semanticId])) {
        for (const subTree of this.childrenBySemanticId[semanticId]) {
          if (!yielded.has(subTree)) {
            yielded.add(subTree);
            yield subTree;
          }
        }
      }
    }
    for (const idShort of idShorts) {
      const c = this.childByIdShort[idShort];
      if (c !== undefined && !yielded.has(c)) {
        yielded.add(c);
        yield c;
      }
    }
  }

  get langValue() {
    return langOrString(this.data?.value);
  }

  get displayName() {
    return lang(this.data?.displayName);
  }

  get description() {
    return lang(this.data?.description);
  }

  get stringValue(): string | undefined {
    return this.data?.value.toString();
  }

  valueOf() {
    return this.data.value;
  }

  valueAs<S>(parseMethodOrClass: ((value: any) => S) | { new (value: any): S }): S {
    try {
      return new (parseMethodOrClass as ({ new (value: any): S }))(this.data?.value);
    } catch (e) {
      return (parseMethodOrClass as (value: any) => S)(this.data?.value);
    }
  }

  as<S, U extends IdTree = IdTree>(parseMethodOrClass: ((value: U) => S) | { new (value: U): S }): S {
    try {
      return new (parseMethodOrClass as ({ new (value: any): S }))(this);
    } catch (e) {
      return (parseMethodOrClass as (value: any) => S)(this);
    }
  }

  private static getIds(data: any): [string | undefined, string | undefined, string[]] {
    const ids = [undefined, undefined, []] as [string | undefined, string | undefined, string[]];
    if (typeof data.id === "string") {
      ids[0] = data.id;
    }
    if (typeof data.idShort === "string") {
      ids[1] = data.idShort;
    }
    if (data.semanticId !== null && typeof data.semanticId === "object" && Array.isArray(data.semanticId.keys)) {
      for (const reference of data.semanticId.keys) {
        if (reference.type === "GlobalReference" || reference.type === "ConceptDescription") {
          if (typeof reference.value === "string") {
            ids[2].push(reference.value);
          }
        } else {
          console.warn("Only GlobalReferences and ConceptDescription supported, see", data.semanticId);
        }
      }
    }
    return ids;
  }

  private static isIdObject(obj: any): obj is { ids?: Iterable<string> | string, idShorts?: Iterable<string> | string, semanticIds?: Iterable<string> | string } {
    if (!obj) {
      return false;
    }
    const c = (o: any) => typeof o === "string" || typeof o === "object";
    return c(obj.ids) || c(obj.idShorts) || c(obj.semanticIds) || c(obj.semanticIds);
  }

  private parseTree(data: any) {
    if (data && typeof data === "object") {
      if (Array.isArray(data)) {
        for (const value of data) {
          this.parseTree(value);
        }
      } else {
        const [id, idShort, semanticIds] = IdTree.getIds(data);
        if (id || idShort || semanticIds.length) {
          const child = new IdTree(data, this);
          if (id) {
            console.assert(this.childById[id] === undefined, `Child ${id} already exists in`, this.childById);
            this.childById[id] = child;
          }
          if (idShort) {
            this.childByIdShort[idShort] = child;
          }
          if (semanticIds.length) {
            for (const semanticId of semanticIds) {
              this.childrenBySemanticId[semanticId] = this.childrenBySemanticId[semanticId] || [];
              this.childrenBySemanticId[semanticId].push(child);
            }
          }
        } else {
          for (const value of Object.values(data)) {
            this.parseTree(value);
          }
        }
      }
    }
  }

  size() {
    return Math.max(
      size(this.childById),
      size(this.childByIdShort),
      sum(Object.values(this.childrenBySemanticId).map(size)),
    )
  }

  toString() {
    const content: any[] = [this.size()];
    if (this.id !== undefined) {
      content.push(`id=${this.id}`)
    }
    if (this.idShort !== undefined) {
      content.push(`idShort=${this.idShort}`)
    }
    if (this.semanticIds.length) {
      content.push(`semanticIds=${this.semanticIds}`)
    }
    return `IdTree(${content.join(", ")})`;
  }

  json() {
    return JSON.stringify(this.data, null, 2);
  }
}


