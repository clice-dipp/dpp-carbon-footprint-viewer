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

const props = defineProps<{
  aasId: string,
  compact?: boolean
}>();
const idMap = inject<Ref<AssetIdMap>>(assetIdMapKey);

const route = useRoute();
const data = computedAsync(async () => {
  const { carbonFootprint } = (await loadFullAssetInfo(btoa(props.aasId), idMap?.value, "url-", () => {}, simulationFromRoute(route)));
  return (carbonFootprint?.transport || []).map((footprint, trip) => [trip, footprint] as const).filter(([, footprint]) => footprint.co2eq > 0)
}, [], { onError(e: any) { ErrorClient.add(e.toString()) } })

let lifeCycleVisualization: StackedBarDiagram | undefined;
const visualization = ref<HTMLDivElement>();
const unit = ref<typeof allowedGrams[number]>("kg");

function color(value: number, minValue: number, maxValue: number): [number, number, number] {
  const minColor = [100, 100, 100] as const;
  const maxColor = [180, 180, 180] as const;
  if (minValue === maxValue) {
    return [
      (minColor[0] + maxColor[0]) / 2,
      (minColor[1] + maxColor[1]) / 2,
      (minColor[2] + maxColor[2]) / 2
    ]
  }
  const factor = (value - minValue) / (maxValue - minValue);
  return [
    minColor[0] + (maxColor[0] - minColor[0]) * factor,
    minColor[1] + (maxColor[1] - minColor[1]) * factor,
    minColor[2] + (maxColor[2] - minColor[2]) * factor
  ];
}


function createVisualization() {
  if (visualization.value && data.value.length) {
    if (!lifeCycleVisualization) {
      lifeCycleVisualization = new StackedBarDiagram(visualization.value);
    }
    const co2eqs = data.value.map(([, c]) => c.co2eq);
    const max = Math.max(...co2eqs);
    unit.value = bestMatchingGrams(max, "kg");
    const visData = data.value
      .map(([_, c], i) => ({ label: "", value: c.co2eq, color: `rgb(${color(i, 0, data.value.length - 1).join(',')})`}))
    console.log("DATA", JSON.stringify(data.value), visData)
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
  data.value.length,
]), createVisualization)

useResizeObserver(visualization, debounce(createVisualization, 500));
</script>
<template>
  <InfoBox class="relative min-h-28" explanation="Greenhouse gas emissions divided into the products life cycle stages">
    <div ref="visualization" class="absolute inset-0">
    </div>
    <div
      v-for="(d, i) of data"
      class="absolute bottom-2 text-center"
      :key="d[0]"
      :style="`width: ${1/data.length*100}%; left: ${i/data.length*100}%;`"
    >
      Trip {{ d[0]+1 }}: {{ grams(d[1].co2eq || 0, "kg", unit) }}
    </div>
  </InfoBox>
</template>
