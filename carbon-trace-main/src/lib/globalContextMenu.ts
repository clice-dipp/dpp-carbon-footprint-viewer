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

import type { ErrorDataHandler } from '@/lib/ErrorDataHandler'

export type ContextMenuEntry = {
  label: string;
  data?: Record<string, unknown>;
  onEvent?: (e: MouseEvent, data: ContextMenuEntry["data"]) => any;
  triggerEvent?: string;
}

type Event = MouseEvent | { pageX: number; pageY: number };

export default class GlobalContextMenu {
  static #showMethod?: (e: Event, entries: ContextMenuEntry[], onClose?: (e?: Event) => void) => any;

  static #hideMethod?: (e?: Event) => any;

  static #entries: ContextMenuEntry[] = [];

  static #event?: Event;

  static #onClose?: (e?: Event) => void;

  static show(e: Event, entries: ContextMenuEntry[], onClose?: (e?: Event) => void): void {
    if (entries.length === 0) {
      return;
    }
    if (GlobalContextMenu.#showMethod) {
      GlobalContextMenu.#showMethod(e, entries);
    } else {
      GlobalContextMenu.#entries = entries;
      GlobalContextMenu.#event = e;
      GlobalContextMenu.#onClose = onClose;
    }
  }

  static hide(e?: Event): void {
    if (GlobalContextMenu.#hideMethod) {
      GlobalContextMenu.#hideMethod(e);
    } else {
      GlobalContextMenu.#entries = [];
      GlobalContextMenu.#event = undefined;
      GlobalContextMenu.#onClose = undefined;
    }
  }

  static register(showMethod: (e: Event, entries: ContextMenuEntry[], onClose?: (e?: Event) => void) => any, hideMethod: (e?: Event) => any): void {
    GlobalContextMenu.#showMethod = showMethod;
    GlobalContextMenu.#hideMethod = hideMethod;
    if (GlobalContextMenu.#entries.length !== 0 && GlobalContextMenu.#event) {
      showMethod(GlobalContextMenu.#event, GlobalContextMenu.#entries, GlobalContextMenu.#onClose);
    }
    GlobalContextMenu.#entries = [];
    GlobalContextMenu.#event = undefined;
    GlobalContextMenu.#onClose = undefined;
  }
}
