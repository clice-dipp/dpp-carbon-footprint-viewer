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
import OverflowingInfo from '@/components/OverflowingInfo.vue'
import { storageRef } from '@/lib/storage'
import {
  lifeCyclePhaseByStage,
  lifeCyclePhaseDescription,
  lifeCyclePhaseSequence,
  lifeCycleStageColor, lifeCycleStageDescription
} from '@/lib/lifeCycleUtil'
import HelpModal from '@/components/HelpModal.vue'
import { ArrowDownIcon } from '@heroicons/vue/24/outline'
import InfoBox from '@/components/InfoBox.vue'
import TransportCarbonFootprintPlot from '@/components/TransportCarbonFootprintPlot.vue'
import DualLifeCyclePlot from '@/components/DualLifeCyclePlot.vue'

const props = defineProps<{ info: Awaited<ReturnType<typeof loadFullAssetInfo>>}>()
const showLifeCyclePlotInfo = storageRef("showLifeCyclePlotInfo", true);

</script>
<template>
  <div class="col-span-3">
    <div class="card bg-base-100">
      <div class="card-body">
        <h2 class="card-title">
          Carbon Footprint Divided into its Life Cycles
          <HelpModal>
            <div class="max-w-96 mt-2">
              <p class="mb-2">
                This chart shows at which life cycle stage most of the carbon footprint is emitted.
                The bars denote the emitted mass during which phase.
                Darker, left-shifted bars show emissions from (direct) sub-components, lighter, right-shifted bars show emissions happening from the asset itself.
              </p>
              <p class="mb-2">
                The backgrounds on the life cycle scale (e.g. <span class="inline-block bg-gray-300 px-2">A2</span>) show how many sub-components affect the respective life cycle to avoid overseeing very small impacts.
              </p>
              <p class="mb-2">
                The ranges (𝙸) denote the min/max values of emissions whose life cycles are not exactly known but split over multiple phases.
                The darker ranges (<span class="text-gray-800">𝙸</span>) to the left affect sub-components, the lighter ranges (<span class="text-gray-400">𝙸</span>) to the right the asset itself directly.
              </p>
              <p class="mb-2">
                The life cycles are divided into following stages and their phases:
              </p>
              <template v-for="(phases, stage) of lifeCyclePhaseByStage" :key="stage">
                <ArrowDownIcon class="h-6 m-auto mb-2" v-if="stage !== 'A'" />
                <div class="card card-compact mb-2" :style="`background-color: rgb(${lifeCycleStageColor[stage].join(',')});`">
                  <div class="card-body">
                    <h2 class="text-center bg-base-100/50 -mt-4 -mx-4 px-4 py-2"><strong>{{ stage }}</strong>: {{ lifeCycleStageDescription[stage] }}</h2>
                    <ul>
                      <li v-for="phase of phases" :key="phase"><strong>{{ phase }}</strong>: {{ lifeCyclePhaseDescription[phase] }}</li>
                    </ul>
                  </div>
                </div>
              </template>
            </div>
          </HelpModal>
        </h2>
        <DualLifeCyclePlot :carbon-tree="info.carbonTree" :carbon-footprint="info.carbonFootprint" v-if="info.carbonTree || info.carbonFootprint" />
      </div>
    </div>
    <div class="card bg-base-100" v-if="info.carbonTree">
      <div class="card-body">
        <h2 class="card-title">
          Transport Carbon Footprint of the Asset and its Sub-Components
          <HelpModal>
            <div class="my-2 max-w-96">
              The transport carbon footprint per way of the asset (above the line) and its sub-components (below the line).
              However, the sub-components transport carbon footprint is also included in the product carbon footprint of the asset (see the upper plot).
              The assets transport carbon footprint is not.
              The color shows the most emissions per item per km (darker means higher emissions, gray means no data provided).
            </div>
          </HelpModal>
        </h2>
        <TransportCarbonFootprintPlot :carbon-tree="info.carbonTree" />
      </div>
    </div>
  </div>
</template>
