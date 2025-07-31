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
import CarbonTree, { type ConnectionStatus } from '@/lib/model/CarbonTree'
import ShellCard from '@/components/ShellCard.vue'
import { computed } from 'vue'

defineEmits({
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
  }
})

const props = withDefaults(defineProps<{
  parent: CarbonTree,
  child: CarbonTree,
  showToAsset?: boolean,
  statusLeft?: boolean,
  extendedStatus?: boolean,
  statusText?: string,
  compact?: boolean,
  showCo2?: boolean,
  showDiff?: boolean,
  forceStatus?: ConnectionStatus["status"],
  hideSimulationActions?: boolean,
}>(), { showToAsset: false, statusLeft: false, extendedStatus: false, compact: false, showCo2: false, showDiff: false, hideSimulationActions: false, forceStatus: undefined, statusText: undefined })
const id = computed(() => props.child.asset.id);
const status = computed(() => props.forceStatus || props.parent.modification(id.value))
const statusText = computed(() => {
  if (props.statusText !== undefined) {
    return props.statusText;
  }
  if (!props.extendedStatus || (status.value !== "swapped" && status.value !== "modified")) {
    return status.value;
  }
  const connection = props.parent.connectionStatus[id.value];
  if (connection.status === "swapped") {
    if (id.value === connection.otherId) {
      return "swapped in";
    }
    return "swapped out";
  } else if (connection.status === "modified") {
    if (id.value === connection.otherId) {
      return "modified to";
    }
    return "modified from";
  }
  throw new Error("connection unknown or does not match the status")
})

function base64(str: string) {
  return btoa(str);
}
</script>

<template>
  <div
    class="relative rounded-lg z-10 group"
    :class="{
     'border-4': status,
     'border-success': status === 'added',
     'border-warning': status === 'swapped',
     'border-accent': status === 'modified',
     'border-error': status === 'deleted',
    }"
  >
    <div
      v-if="status && statusText.length"
      class="absolute text-center py-2 px-3 z-40"
      :class="{
        'rounded-tr rounded-bl right-0': !statusLeft,
        'rounded-tl rounded-br left-0': statusLeft,
        'bg-success text-success-content': status === 'added',
        'bg-warning text-warning-content': status === 'swapped',
        'bg-accent text-accent-content': status === 'modified',
        'bg-error text-error-content': status === 'deleted',
      }">
      {{ statusText }}
    </div>
    <ShellCard
      :shell="child"
      class="h-full"
      :compact="compact"
      :show-co2="showCo2"
      :to-button="showToAsset ? { name: 'visualization.single', params: { asset: base64(id) } } : undefined"
      to-button-text="View Asset"
      :show-diff="showDiff"
    />
    <div
      v-if="!hideSimulationActions"
      class="absolute inset-0 bg-base-100/50 z-50 rounded hidden group-hover:block px-2 text-center"
    >
      <template v-if="status === 'swapped' || status === 'modified'">
        <button type="button" class="btn btn-block btn-error text-error-content mt-2" @click="$emit('restoreComponent', parent, child)">Restore</button>
        (required for new changes)
      </template>
      <template v-else-if="status !== 'deleted'">
        <button type="button" class="btn btn-block btn-error text-error-content mt-2" @click="$emit('removeComponent', parent, child)">Delete</button>
        <button type="button" class="btn btn-block btn-secondary text-secondary-content mt-2" @click="$emit('swapComponent', parent, child)">Swap</button>
        <button type="button" class="btn btn-block btn-secondary text-secondary-content mt-2" @click="$emit('editComponent', parent, child)">Edit</button>
      </template>
      <button type="button" class="btn btn-block btn-secondary text-secondary-content mt-2" v-else @click="$emit('restoreComponent', parent, child)">Restore</button>
    </div>
  </div>
</template>
