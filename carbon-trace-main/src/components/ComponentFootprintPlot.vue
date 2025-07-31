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

import type CarbonTree from '@/lib/model/CarbonTree'
import type CarbonFootprint from '@/lib/model/CarbonFootprint'
import ToggleSelect from '@/components/ToggleSelect.vue'
import c from '@/lib/visualizationColors'
import { rgb } from "d3";
import * as Plot from "@observablehq/plot";
import { ref, watch } from 'vue'
import { debounce } from 'lodash'
import { bestMatchingGrams, convertGrams, rgbToHex } from '@/lib/util'

const props = defineProps<{ carbonTree: CarbonTree }>()
const plot = ref<HTMLDivElement>();

type ComponentEntry = {
  count: number,
  name: string,
  co2eq: number,
  type: "product" | "transport"
}

function makePlot() {
  if (!plot.value) {
    return;
  }

  const data: ComponentEntry[] = [];

  props.carbonTree.forEach((t, _, __, bulkCount) => {
    data.push({
      name: t.asset.displayName || t.asset.idShort,
      count: bulkCount,
      co2eq: (t.assetProductCo2eq || 0) * bulkCount,
      type: "product"
    }, {
      name: t.asset.displayName || t.asset.idShort,
      count: bulkCount,
      co2eq: (t.assetTransportCo2eq || 0) * bulkCount,
      type: "transport"
    })
  })

  const pcfColor = rgbToHex(...c("pcf"))
  const tcfColor = rgbToHex(...c("tcf"))
  const allValues = data.map(d => d.co2eq).flat();
  const maxVal = Math.max(...allValues);
  const minVal = Math.min(...allValues);
  const toUnit = bestMatchingGrams((minVal+maxVal)/2, "kg");

  /*

    y: {
      grid: true,
      domain: [0, convertGrams(yMax.value, "kg", toUnit)],
      label: `CO2eq in ${toUnit}`,
      transform: (f) => convertGrams(f, "kg", toUnit),
      type: useSqrtScale.value ? "sqrt" : "linear",
    },

   */
  const p = Plot.plot({
    width: Math.max(plot.value.clientWidth, 480),
    height: allValues.length * 43,
    marginLeft: 80,
    y: {
      tickFormat: () => "",
      label: null,
    },
    fy: {
      axis: null,
    },
    x: {
      domain: [0, convertGrams(maxVal, "kg", toUnit)],
      label: `CO2eq in ${toUnit}`,
      transform: (f) => convertGrams(f, "kg", toUnit),
      grid: true
    },
    marks: [
      Plot.barX(data, {
        x: "co2eq",
        fy: "name",
        y: "type",
        insetLeft: 1,
        fill: "#999"
      }),
      Plot.barX(data.map((x) => Array(x.count).fill({ ...x, co2eq: x.co2eq / x.count})).flat(), {
        x: "co2eq",
        fy: "name",
        y: "type",
        tip: true,
        insetLeft: 1,
        fill: (d) => d.type === 'product' ? pcfColor : tcfColor
      }),
      Plot.ruleX([0]),
      Plot.text(data.filter(d => d.co2eq > (maxVal / 2)), {
        text: "name",
        fy: "name",
        y: "type",
        x: (d) => d.co2eq,
        textAnchor: "end",
        dx: -5,
        fill: "black"
      }),
      Plot.text(data.filter(d => d.co2eq <= (maxVal / 2)), {
        text: "name",
        fy: "name",
        y: "type",
        x: (d) => d.co2eq,
        textAnchor: "start",
        dx: 5,
        fill: "black"
      }),
      Plot.text(data, {
        text: (d) => convertGrams(d.co2eq, "kg", toUnit).toLocaleString(undefined, { maximumFractionDigits: 2 }) + toUnit,
        fy: "name",
        y: "type",
        x: 0,
        textAnchor: "end",
        dx: -10,
        fill: "black"
      })
    ]
  })
  for (const child of plot.value.childNodes) {
    child.remove();
  }
  plot.value.appendChild(p);
}

watch(() => plot.value, makePlot);
watch(() => props.carbonTree, makePlot);
window.addEventListener('resize', debounce(makePlot, 250));
</script>
<template>
  <div>
    <div>
      <!--<ToggleSelect :options="['asset', { value: undefined, label: 'both' }, 'components']" v-model="nodeTypeFilter" :equal-width="true" class="min-w-96" />-->
    </div>
  </div>
  <div ref="plot"></div>
</template>
