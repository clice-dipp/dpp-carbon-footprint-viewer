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
import LifeCyclePlot from '@/components/LifeCyclePlot.vue'
import type CarbonTree from '@/lib/model/CarbonTree'
import type CarbonFootprint from '@/lib/model/CarbonFootprint'
import HelpModal from '@/components/HelpModal.vue'
import ToggleSelect from '@/components/ToggleSelect.vue'
import { computed, ref, watch } from 'vue'
const props = defineProps<{ carbonTree?: CarbonTree, carbonFootprint?: CarbonFootprint, useOriginal?: boolean }>()
const nodeTypeFilter = ref<VisualizationEntry["nodeType"] | undefined>();
const useSqrtScale = ref<boolean>(false);
const showMinMax = ref<boolean>(false);
const x = ref<number | undefined>(undefined);
const showSlidingWindow = ref<boolean>(false);
watch(showSlidingWindow, (newVal) => {
  if (newVal) {
    x.value = 200;
  }
})
const yMax = ref<number | undefined>();
const windowSize = computed(() => showSlidingWindow.value ? 200 : 0);

function updateWindow(event: MouseEvent) {
  x.value = Math.max(event.layerX, windowSize.value/2);
  // console.log(x.value);
}
function closeWindow() {
  x.value = undefined;
}
</script>
<template>
  <div>
    <div class="flex">
      <div class="grid grid-cols-3 gap-4 w-full">
        <ToggleSelect :options="['asset', { value: undefined, label: 'both' }, 'components']" v-model="nodeTypeFilter" :equal-width="true" />
        <ToggleSelect :options="[{ value: false, label: 'proportional scale' }, { value: true, label: 'distorting scale'}]" v-model="useSqrtScale" :equal-width="true" />
        <ToggleSelect :options="[{ value: true, label: 'Show min/max' }, { value: false, label: 'Only show averages'}]" v-model="showMinMax" :equal-width="true" />
        <div class="col-span-2 text-right pt-3" v-if="carbonTree?.hasChanges">Simulation:</div>
        <ToggleSelect :options="[{ value: true, label: 'Show original' }, { value: false, label: 'Hide original'}]" v-model="showSlidingWindow" :equal-width="true" v-if="carbonTree?.hasChanges" />
      </div>
      <HelpModal class="mt-2 ml-2">
        <div class="max-w-96 my-4">
          There are three settings for the plot:
          <ul class="list-disc pl-4">
            <li>
              asset / both / components: Show the carbon footprint directly emitted by this asset, emitted only by its (direct) components, or both.
            </li>
            <li>
              proportional scale / distorting scale: Scale values intuitively proportional or, when suspecting high differences in values, use a distorting (square root) scale. Especially useful with the asset/both/components filter.
            </li>
            <li>
              Show min/max / Only show averages: Min/max ranges show ranges for carbon emissions which information was provided for several phases at once. The bars otherwise show the values split evenly across the life cycle phases.
            </li>
            <li>
              Show/hide a sliding window which shows the original values to compare it to the simulation.
            </li>
          </ul>
        </div>
      </HelpModal>
      <!--
      <div>assets</div>
      <div class="text-center mx-2">
        <input
          type="checkbox"
          class="toggle"
          :indeterminate="!nodeTypeFilter"
          :checked="nodeTypeFilter === 'components'"
          @click="nodeTypeFilter = !nodeTypeFilter ? 'components' : nodeTypeFilter === 'components' ? 'asset' : undefined"
        />
        <div class="-mt-2">both</div>
      </div>
      <div>components</div>
      -->
    </div>
  </div>
  <div class="relative" @mousemove="updateWindow" @mouseleave="closeWindow">
    <div>
      <LifeCyclePlot
        :carbon-tree="carbonTree"
        :carbon-footprint="carbonFootprint"
        :node-type-filter="nodeTypeFilter"
        :use-sqrt-scale="useSqrtScale"
        :show-min-max="showMinMax"
        :yMax="yMax"
        @y-max-change="(y) => yMax = y"
      />
    </div>
    <div class="absolute inset-0 border-red-500 bg-base-200" :style="x ? `clip: rect(auto, ${x+windowSize/2}px, auto, ${x-windowSize/2}px);` : 'clip: rect(0,0,0,0);'">
      <LifeCyclePlot
        :carbon-tree="carbonTree"
        :carbon-footprint="carbonFootprint"
        :node-type-filter="nodeTypeFilter"
        :use-sqrt-scale="useSqrtScale"
        :show-min-max="showMinMax"
        :yMax="yMax"
        @y-max-change="(y) => yMax = y"
        use-original
      />
    </div>
  </div>
</template>
