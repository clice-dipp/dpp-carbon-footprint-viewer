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
import type CarbonTree from '@/lib/model/CarbonTree'
import { type ConnectionStatus } from '@/lib/model/CarbonTree'
import { computed, ref, watch } from 'vue'
import * as Plot from "@observablehq/plot";
import { colorString } from '@/lib/visualizationColors'
import {
  allowedGrams,
  bestMatchingGrams, convertGrams,
  createSVGElements,
  diffToString,
  grams,
  type SVGElementConfig
} from '@/lib/util'
import ToggleSelect from '@/components/ToggleSelect.vue'

const props = defineProps<{ tree: CarbonTree }>();
const absolutePlot = ref<HTMLDivElement>();
const relativePlot = ref<HTMLDivElement>();
const filterType = ref<'both' | 'product' | 'transport'>('both');

type Datum = {
  originalName: string,
  name: string,
  originalProductCo2eq: number,
  productCo2eq: number,
  originalTransportCo2eq: number,
  transportCo2eq: number,
  statusName: string,
  status: ConnectionStatus["status"],
};
type SequenceDatum = {
  source: 'original' | 'current',
  type: 'product' | 'transport',
  name: string,
  co2eq: number,
  originalDatum: Datum
}

function transformData(data: Datum[]): SequenceDatum[] {
  return data.map((d) => ([
    {
      source: 'original' as const,
      type: 'product' as const,
      name: d.name,
      co2eq: d.originalProductCo2eq,
      originalDatum: d
    },
    {
      source: 'original' as const,
      type: 'transport' as const,
      name: d.name,
      co2eq: d.originalTransportCo2eq,
      originalDatum: d
    },
    {
      source: 'current' as const,
      type: 'product' as const,
      name: d.name,
      co2eq: d.productCo2eq,
      originalDatum: d
    },
    {
      source: 'current' as const,
      type: 'transport' as const,
      name: d.name,
      co2eq: d.transportCo2eq,
      originalDatum: d
    }
  ])).flat(1);
}

function addOriginalTree(d: Datum[], t: CarbonTree) {
  const { transportCo2eq, originalTransportCo2eq, productCo2eq, originalProductCo2eq, name } = t;
  if (transportCo2eq !== originalTransportCo2eq || productCo2eq !== originalProductCo2eq) {
    d.push({
      name,
      originalName: name,
      transportCo2eq,
      originalTransportCo2eq,
      productCo2eq,
      originalProductCo2eq,
      statusName: 'modified sub-\ncomponent',
      status: 'original',
    });
  }
}

function addConnections(d: Datum[], tree: CarbonTree) {
  for (const [id, connection] of Object.entries(tree.connectionStatus)) {
    if (connection.status === 'original') {
      addOriginalTree(d, tree.connections[id]);
      addConnections(d, tree.connections[id]);
    } else if (connection.status === 'deleted') {
      const { name, productCo2eq, transportCo2eq } = tree.originalConnections[id];
      d.push({
        originalName: name,
        name: "",
        originalProductCo2eq: productCo2eq,
        productCo2eq: 0,
        originalTransportCo2eq: transportCo2eq,
        transportCo2eq: 0,
        statusName: connection.status,
        status: connection.status,
      })
    } else if (connection.status === 'added') {
      const { name, productCo2eq, transportCo2eq } = tree.connections[id];
      d.push({
        originalName: "",
        name,
        originalProductCo2eq: 0,
        productCo2eq,
        originalTransportCo2eq: 0,
        transportCo2eq,
        statusName: connection.status,
        status: connection.status,
      })
    } else if ((connection.status === 'swapped' || connection.status === 'modified') && connection.otherId === id) {
      const { name, productCo2eq, transportCo2eq } = tree.connections[id];
      const { name: originalName, productCo2eq: originalProductCo2eq, transportCo2eq: originalTransportCo2eq } = tree.originalConnections[connection.originalId];
      d.push({
        originalName,
        name,
        originalProductCo2eq,
        productCo2eq,
        originalTransportCo2eq,
        transportCo2eq,
        statusName: connection.status,
        status: connection.status,
      })
    }
  }
}

const data = computed(() => {
  const d = [] as Datum[];
  addOriginalTree(d, props.tree);
  addConnections(d, props.tree);
  return d;
})

const filteredData = computed(() => {
  if (filterType.value === 'product') {
    return data.value.map((values) => ({ ...values, originalTransportCo2eq: 0, transportCo2eq: 0, }))
  }
  if (filterType.value === 'transport') {
    return data.value.map((values) => ({ ...values, originalProductCo2eq: 0, productCo2eq: 0, }))
  }
  return data.value;
})

const transformedFilteredData = computed(() => {
  return transformData(filteredData.value);
})

const transformedData = computed(() => {
  return transformData(data.value);
});

function diffGrams(value: number, unit: typeof allowedGrams[number] = "kg") {
  return diffToString(value, grams(value, unit));
}

function diffPercentValue(newValue: number, oldValue: number) {
  const p = ((newValue / oldValue) - 1) * 100;
  return Math.abs(p) === Infinity ? 100 : p;
}

function diffPercent(newValue: number, oldValue: number) {
  return `${diffToString(diffPercentValue(newValue, oldValue))}%`;
}

function createAbsoluteTooltipElement(d: SequenceDatum) {
  const o = d.originalDatum;
  const configs: SVGElementConfig[] = []
  const pcf = d.source === 'current' ? o.productCo2eq : o.originalProductCo2eq;
  const tcf = d.source === 'current' ? o.transportCo2eq : o.originalTransportCo2eq;
  const otherPcf = d.source === 'original' ? o.productCo2eq : o.originalProductCo2eq;
  const otherTcf = d.source === 'original' ? o.transportCo2eq : o.originalTransportCo2eq;
  const total = pcf + tcf;
  const otherTotal = otherPcf + otherTcf;
  configs.push({
    tag: 'tspan', attributes: { 'x': '1', dy: '1em' }, content: [
      { tag: 'tspan', attributes: { color: colorString('pcf') }, content: '■ ' },
      { tag: 'tspan', attributes: { 'font-weight': 'bold' }, content: `Product CO2eq ` },
      { tag: 'tspan', content: grams(pcf, "kg") }
    ]
  }, {
    tag: 'tspan', attributes: { 'x': '1', dy: '1em' }, content: [
      { tag: 'tspan', content: `(${diffGrams(pcf - otherPcf)} or ${diffPercent(pcf, otherPcf)})` },
    ]
  }, {
    tag: 'tspan', attributes: { 'x': '1', dy: '1.5em' }, content: [
      { tag: 'tspan', attributes: { color: colorString('tcf') }, content: '■ ' },
      { tag: 'tspan', attributes: { 'font-weight': 'bold' }, content: `Transport CO2eq ` },
      { tag: 'tspan', content: grams(tcf, 'kg') }
    ]
  }, {
    tag: 'tspan', attributes: { 'x': '1', dy: '1em' }, content: [
      { tag: 'tspan', content: `(${diffGrams(tcf - otherTcf)} or ${diffPercent(tcf, otherTcf)})` },
    ]
  }, {
    tag: 'tspan', attributes: { 'x': '1', dy: '1.5em' }, content: [
      { tag: 'tspan', content: 'total CO2eq ', attributes: { 'font-weight': 'bold' } },
      { tag: 'tspan', content: grams(total, 'kg') }
    ]
  }, {
    tag: 'tspan', attributes: { 'x': '1', dy: '1em' }, content: [
      { tag: 'tspan', content: `(${diffGrams(total - otherTotal)} or ${diffPercent(total, otherTotal)})` },
    ]
  });
  return createSVGElements(configs)
}

function createRelativeTooltipElement(d: Datum) {
  const configs: SVGElementConfig[] = []
  configs.push({
    tag: 'tspan', attributes: { 'x': '1', dy: '1em' }, content: [
      { tag: 'tspan', attributes: { 'font-weight': 'bold' }, content: `Product: ` },
      { tag: 'tspan', content: `${grams(d.originalProductCo2eq, "kg")} → ${grams(d.productCo2eq, "kg")}` }
    ]
  }, {
    tag: 'tspan', attributes: { 'x': '1', dy: '1em' }, content: [
      { tag: 'tspan', attributes: { 'font-weight': 'bold' }, content: `Transport: ` },
      { tag: 'tspan', content: `${grams(d.originalTransportCo2eq, "kg")} → ${grams(d.transportCo2eq, "kg")}` }
    ]
  }, {
    tag: 'tspan', attributes: { 'x': '1', dy: '1em' }, content: [
      { tag: 'tspan', attributes: { 'font-weight': 'bold' }, content: `Total: ` },
      { tag: 'tspan', content: `${grams(d.originalTransportCo2eq + d.originalProductCo2eq, "kg")} → ${grams(d.productCo2eq + d.transportCo2eq, "kg")}` }
    ]
  });
  return createSVGElements(configs)
}

function makeAbsolutePlot() {
  if (!absolutePlot.value) {
    return;
  }
  const originalProducts = transformedData.value.filter(d => d.type === 'product' && d.source === 'original');
  const co2eqs = transformedData.value.map(d => d.co2eq);
  const maxVal = Math.max(...co2eqs);
  const minVal = Math.min(...co2eqs);
  const toUnit = bestMatchingGrams((minVal + maxVal) / 2, 'kg')
  const items = new Set(transformedData.value.map(d => d.name))
  const typ = filterType.value;
  const p = Plot.plot({
    x: {
      labelAnchor: "center",
      labelOffset: 30,
      label: `CO2eq in ${toUnit}`,
      transform: (d: number) => convertGrams(d, "kg", toUnit),
    },
    y: {
      label: null,
      ticks: [],
      domain: ['original', 'current'],
    },
    fy: {
      label: null,
      ticks: [],
    },
    marginLeft: 80,
    marginRight: 180,
    marginBottom: 40,
    marginTop: 20,
    width: Math.max(absolutePlot.value.clientWidth, 480),
    height: items.size * 45 * 2,
    marks: [
      Plot.barX(transformedFilteredData.value, {
        x: "co2eq",
        y: "source",
        fill: (d: SequenceDatum) => colorString(d.type === 'product' ? 'pcf' : 'tcf'),
        fy: "name",
        sort: { fy: "-x" },
        tip: {
          render: (index, scaled, values, dimensions, context, next) => {
            const el = next?.(index, scaled, values, dimensions, context) as SVGElement | undefined;
            const d = transformedData.value[index[0]];
            if (!d || d.co2eq <= 0) {
              return document.createElement("a");
            }
            if (el) {
              el.style.pointerEvents = "none";
              const text = el.querySelector("text")
              if (text && d) {
                text.replaceChildren(...createAbsoluteTooltipElement(d))
              }
            }
            // el.appendChild(<>)
            return el || null;
          },
        },
      }),
      Plot.gridX({ stroke: 'white', strokeOpacity: 0.5 }),
      Plot.text(originalProducts, {
        text: (d: SequenceDatum) => d.originalDatum.originalName,
        x: ({ originalDatum }: SequenceDatum) => ((typ === 'product' ? 0 : originalDatum.originalTransportCo2eq) + (typ === 'transport' ? 0 : originalDatum.originalProductCo2eq)),
        y: "source",
        fy: "name",
        textAnchor: "start",
        dx: 3,
      }),
      Plot.text(transformedData.value.filter(d => d.type === 'product' && d.source === 'current'), {
        text: (d: SequenceDatum) => d.originalDatum.name,
        x: ({ originalDatum }: SequenceDatum) => ((typ === 'product' ? 0 : originalDatum.transportCo2eq) + (typ === 'transport' ? 0 : originalDatum.productCo2eq)),
        y: "source",
        fy: "name",
        textAnchor: "start",
        dx: 3,
      }),
      Plot.text(originalProducts, {
        text: () => "⤹",
        x: 0,
        y: "source",
        fy: "name",
        textAnchor: "end",
        dx: -3,
        dy: 15,
        fontSize: 16,
      }),
      Plot.text(originalProducts, {
        text: ({ originalDatum }: SequenceDatum) => originalDatum.statusName,
        x: 0,
        y: "source",
        fy: "name",
        textAnchor: "end",
        dx: -13,
        dy: 15,
      }),
      Plot.ruleX([0]),
    ]
  });
  for (const child of absolutePlot.value.childNodes) {
    child.remove();
  }
  absolutePlot.value.appendChild(p);
}

type VisDataEntry = [number, Datum];

function makeRelativePlot() {
  if (!relativePlot.value) {
    return;
  }
  const visData: VisDataEntry[] = filteredData.value.map(d => [diffPercentValue(d.productCo2eq + d.transportCo2eq, d.originalProductCo2eq + d.originalTransportCo2eq), d] as const)
  const negativeVisData = visData.filter(([value]) => value < 0);
  const positiveVisData = visData.filter(([value]) => value >= 0);
  const peak = Math.max(...visData.map(d => Math.abs(d[0])))
  let color = 'cf';
  if (filterType.value === 'product') {
    color = 'pcf'
  } else if (filterType.value === 'transport') {
    color = 'tcf'
  }
  const p = Plot.plot({
    marginRight: 50,
    marginLeft: 50,
    width: Math.max(relativePlot.value.clientWidth, 480),
    height: visData.length * 45,
    label: null,
    x: {
      domain: [-peak, peak],
      tickFormat: (d) => `${d}%`,
      label: "← reduction · Carbon Footprint Change (%) · increase →",
      labelAnchor: "center"
    },
    y: {
      label: null,
      ticks: [],
    },
    marks: [
      Plot.barX(visData, {
        y: ([, { name, originalName }]) => name + originalName,
        x: ([value]: VisDataEntry) => value,
        fill: colorString(color),
        sort: { y: "x" },
        tip: {
          render: (index, scaled, values, dimensions, context, next) => {
            const el = next?.(index, scaled, values, dimensions, context) as SVGElement | undefined;
            const d = data.value[index[0]];
            if (!d || d.co2eq <= 0) {
              return document.createElement("a");
            }
            if (el) {
              el.style.pointerEvents = "none";
              const text = el.querySelector("text")
              if (text && d) {
                text.replaceChildren(...createRelativeTooltipElement(d))
              }
            }
            // el.appendChild(<>)
            return el || null;
          },
        },
      }),
      Plot.text(positiveVisData, {
        y: ([, { name, originalName }]) => name + originalName,
        text: ([, { status, name, originalName }]) => status === 'swapped' ? `${name} (swapped in for ${originalName})` : name || originalName,
        x: 0,
        dx: -5,
        textAnchor: 'end',
      }),
      Plot.gridX({ stroke: 'white', strokeOpacity: 0.5 }),
      Plot.text(negativeVisData, {
        y: ([, { name, originalName }]) => name + originalName,
        text: ([, { status, name, originalName }]) => status === 'swapped' ? `${name} (swapped in for ${originalName})` : name || originalName,
        x: 0,
        dx: 5,
        textAnchor: 'start',
      }),
      Plot.text(positiveVisData, {
        y: ([, { name, originalName }]) => name + originalName,
        text: ([value]) => `${diffToString(value)}%`,
        x: ([value]: VisDataEntry) => value,
        dx: 5,
        textAnchor: 'start',
      }),
      Plot.text(negativeVisData, {
        y: ([, { name, originalName }]) => name + originalName,
        text: ([value]) => `${diffToString(value)}%`,
        x: ([value]: VisDataEntry) => value,
        dx: -5,
        textAnchor: 'end',
      }),
      Plot.ruleX([0]),
    ]
  });
  for (const child of relativePlot.value.childNodes) {
    child.remove();
  }
  relativePlot.value.appendChild(p);
}

function makePlots() {
  makeAbsolutePlot();
  makeRelativePlot();
}

watch(() => [
  data.value,
  absolutePlot.value,
  filterType.value
], makePlots, { immediate: true })
</script>

<template>
  <h2 class="text-xl py-4">How the changes affect the whole product?</h2>
  <ToggleSelect :options="[{ value: 'product', label: 'Product Carbon Footprint' }, 'both', { value: 'transport', label: 'Transport Carbon Footprint', }]" v-model="filterType" :equal-width="true" class="min-w-96 w-full" />
  <h3 class="font-bold py-4">Which components footprint changed most?</h3>
  <div ref="relativePlot"></div>
  <h3 class="font-bold py-4">How much more emissions across the chain?</h3>
  <div ref="absolutePlot"></div>
</template>
