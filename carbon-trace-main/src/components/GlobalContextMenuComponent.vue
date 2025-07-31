<!-- 
	Copyright 2025 Moritz Bock and Software GmbH (previously Software AG)
    
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
    
      http://www.apache.org/licenses/LICENSE-2.0
    
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
-->

<script setup lang="ts">

import { nextTick, ref } from 'vue'
import GlobalContextMenu, { type ContextMenuEntry } from '@/lib/globalContextMenu'

const show = ref(false);

let onClose: (e?: MouseEvent | { pageX: number, pageY: number }) => void = () => {};
const close = (e?: MouseEvent | { pageX: number, pageY: number }) => {
  show.value = false;
  onClose(e);
}


const offsetX = ref(0);
const offsetY = ref(0);
const entries = ref<ContextMenuEntry[]>([]);
const container = ref<HTMLDivElement>();

GlobalContextMenu.register(({ pageX, pageY }, ctxEntries, closeMethod) =>
  {
    show.value = true;
    nextTick(() => {
      const { x, y } = container.value?.getBoundingClientRect() || { x: 0, y: 0 };
      offsetX.value = pageX - x;
      offsetY.value = pageY - y;
      for (const e of ctxEntries) {
        if (!e.triggerEvent) { e.triggerEvent = "click" }
      }
      entries.value = ctxEntries;
      if (closeMethod) {
        onClose = closeMethod;
      }
    })
  },
  close)

</script>
<template>
  <div class="absolute inset-0" style="z-index: 1000;" @click="close" v-show="show" ref="container">
    <ul class="menu bg-base-200 rounded-box w-56 absolute shadow-xl" :style="`top: ${offsetY}px; left: ${offsetX}px`">
      <li v-for="(e, i) of entries" :key="i">
        <a v-on:[e.triggerEvent]="e.onEvent?.($event, e.data)">{{ e.label }}</a>
      </li>
    </ul>
  </div>
</template>
