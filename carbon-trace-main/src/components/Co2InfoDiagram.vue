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
import { useResizeObserver } from '@vueuse/core'
import { allowedGrams, bestMatchingGrams, grams, remToPx } from '@/lib/util'
import { computed, ref, watch } from 'vue'
import { debounce } from 'lodash'
import InfoBox from '@/components/InfoBox.vue'
import SimpleStackedBarDiagram from '@/lib/SimpleStackedBarDiagram'
import type CarbonTree from '@/lib/model/CarbonTree'
import type CarbonFootprint from '@/lib/model/CarbonFootprint'

const props = defineProps<{
  carbonTreeOrFootprint: CarbonTree | CarbonFootprint,
  compact?: boolean
}>();

const co2eq = computed(() => {
  return {
    total: props.carbonTreeOrFootprint.totalCo2eq,
    product: props.carbonTreeOrFootprint.productCo2eq,
    transport: props.carbonTreeOrFootprint.transportCo2eq
  };
})

const visualization = ref<HTMLDivElement>();
let co2InfoVisualization: SimpleStackedBarDiagram | undefined;
const unit = computed<typeof allowedGrams[number]>(() => bestMatchingGrams(Math.max(co2eq.value?.product || 0, co2eq.value?.transport || 0), "kg"));


function createVisualization() {
  if (visualization.value && co2eq.value) {
    if (!co2InfoVisualization) {
      co2InfoVisualization = new SimpleStackedBarDiagram(visualization.value);
    }
    const barWidthRem = 3;
    const arcRadius = remToPx(0.5);
    const barWidth = remToPx(barWidthRem);
    co2InfoVisualization.visualize([
      { label: `Transport: ${grams(co2eq.value?.transport || 0, "kg", unit.value)}`, value: co2eq.value?.transport || 0, color: "rgb(155 168 194)" },
      { label: `Product: ${grams(co2eq.value?.product || 0, "kg", unit.value)}`, value: co2eq.value?.product || 0, color: "rgb(183 192 211)" },
    ], {
      arcRadius,
      svgHeight: visualization.value.clientHeight,
      svgWidth: visualization.value.clientWidth,
      barWidth,
      fontSize: 16,
      totalLabel: `Total: ${grams(co2eq.value?.total || 0, "kg", unit.value)}`
    });
  }
}

watch(() => ([
  visualization.value,
  co2eq.value,
]), createVisualization)

useResizeObserver(visualization, debounce(createVisualization, 500));
</script>
<template>
  <InfoBox class="relative min-h-28">
    <div ref="visualization" class="absolute inset-0">
    </div>
    <!--
    <div class="absolute w-1/2 right-3 top-1.5 flex items-center justify-end">
      {{ grams(co2eq?.transport || 0, "kg", unit) }} Transport CO2eq
    </div>
    <div class="absolute right-3 top-1/3 bottom-1/3 flex items-center justify-end">
      {{ grams(co2eq?.total || 0, "kg", unit) }} Total CO2eq
    </div>
    <div class="absolute w-1/2 right-3 bottom-1.5 flex items-center justify-end">
      {{ grams(co2eq?.product || 0, "kg", unit) }} Product CO2eq
    </div>
    -->
  </InfoBox>
</template>
