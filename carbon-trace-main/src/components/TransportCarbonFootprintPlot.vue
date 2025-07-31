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
import ToggleSelect from '@/components/ToggleSelect.vue'
import * as Plot from "@observablehq/plot";
import { ref, watch } from 'vue'
import { debounce } from 'lodash'
import {
  allowedGrams,
  bestMatchingGrams,
  convertGrams,
  createSVGElements,
  grams,
  scaleColor, type SVGElementConfig
} from '@/lib/util'
import type { GoodsAddress } from '@/lib/model/CarbonFootprintType'
import distVincenty from '@/lib/vincenty'

const props = defineProps<{ carbonTree: CarbonTree }>()
const plot = ref<HTMLDivElement>();

type ComponentEntry = {
  index: number,
  count: number,
  name: string,
  co2eq: number,
  type: "product" | "transport",
  handover: GoodsAddress,
  takeover: GoodsAddress,
  distance?: number
}

function sumCO2eq(entries: ComponentEntry[]): ComponentEntry[] {
  // Create a map to store the summed entries by name
  const entryMap: { [name: string]: ComponentEntry } = {};

  // Iterate over each entry in the array
  entries.forEach((entry) => {
    if (entryMap[entry.name]) {
      // If the name already exists, sum the count and co2eq
      entryMap[entry.name].count += entry.count;
      entryMap[entry.name].co2eq += entry.co2eq;
    } else {
      // If the name does not exist in the map, add a new entry
      entryMap[entry.name] = { ...entry };
    }
  });

  // Convert the map back to an array of ComponentEntries
  return Object.values(entryMap);
}

async function addressToCoordinates(addr: GoodsAddress): Promise<[lat: number, long: number] | undefined> {
  if (addr.latitude && addr.longitude) {
    return [addr.latitude, addr.longitude];
  }
  const addressString = `${addr.houseNumber} ${addr.street}\n${addr.cityTown}\n${addr.zipcode}\n${addr.country}`;
  const query = `q=${encodeURIComponent(addressString)}`;
  
}

let distances: (number | undefined)[] | undefined; // in m
const hideRoot = ref(false);
const useSqrtScale = ref(false);

function buildPlot(data: ComponentEntry[]) {
  if (!plot.value) {
    return;
  }

  if (hideRoot.value) {
    data = data.filter(d => d.index >= 1);
  }

  const allValues = data.map(d => d.co2eq).flat()
  const maxVal = Math.max(...allValues)
  const minVal = Math.min(...allValues)
  const toUnit = bestMatchingGrams((minVal + maxVal) / 2, 'kg')

  let displayData: (ComponentEntry | { index: number })[] = data;
  if (!hideRoot.value) {
    displayData = [...data, { index: 1 }];
  }
  const sort = (a: { index: number }, b: { index: number }) => b.index - a.index

  const allCo2eqPerKm = data.map((d) => d.distance ? d.co2eq / d.distance : undefined);
  const maxCo2eqPerKm = Math.max(-Infinity, ...(allCo2eqPerKm.filter(d => d !== undefined) as number[]));
  const minCo2eqPerKm = Math.min(Infinity, ...(allCo2eqPerKm.filter(d => d !== undefined) as number[]));
  let color;
  const noDistColor = [153, 153, 153] as const;
  const minDistColor = [120, 120, 155] as const;
  const maxDistColor = [160, 160, 255] as const;

  const totalPerIndex: {[index: number]: number} = {};
  const namePerIndex: {[index: number]: string} = {};
  for (const d of data) {
    totalPerIndex[d.index] = (totalPerIndex[d.index] || 0) + (d.co2eq || 0);
    namePerIndex[d.index] = d.name;
  }
  const maxTotal = Math.max(...Object.values(totalPerIndex));

  if (maxCo2eqPerKm === -Infinity) {
    color = () => { return noDistColor; }
  } else {
    color = (co2eqPerKm?: number) => {
      if (!co2eqPerKm) {
        return noDistColor;
      }
      return scaleColor((co2eqPerKm - minCo2eqPerKm) / (maxCo2eqPerKm - minCo2eqPerKm), maxDistColor, minDistColor);
    }
  }

  function createTooltipElement(name: string, co2eq: number, unit: typeof allowedGrams[number], color: readonly [number, number, number], co2eqPerKm?: number) {
    const configs: SVGElementConfig[] = []
    configs.push({
      tag: 'tspan', attributes: { 'x': '1', dy: '1em', attributes: { 'font-weight': 'bold' } }, content: [
        { tag: 'tspan', content: name },
      ]
    }, {
      tag: 'tspan', attributes: { 'x': '1', dy: '1.5em' }, content: [
        { tag: 'tspan', content: 'CO2eq ', attributes: { 'font-weight': 'bold' } },
        { tag: 'tspan', content: grams(co2eq, "kg", unit) }
      ]
    });
    if (co2eqPerKm) {
      configs.push({
        tag: 'tspan', attributes: { 'x': '1', dy: '1em' }, content: [
          { tag: 'tspan', attributes: { color: `rgb(${color.join(",")})` }, content: '■ ' },
          { tag: 'tspan', attributes: { 'font-weight': 'bold' }, content: 'CO2eq/km ' },
          { tag: 'tspan', content: `${grams(co2eqPerKm, 'kg')}/km` }
        ]
      })
    }
    return createSVGElements(configs)
  }

  const barData = data.map((x, i) => Array(x.count).fill({ ...x, i, co2eq: x.co2eq / x.count })).flat();
  const threshold = 0.7;
  const labelLeft = useSqrtScale.value
    ? ([, total]: [any, number]) => Math.sqrt(total) / Math.sqrt(maxTotal) > threshold
    : ([, total]: [any, number]) => total / maxTotal > threshold;
  const p = Plot.plot({
    width: Math.max(plot.value.clientWidth, 480),
    height: (Object.keys(totalPerIndex).length + 1) * 42,
    marginLeft: 80,
    y: {
      tickFormat: () => '',
      label: null
    },
    x: {
      domain: [0, convertGrams(maxTotal, 'kg', toUnit)],
      label: `CO2eq in ${toUnit}`,
      transform: (f) => convertGrams(f, 'kg', toUnit),
      grid: true,
      type: useSqrtScale.value ? 'sqrt' : 'linear',
    },
    marks: [
      hideRoot.value ? [] : Plot.ruleY([{
        x: Number.MAX_SAFE_INTEGER,
        y: 1
      }], { dx: -100, x: 'x', y: 'y', stroke: '#CCC' }),
      Plot.barX(displayData, {
        x: 'co2eq',
        y: 'index',
        insetLeft: 1,
        sort
      }),
      Plot.barX(barData, {
        x: 'co2eq',
        y: 'index',
        insetLeft: 1,
        fill: (d) => { return `rgb(${color(d.distance ? d.co2eq / d.distance : undefined).join(",")})` },
        sort,
        tip: {
          render: (index, scaled, values, dimensions, context, next) => {
            const el = next?.(index, scaled, values, dimensions, context);
            const barD = barData[index[0]];
            let i = barD?.i;
            const d = data[i];
            if (!d || d.co2eq <= 0) {
              return document.createElement("a");
            }
            if (el) {
              el.style.pointerEvents = "none";
              const text = el.querySelector("text")
              if (text && d && barD) {
                const co2eqPerKm = d.distance ? d.co2eq / d.distance : undefined;
                const fill = color(co2eqPerKm);

                text.replaceChildren(...createTooltipElement(barD.name, d.co2eq, toUnit, fill, co2eqPerKm))
              }
            }
            // el.appendChild(<>)
            return el || null;
          },
        },
      }),
      Plot.ruleX([0]),
      /*
      Plot.text(data.filter((d, i) => d.index !== data[i+1]?.index && d.co2eq > (maxVal / 2)), {
        text: 'name',
        y: 'index',
        x: (d) => d.co2eq,
        textAnchor: 'end',
        dx: -5,
        fill: 'black'
      }),
      Plot.text(data.filter((d, i) => d.index !== data[i+1]?.index && d.co2eq <= (maxVal / 2)), {
        text: 'name',
        y: 'index',
        x: (d) => d.co2eq,
        textAnchor: 'start',
        dx: 5,
        fill: 'black'
      }),
       */
      Plot.text(Object.entries(totalPerIndex).filter(x => !labelLeft(x)), {
        text: ([index]) => namePerIndex[index],
        y: ([index]) => parseInt(index, 10),
        x: ([_, total]) => total,
        textAnchor: 'start',
        dx: 5,
        fill: 'black'
      }),
      Plot.text(Object.entries(totalPerIndex).filter(labelLeft), {
        text: ([index]) => namePerIndex[index],
        y: ([index]) => parseInt(index, 10),
        x: ([_, total]) => total,
        textAnchor: 'end',
        dx: -5,
        fill: 'black'
      }),
      Plot.text(sumCO2eq(data), {
        text: (d) => convertGrams(d.co2eq, 'kg', toUnit).toLocaleString(undefined, { maximumFractionDigits: 2 }) + toUnit,
        y: 'index',
        x: 0,
        textAnchor: 'end',
        dx: -10,
        fill: 'black'
      }),
    ]
  })
  for (const child of plot.value.childNodes) {
    child.remove()
  }
  plot.value.appendChild(p)
}

function makePlot() {
  if (!plot.value) {
    return;
  }

  const data: ComponentEntry[] = [];

  let i = 0;
  const indexByName: {[name: string]: number} = {};
  props.carbonTree.forEach((t, _, __, count) => {
    const name = t.asset.displayName || t.asset.idShort;
    for (const way of (t.asset.footprint?.transport || [])) {
      let index = i;
      if (indexByName[name] !== undefined) {
        index = indexByName[name];
      } else {
        indexByName[name] = index;
        i += 1;
        if (i === 1) {
          i += 1;
        }
      }
      data.push({
        index,
        name,
        count,
        co2eq: (way.co2eq || 0) * count,
        type: "transport",
        handover: way.goodsTransportAddressHandover,
        takeover: way.goodsTransportAddressTakeover,
      })
    }
  })

  const promises = data.map(async (d) => {
    const from = await addressToCoordinates(d.takeover);
    const to = await addressToCoordinates(d.handover);
    if (from && to) {
      d.distance = distVincenty(from[0], from[1], to[0], to[1]);
    }
  })
  Promise.all(promises).then(() => {
    buildPlot(data);
  })

  buildPlot(data)
}

watch(() => plot.value, makePlot);
watch(() => props.carbonTree, makePlot);
watch(() => hideRoot.value, makePlot);
watch(() => useSqrtScale.value, makePlot);
window.addEventListener('resize', debounce(makePlot, 250));
</script>
<template>
  <div>
    <div class="grid grid-cols-3">
      <ToggleSelect :options="[{ value: false, label: 'show asset' }, { value: true, label: 'hide asset', }]" v-model="hideRoot" :equal-width="true" class="min-w-96" />
      <ToggleSelect :options="[{ value: false, label: 'proportional scale' }, { value: true, label: 'distorting scale'}]" v-model="useSqrtScale" :equal-width="true" class="min-w-96 ml-2" />
    </div>
  </div>
  <div ref="plot"></div>
</template>
