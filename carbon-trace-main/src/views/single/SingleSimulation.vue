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
import { createUpdateQuery, type loadFullAssetInfo, SIMULATION_HASH_PREFIX, simulationHash } from '@/lib/util'
import AssetTree from '@/components/AssetTree.vue'
import EditModal from '@/components/EditModal.vue'
import { computed, nextTick, ref, watch } from 'vue'
import { Connection, Event as CarbonTreeEvent } from '@/lib/model/CarbonTree'
import type CarbonTree from '@/lib/model/CarbonTree'
import type { CarbonTreeType } from '@/lib/model/CarbonFootprintType'
import { LifeCyclePhases } from '@/lib/lifeCycleUtil'
import { useRouter } from 'vue-router'
import { ArrowRightIcon, ArrowDownIcon } from '@heroicons/vue/24/outline'
import ShellCard from '@/components/ShellCard.vue'
import InteractiveShellCard from '@/components/InteractiveShellCard.vue'
import ChangeVisualization from '@/components/ChangeVisualization.vue'
import { storageRef } from '@/lib/storage'

const props = defineProps<{ info: Awaited<ReturnType<typeof loadFullAssetInfo>>}>()
const router = useRouter();
const updateQuery = createUpdateQuery(router);

const rerenderKey = ref(0);
const editModal = ref<InstanceType<typeof EditModal>>();
const hidden = ref(false);
function forceRerender() {
  rerenderKey.value += 1;
}

console.log("RERENDER", forceRerender);

const treeWrapper = ref<HTMLDivElement>();
const keepScrollPosition = (callable: () => any) => {
  if (!treeWrapper.value) {
    callable();
    return;
  }
  const { scrollLeft, scrollTop } = treeWrapper.value.querySelector("* > .asset-tree") || { scrollLeft: 0, scrollTop: 0 };
  callable();
  nextTick(() => {
    treeWrapper.value?.querySelector("* > .asset-tree")?.scrollTo({
      left: scrollLeft,
      top: scrollTop,
    });
  })
}


function removeComponent(parent: CarbonTree, component: CarbonTree) {
  console.log("trololo");
  keepScrollPosition(() => {
    parent.deleteConnection(component.asset.id);
    forceRerender();
    simulationHash(props.info.carbonTree?.stringifyChanges());
  });
}

function restoreComponent(parent: CarbonTree, component: CarbonTree) {
  keepScrollPosition(() => {
    parent.resetConnection(component.asset.id);
    forceRerender();
    simulationHash(props.info.carbonTree?.stringifyChanges());
  });
}
function editComponent(parent: CarbonTree, component: CarbonTree, swap = false) {
  editModal.value?.show({
    base: swap ? undefined : component,
    swap,
    newGenerateName: (n) => `${n}${swap ? '' : ' (modified)'}`,
    newGenerateDescription: (d, n) => `${swap ? 'Swapped in' : 'Modified'} version of ${n}.${d ? ` ${d}` : ''}`,
    newTitle: swap ? `Swap Component` : `Edit Component`,
    newSubmitText: swap ? `Swap` : `Edit`,
  }).then((treeType: CarbonTreeType) => {
    keepScrollPosition(() => {
      if (component.isSimulation) {
        parent.resetConnection(component.asset.id);
        parent.addConnection(treeType);
      } else {
        if (swap) {
          parent.swapConnection(component, treeType);
        } else {
          parent.modifyConnection(component, treeType);
        }
      }
      forceRerender();
      simulationHash(props.info.carbonTree?.stringifyChanges());
    })
  }).catch(() => {})
}

function swapComponent(parent: CarbonTree, component: CarbonTree) {
  return editComponent(parent, component, true);
}

function addComponent(tree: CarbonTree) {
  editModal.value?.show({
    newTitle: "Add Component",
    newSubmitText: "Add Component",
    newGenerateName: (n) => `New Component (based on ${n})`,
    newGenerateDescription: (d, n) => `Component based on ${n}.`,
  }).then((treeType: CarbonTreeType) => {
    keepScrollPosition(() => {
      tree.addConnection(treeType);
      simulationHash(props.info.carbonTree?.stringifyChanges());
      forceRerender();
      // props.info.carbonTree?.parseChanges()
    })
  }).catch(console.error);
}

function updateBulkCount(parent: CarbonTree, component: CarbonTree) {
  simulationHash(props.info.carbonTree?.stringifyChanges());
  forceRerender();
}

function resetSimulation () {
  window.location.hash = '';
}

const changes = computed<Connection[]>(() => {
  const connections = [] as Connection[];
  props.info.carbonTree?.forEach((t) => {
    for (const [id, status] of Object.entries(t.connectionStatus)) {
      switch (status.status) {
        case 'original':
          break
        case 'swapped':
        case 'modified':
          if (status.otherId === id) {
            connections.push({
              status: status.status,
              original: t.originalConnections[status.originalId],
              other: t.connections[status.otherId]
            })
          }
          break
        default:
          connections.push({
            status: status.status,
            tree: t.connections[id] || t.originalConnections[id]
          })
      }
    }
    if (t.bulkCountDiff !== 0) {
      connections.push({
        status: 'original',
        tree: t,
      })
    }
  })
  return connections;
})

const hasChanges = computed(() => props.info.carbonTree?.hasChanges);
watch(hasChanges, () => {
  if (hasChanges.value) {
    localStorage.setItem("carbonTreeSimulationId", props.info.carbonTree?.asset.id || "")
    localStorage.setItem("carbonTreeSimulation", props.info.carbonTree?.stringifyChanges() || "");
  }
}, { immediate: true });

const simulationLoadable = ref(false);
watch(hasChanges, () => {
  simulationLoadable.value = (!hasChanges.value && localStorage.getItem("carbonTreeSimulationId") === props.info.carbonTree?.asset.id)
}, { immediate: true })

function loadSimulation() {
  const simulationData = localStorage.getItem("carbonTreeSimulation");
  if (simulationData?.length) {
    simulationHash(simulationData);
  }
}
</script>
<template>
  <EditModal ref="editModal" />
  <div v-if="info.carbonTree">
    <!--
    <div class="text-center p-4">
      <ArrowDownIcon class="w-16 h-16 inline-block" />
    </div>
    -->
    <div class="bg-accent mx-4 p-4 rounded-2xl">
      <div class="bg-base-100 pt-4" v-if="!hidden" ref="treeWrapper">
        <ShellCard :shell="info.carbonTree" class="shadow-xl w-80 ml-4 mb-4" compact show-co2 show-diff />
        <AssetTree
          :asset="info.carbonTree"
          :hide-expand="true"
          :scroll-y="true"
          :allow-zoom="true"
          :simulation-actions="true"
          @add-component="addComponent"
          @remove-component="removeComponent"
          @restore-component="restoreComponent"
          @swap-component="swapComponent"
          @edit-component="editComponent"
          @update-bulk-count="updateBulkCount"
          :key="rerenderKey"
        />
      </div>
    </div>
    <div class="p-4 sticky bottom-0 self-end z-10 flex gap-4">
      <template v-if="hasChanges">
        <div class="alert alert-info shadow-lg fle">
          <ArrowDownIcon class="w-6" />
          <span>
            See the a summary and how the changes influence the carbon footprint below.
          </span>
        </div>
        <button class="btn btn-outline bg-base-100 shadow-lg pt-5 pb-9" style="min-width: 33.333%;" type="button" @click="resetSimulation">Reset Simulation</button>
      </template>
      <button class="btn btn-outline flex-grow bg-base-100 shadow-lg pt-5 pb-9" type="button" @click="loadSimulation" v-else-if="simulationLoadable">Reload last Simulation</button>
    </div>
  </div>
  <div
    v-else
    class="p-4"
  >
    <div class="alert alert-error">
      This asset cannot be simulated because it does not provide information about its sub-components.
    </div>
  </div>
  <div v-if="hasChanges" class="p-4">
    <h2 class="text-xl py-4">What changes?</h2>
    <ChangeVisualization :tree="info.carbonTree!" :key="rerenderKey" />
    <h2 class="text-xl py-4">Changes being Simulated</h2>
    <div class="grid grid-cols-4 gap-4">
      <template v-for="(change, i) of changes" :key="i">
        <InteractiveShellCard
          @add-component="addComponent"
          @remove-component="removeComponent"
          @restore-component="restoreComponent"
          @swap-component="swapComponent"
          @edit-component="editComponent"
          v-if="change.status === 'added' || change.status === 'deleted'"
          :parent="change.tree.parent!"
          :child="change.tree"
          compact
          show-co2
        />
        <div v-else-if="change.status === 'modified' || change.status === 'swapped'" class="col-span-2 flex relative">
          <InteractiveShellCard
            @add-component="addComponent"
            @remove-component="removeComponent"
            @restore-component="restoreComponent"
            @swap-component="swapComponent"
            @edit-component="editComponent"
            class="w-1/2"
            :parent="change.original.parent!"
            :child="change.original"
            extended-status
            compact
            show-co2
          />
          <ArrowRightIcon class="w-12 inline-block" />
          <InteractiveShellCard
            @add-component="addComponent"
            @remove-component="removeComponent"
            @restore-component="restoreComponent"
            @swap-component="swapComponent"
            @edit-component="editComponent"
            class="w-1/2"
            :parent="change.other.parent!"
            :child="change.other"
            status-left
            compact
            extended-status
            show-co2
          />
        </div>
        <div v-else-if="change.status === 'original'" class="h-full relative flex items-center min-h-60">
          <div class="left-0 top-0 border-4 border-secondary rounded-lg h-full absolute" style="scale: 85%; width: 108.1%;">
            <ShellCard
              class="h-full"
              :shell="change.tree"
              compact
              show-co2
            />
          </div>
          <div class="relative z-10 flex flex-col w-20 bg-base-100 rounded border-4 border-secondary">
            <div class="border-secondary w-full text-center pt-2">{{ (change.tree.originalBulkCount || 1) }}</div>
            <ArrowDownIcon class="h-10 p-2" />
            <input type="number" value="1" class="input input-ghost w-full" v-model="change.tree.bulkCount" @change="updateBulkCount(change.tree.parent, change.tree)" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
