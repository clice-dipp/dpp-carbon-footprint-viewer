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
import { computedAsync, useResizeObserver } from '@vueuse/core'
import { allowedGrams, bestMatchingGrams, grams, loadFullAssetInfo, remToPx, simulationFromRoute } from '@/lib/util'
import { ErrorClient } from '@/lib/ErrorDataHandler'
import { computed, inject, ref, type Ref, watch } from 'vue'
import { AssetIdMap } from '@/lib/AssetIdMap'
import { assetIdMapKey } from '@/lib/injectionKeys'
import { debounce } from 'lodash'
import InfoBox from '@/components/InfoBox.vue'
import {
  type LifeCycleStage, lifeCycleStageColor, lifeCycleStageDescription,
  lifeCycleStageSequence
} from '@/lib/lifeCycleUtil'
import type CarbonFootprint from '@/lib/model/CarbonFootprint'
import StackedBarDiagram from '@/lib/StackedBarDiagram'
import { useRoute } from 'vue-router'

type VisualizationData = Record<LifeCycleStage, number>;

const hasMultipleStages = ref(false);

function addFootprint(data: VisualizationData, fp?: CarbonFootprint, count: number = 1) {
  if (fp === undefined) {
    return;
  }
  for (const pcf of fp.product) {
    const { stages } = pcf.lifeCyclePhase;
    hasMultipleStages.value = hasMultipleStages.value || stages.length > 1;
    const co2eq = (pcf.co2eq * count) / stages.length;
    for (const lifeCycleStage of stages) {
      data[lifeCycleStage] += co2eq;
    }
  }
}

const props = defineProps<{
  aasId: string,
  compact?: boolean
}>();
const idMap = inject<Ref<AssetIdMap>>(assetIdMapKey);
const route = useRoute();
const lifeCycleData = computedAsync(async () => {
  const { carbonTree, carbonFootprint } = (await loadFullAssetInfo(btoa(props.aasId), idMap?.value, "url-", () => {}, simulationFromRoute(route)));
  const visualizationData = Object.fromEntries(lifeCycleStageSequence.map((s) => [s, 0])) as VisualizationData;
  if (carbonFootprint) {
    addFootprint(visualizationData, carbonFootprint)
  } else if (carbonTree?.asset.footprint) {
    addFootprint(visualizationData, carbonTree.asset.footprint);
  } else if (carbonTree) {
    const workingTrees = [...Object.values(carbonTree.connections)];
    while (workingTrees.length > 0) {
      const t = workingTrees.shift()!;
      if (t.asset.footprint) {
        addFootprint(visualizationData, t.asset.footprint, t.bulkCount);
      } else {
        workingTrees.push(...Object.values(t.connections));
      }
    }
  }
  return visualizationData;
}, undefined, { onError(e: any) { ErrorClient.add(e.toString()) } })

let lifeCycleVisualization: StackedBarDiagram | undefined;
const visualization = ref<HTMLDivElement>();
const unit = ref<typeof allowedGrams[number]>("kg");

const data = computed(() =>
  lifeCycleData.value
    ? lifeCycleStageSequence.map((s) => [s, lifeCycleData.value[s]]).filter(([, value]) => value !== 0) as [LifeCycleStage, number][]
    : []
);


function createVisualization() {
  if (visualization.value && lifeCycleData.value) {
    if (!lifeCycleVisualization) {
      lifeCycleVisualization = new StackedBarDiagram(visualization.value);
    }
    unit.value = bestMatchingGrams(Math.max(...data.value.map(([, value]) => value)), "kg");

    const visData = data.value.map(([stage, value]) => ({ label: "", value, color: `rgb(${lifeCycleStageColor[stage].join(',')})`}));
    const barHeightRem = 3;
    const arcRadius = remToPx(0.5);
    const connectorHeight = arcRadius * 2;
    const barHeight = remToPx(barHeightRem);
    const labelHeight = visualization.value.clientHeight - barHeight - connectorHeight;
    lifeCycleVisualization.visualize(
      visData,
      {
        labelHeight,
        connectorHeight,
        arcRadius,
        svgHeight: visualization.value.clientHeight,
        svgWidth: visualization.value.clientWidth,
        opacityGradientStops: [["0%", 1], ["50%", 1], ["80%", .4], ["100%", .4]],
      }
    )
  }
}

watch(() => ([
  visualization.value,
  lifeCycleData.value,
]), createVisualization)

useResizeObserver(visualization, debounce(createVisualization, 500));
</script>
<template>
  <InfoBox class="relative min-h-28" explanation="Greenhouse gas emissions divided into the products life cycle stages">
    <div ref="visualization" class="absolute inset-0">
    </div>
    <div
      v-for="([stage, value], i) of data"
      class="absolute bottom-2 text-center"
      :key="stage"
      :style="`width: ${1/data.length*100}%; left: ${i/data.length*100}%;`"
    >
      {{ stage }} - {{ lifeCycleStageDescription[stage] }}: {{ grams(value || 0, "kg", unit) }}
    </div>
  </InfoBox>
</template>
