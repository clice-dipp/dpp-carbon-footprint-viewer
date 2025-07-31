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
import type { loadFullAssetInfo } from '@/lib/util'
import LifeCyclePlot from '@/components/LifeCyclePlot.vue'
import ComponentFootprintPlot from '@/components/ComponentFootprintPlot.vue'
import CarbonSankeyDiagram from '@/components/CarbonSankeyDiagram.vue'
import ComponentTree from '@/components/ComponentTree.vue'
import CarbonTree from '@/lib/model/CarbonTree'
import AssetTree from '@/components/AssetTree.vue'
import ShellCard from '@/components/ShellCard.vue'

const props = defineProps<{ info: Awaited<ReturnType<typeof loadFullAssetInfo>>}>()

</script>
<template>
  <div class="col-span-3" v-if="info.carbonTree">
    <div class="card bg-base-100">
      <div class="card-body pr-0 overflow-visible">
        <h2 class="card-title px-8">Asset Structure</h2>
        <ShellCard :shell="info.description" class="shadow-xl w-80 m-6 ml-8" compact show-co2 />
        <div>
          <AssetTree :asset="info.carbonTree" :hide-expand="true" :scroll-y="true" :allow-zoom="true" :show-to-asset="true" :show-diff="info.carbonTree.hasChanges" />
        </div>
      </div>
    </div>
  </div>
  <div class="col-span-3" v-if="info.carbonTree">
    <div class="card bg-base-100">
      <div class="card-body">
        <h2 class="card-title">Component Footprints</h2>
        <ComponentFootprintPlot :carbon-tree="info.carbonTree" />
      </div>
    </div>
  </div>
  <div class="col-span-6" v-if="info.carbonTree">
    <div class="card bg-base-100">
      <div class="card-body">
        <h2 class="card-title">Component Distribution of the Carbon Footprint</h2>
        <CarbonSankeyDiagram :carbon-tree="info.carbonTree" />
      </div>
    </div>
  </div>
</template>
