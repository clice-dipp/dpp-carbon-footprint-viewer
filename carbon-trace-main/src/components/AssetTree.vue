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

<script lang="ts" setup>
import RuleLine from '@/components/RuleLine.vue'
import { computed, inject, type Ref, ref } from 'vue'
import { EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import type { ShellDescriptionSmallInterface } from '@/lib/api/shellTypes'
import { shellDescriptionsKey } from '@/lib/injectionKeys'
import ShellCard from '@/components/ShellCard.vue'
import CarbonTree from '@/lib/model/CarbonTree'
import InteractiveShellCard from '@/components/InteractiveShellCard.vue'
import { diffToString } from '../lib/util'

function base64(str: string) {
  return btoa(str);
}

const emit = defineEmits({
  addComponent(parent: CarbonTree) {
    return parent instanceof CarbonTree;
  },
  removeComponent(parent: CarbonTree, component: CarbonTree) {
    return component instanceof CarbonTree && parent instanceof CarbonTree;
  },
  swapComponent(parent: CarbonTree, component: CarbonTree) {
    return component instanceof CarbonTree && parent instanceof CarbonTree;
  },
  restoreComponent(parent: CarbonTree, component: CarbonTree) {
    return component instanceof CarbonTree && parent instanceof CarbonTree;
  },
  editComponent(parent: CarbonTree, component: CarbonTree) {
    return component instanceof CarbonTree && parent instanceof CarbonTree;
  },
  updateBulkCount(parent: CarbonTree, component: CarbonTree) {
    return component instanceof CarbonTree && parent instanceof CarbonTree;
  }
})

const props = withDefaults(defineProps<{
  asset: CarbonTree,
  expanded?: boolean | undefined,
  hideExpand?: boolean,
  scrollY?: boolean,
  allowZoom?: boolean;
  showToAsset?: boolean;
  simulationActions?: boolean;
  isDeleted?: boolean;
  showDiff?: boolean;
}>(), { expanded: undefined, scrollY: false, allowZoom: false, showToAsset: false, simulationActions: false, isDeleted: false, showDiff: false })

const expanded = ref(props.expanded !== undefined ? props.expanded : props.hideExpand);

const descriptions = inject<Ref<ShellDescriptionSmallInterface[]>>(shellDescriptionsKey)
const descriptionsById = computed(() => Object.fromEntries((descriptions?.value || []).map(
  (d) => [d.id, d]
)))

const connections = computed(() => {
  return Object.entries(props.asset.connectionStatus)
    .filter(([id, status]) => (status.status !== 'swapped' && status.status !== 'modified') || id === status.originalId)
    .sort(([id1], [id2]) => id1.toString().localeCompare(id2.toString()))
    .map(([id, status]) => (status.status === 'swapped' || status.status === 'modified' ? [id, props.asset.connections[status.otherId], status] as const : [id, props.asset.connections[id] || props.asset.originalConnections[id], status] as const))
})

const zoom = ref(1);
function numValue(e: Event) {
  return parseInt((e.target as HTMLInputElement).value, 10);
}

function updateBulkCount(e: InputEvent, node: CarbonTree) {
  node.bulkCount = numValue(e);
  emit('updateBulkCount', node.parent!, node);
}
</script>
<template>
  <div v-if="allowZoom" class="join join-vertical absolute z-10 bg-base-100">
    <button class="btn btn-xs btn-outline join-item" @click="zoom *= 1.333">+</button>
    <button class="btn btn-xs btn-outline join-item" @click="zoom *= 0.75">-</button>
    <button class="btn btn-xs btn-outline join-item" @click="zoom = 1">&#x26f6;</button>
  </div>
  <div class="ml-40 pl-2" :style="`zoom: ${zoom};`">
    <RuleLine class="h-4 w-4" :class="{ 'bg-red-500': isDeleted }" />
    <button type="button" @click="expanded = !expanded" v-if="!hideExpand" class="btn btn-secondary w-10 h-10 p-0 rounded btn-outline -ml-1">
      <EyeIcon v-show="!expanded" class="w-4" />
      <EyeSlashIcon v-show="expanded" class="w-4" />
    </button>
    <RuleLine class="w-4" :class="{ 'bg-red-500': isDeleted }" />
    <RuleLine class="h-4 w-44 -ml-40 -mb-4 relative" :class="{'rounded-br': connections.length > 1, 'bg-red-500': isDeleted}" />
    <div class="h-4 w-4 from-secondary to-transparent bg-gradient-to-b" v-show="!expanded" />
  </div>
  <div class="relative asset-tree pb-2 pr-2" :class="{'overflow-y-scroll': scrollY}" v-show="expanded" :style="`zoom: ${zoom};`">
    <div class="flex flex-nowrap">
      <div v-for="([id, node, status], i) of connections" :key="id" class="inline-block">
        <RuleLine
          v-if="i < connections.length-1"
          class="w-full"
          :class="{ 'bg-red-500': isDeleted }"
        />
        <div class="inline-block ml-0 mr-auto" v-if="node">
          <div class="text-center relative">
            <button
              type="button"
              class="btn btn-outline btn-secondary btn-sm absolute right-0 -mr-2 z-30 bg-base-100 pb-1"
              v-if="simulationActions && i === connections.length-1 && !isDeleted" @click="$emit('addComponent', asset)"
            >
              +
            </button>
            <RuleLine
              v-if="i === connections.length-1"
              class="block w-1/2 border-r-8"
              :class="{
                'bg-red-500': isDeleted,
                'ml-auto mr-0 rounded-tl': i === 0 && connections.length > 1,
                'rounded-tr': i === connections.length-1 && connections.length > 1,
                'w-4': connections.length === 1,
                'w-full': simulationActions && !isDeleted
              }"
            />
            <div class="bg-base-100 h-4 w-1/2 -ml-2 -mt-4" v-if="i === 0" />
            <RuleLine class="h-5 w-4 inline-block" :class="{ 'bg-red-500': isDeleted }" />
            <div class="-mt-2">
              <!--
              <input type="number" value="5" class="input input-bordered input-secondary bg-secondary border-8 p-0 w-14 text-secondary-content" />
              -->
              <input
                class="inline-block px-3 input input-secondary rounded py-3 text-secondary-content w-20"
                type="number"
                v-if="simulationActions"
                step="1"
                min="0"
                :value="node.bulkCount"
                @change="(e) => updateBulkCount(e, node)"
              />
              <div
                v-else
                class="inline-block px-3 bg-secondary rounded py-3 text-secondary-content"
                :class="{ 'bg-red-500': isDeleted }"
              >{{ node.bulkCount }}<span class="text-xs" v-if="node.bulkCountDiff"> ({{ diffToString(node.bulkCountDiff) }})</span></div>
            </div>
            <RuleLine class="h-5 w-1 inline-block" :class="{ 'bg-red-500': isDeleted }" />
          </div>
          <div class="relative w-80 mx-4 -mt-1.5">
            <ShellCard
              v-if="asset.modification(id) === 'swapped' || asset.modification(id) === 'modified'"
              :shell="asset.originalConnections[asset.connectionStatus[id].originalId]"
              class="shadow-xl w-80 -top-6 absolute opacity-50 z-10 ml-4 hover:z-20 hover:opacity-100 transition-all duration-100"
              style="zoom: 0.9"
              compact
              show-co2
              :to-button="showToAsset ? { name: 'visualization.single', params: { asset: base64(node.asset.id) } } : undefined"
              to-button-text="View Asset"
            />
            <InteractiveShellCard
              class="shadow-xl"
              :class="{'mt-6': asset.modification(id) === 'modified' || asset.modification(id) === 'swapped'}"
              :parent="asset"
              :child="node"
              :show-to-asset="showToAsset"
              :hide-simulation-actions="!simulationActions || isDeleted"
              :force-status="isDeleted ? 'deleted' : undefined"
              :status-text="isDeleted ? 'autom. deleted' : undefined"
              :show-diff="showDiff"
              compact
              show-co2
              @add-component="(p) => $emit('addComponent', p)"
              @remove-component="(p, c) => $emit('removeComponent', p, c)"
              @restore-component="(p, c) => $emit('restoreComponent', p, c)"
              @edit-component="(p, c) => $emit('editComponent', p, c)"
              @swap-component="(p, c) => $emit('swapComponent', p, c)"
            />
          </div>
        </div>
        <AssetTree
          :hide-expand="hideExpand"
          :expanded="expanded"
          :asset="node"
          :is-deleted="isDeleted || status.status === 'deleted'"
          v-if="node instanceof CarbonTree && node.connectionsArray.length"
          :show-to-asset="showToAsset"
          :simulation-actions="simulationActions"
          :show-diff="showDiff"
          @add-component="(p) => $emit('addComponent', p)"
          @remove-component="(p, c) => $emit('removeComponent', p, c)"
          @restore-component="(p, c) => $emit('restoreComponent', p, c)"
          @edit-component="(p, c) => $emit('editComponent', p, c)"
          @swap-component="(p, c) => $emit('swapComponent', p, c)"
          @update-bulk-count="(p, c) => $emit('updateBulkCount', p, c)"
        />
      </div>
    </div>
  </div>
<!--
      <button
        class="btn btn-outline btn-secondary mx-auto w-12 h-12 -ml-4 tooltip cursor-help *:pointer-events-none"
        type="button"
        data-tip="Drop an asset here to add it instead of swapping"
        @dragenter="draggedOver = true"
        @dragleave="draggedOver = draggedOver === true ? false : draggedOver;"
        @dragover="$event.preventDefault()"
        @drop="addShell"
        :class="{'w-40 h-40': draggedShell, 'bg-secondary/40': draggedOver === true }"
      >{{ draggedShell ? 'Drop here to add' : '+' }}<ArrowsPointingInIcon v-if="draggedShell" class="mt-2 h-12 w-12 mx-auto" /></button>
      -->
</template>
