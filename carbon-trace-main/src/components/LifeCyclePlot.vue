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
import { ref, watch } from 'vue'
import * as Plot from '@observablehq/plot'
import {
  type LifeCyclePhase,
  lifeCyclePhaseByStage,
  lifeCyclePhaseColor,
  lifeCyclePhaseDescription,
  lifeCyclePhaseSequence,
  lifeCycleStageColor,
  lifeCycleStageDescription,
  lifeCycleStageSequence
} from '@/lib/lifeCycleUtil'
import type CarbonFootprint from '@/lib/model/CarbonFootprint'
import {
  allowedGrams,
  bestMatchingGrams,
  convertGrams,
  createSVGElement,
  createSVGElements,
  rgbToHex,
  type SVGElementConfig,
  ucfirst
} from '@/lib/util'
import _, { debounce } from 'lodash'

type VisualizationEntry = {
  lifeCycle: LifeCyclePhase,
  nodeType: "asset" | "components",
  co2eq: number,
  avg: number,
  max: number,
  min: number,
  id?: string,
  name?: string,
  isTransport?: boolean,
  count: number,
  y1: number,
  yMax: number,
  yMin: number,
  yAvg: number
};

const props = defineProps<{
  carbonTree?: CarbonTree,
  carbonFootprint?: CarbonFootprint,
  useOriginal?: boolean,
  nodeTypeFilter?: VisualizationEntry["nodeType"],
  useSqrtScale: boolean,
  showMinMax: boolean,
  yMax?: number
}>()

const emit = defineEmits<{
  yMaxChange: [number];
}>();

const plot = ref<HTMLDivElement>();

const yMax = ref(Number.MIN_VALUE);

const MAX_ASSET_RGB: [number, number, number] = [150, 150, 150];

function toComponentRGB([r, g, b]: [number, number, number]): [number, number, number] {
  const subtract = 50;
  return [Math.max(r-subtract, 0), Math.max(g-subtract, 0), Math.max(b-subtract, 0)];
}

const base = [
  ...lifeCyclePhaseSequence.map(
    (lifeCycle, i, cycles) =>
    {
      if (i > 0 && lifeCycle[0] !== cycles[i-1][0]) {
        // Add "empty" (denoted by the _) bars between the different cycles A*, B*, ...
        return [{ lifeCycle: `${cycles[i-1][0]}_`, nodeType: "asset", co2eq: 0 }, { lifeCycle, nodeType: "asset", co2eq: 0 }];
      }
      return [{ lifeCycle, nodeType: "asset", co2eq: 0 }];
    }
  ).flat()];

function createTooltipElement(d: VisualizationEntry, unit: typeof allowedGrams[number], color: string) {
  const max = d.max ? convertGrams(d.max, 'kg', unit) : 0;
  const min = d.min ? convertGrams(d.min, 'kg', unit) : 0;
  const co2eq = convertGrams(d.co2eq, 'kg', unit);
  const lifeCycle = `${d.lifeCycle} - ${lifeCyclePhaseDescription[d.lifeCycle]}`
  const furtherInfo = d.max > d.avg || d.avg > d.min ? ` (from ${min} up to ${max.toLocaleString()}${unit})*` : "";
  const configs: SVGElementConfig[] = [];
  if (d.name) {
    configs.push({
      tag: 'tspan', attributes: { 'x': '1', dy: '1em' }, content: [
        { tag: 'tspan', content: `${d.count > 1 ? `${d.count} instances` : ''}${d.count > 1 && d.name ? ' of ' : ''}${d.name || ''}` }
      ]
    })
  }
  configs.push({
    tag: 'tspan', attributes: { 'x': '1', dy: '1em' }, content: [
      { tag: 'tspan', attributes: { 'font-weight': 'bold' }, content: `${d.nodeType} CO2eq ` },
      { tag: 'tspan', content: `${co2eq.toLocaleString()}${unit}${furtherInfo}` }
    ]
  })
  if (d.name && d.count > 1) {
    const furtherInfoEach = d.max && d.max > d.co2eq ? ` (up to ${(max/d.count).toLocaleString()}${unit})*` : "";
    configs.push({
      tag: 'tspan', attributes: { 'x': '1', dy: '1em' }, content: [
        { tag: 'tspan', content: `each at ${(co2eq/d.count).toLocaleString()}${unit}${furtherInfoEach}` }
      ]
    })
  }
  configs.push({
    tag: 'tspan', attributes: { 'x': '1', dy: '1em' }, content: [
      { tag: 'tspan', attributes: { color }, content: '■ ' },
      { tag: 'tspan', content: lifeCycle }
    ]
  })
  if (furtherInfo) {
    configs.push({
      tag: 'tspan', attributes: { 'x': '1', dy: '1em' }, content: [
        { tag: 'tspan', content: '*' },
        { tag: 'tspan', content: 'spreads across multiple life cycles, denoted by 𝙸' }
      ]
    })
  }
  return createSVGElements(configs)
}

function addFootprint(data: VisualizationEntry[], nodeType: VisualizationEntry["nodeType"], fp?: CarbonFootprint, count: number = 1, name?: string) {
  if (fp === undefined) {
    return;
  }
  for (const pcf of fp.product) {
    const max = pcf.co2eq * count;
    const avg = max / pcf.lifeCyclePhase.phases.length;
    const min = pcf.lifeCyclePhase.phases.length < 2 ? max : 0;
    for (const lifeCycle of pcf.lifeCyclePhase.phases) {
      data.push({ lifeCycle, nodeType, co2eq: avg, avg, min, max, count, name, y1: 0, yMin: 0, yMax: 0, yAvg: 0 })
    }
  }
  /*
  for (const tcf of fp.transport) {
    data.push({ lifeCycle: "T", nodeType, co2eq: tcf.co2eq, count, name, y1: 0, y2: 0 })
  }
   */
}

function barColor(d: VisualizationEntry) {
  let c: [number, number, number] = lifeCyclePhaseColor[d.lifeCycle as LifeCyclePhase] as [number, number, number];
  if (d.nodeType === "components") {
    c = toComponentRGB(c);
  }
  return rgbToHex(...c);
}

function sameOrUndefined(v1: any, v2: any) {
  return v1 === v2 || v1 === undefined || v2 === undefined;
}

function addEntry(to: VisualizationEntry, ...entries: VisualizationEntry[]) {
  for (const e of entries) {
    for (const [key, value] of Object.entries(e)) {
      const k = key as keyof typeof value;
      const toValue: typeof value = to[k];
      if (typeof value === "string" && toValue === undefined) {
        to[k] = value;
      } else if (typeof value === "number") {
        to[k] += value;
      }
    }
  }
  return to;
}
/*
function divideOnSqrtScale(total: number, n: number): number[] {
  if (n <= 0) {
    throw new Error("Number of parts (n) must be greater than 0.");
  }

  const result: number[] = [];
  const maxSqrt = Math.sqrt(n);

  for (let i = 0; i < n; i += 1) {
    const sqrtValue = Math.sqrt(i + 1);
    const scaledValue = (sqrtValue / maxSqrt) * total;
    result.push(scaledValue);
  }

  for (let i = result.length; i > 0; i -= 1) {
    result[i] -= result[i - 1];
  }

  return result;
}
 */

const TRANSLATE_REGEX = /translate\(([.0-9]*)[^.0-9]*([^)]*)\)/im;

function createLifeCycleObject<X>(startingValueFactory: (lifeCycle: typeof lifeCyclePhaseSequence[number]) => X): Record<typeof lifeCyclePhaseSequence[number], X> {
  return Object.fromEntries(lifeCyclePhaseSequence.map((lc) => [lc, startingValueFactory(lc)])) as Record<typeof lifeCyclePhaseSequence[number], X>;
}

function addTranslate(svgElement?: SVGElement | null, addX = 0, addY = 0) {
  if (!svgElement) {
    return;
  }
  let transform = svgElement.getAttribute("transform") || "";
  if (!transform.toLowerCase().includes("translate(")) {
    transform += " translate(0,0)"
  }
  const replacement = transform.replace(TRANSLATE_REGEX, (_, x, y) => {
    return `translate(${parseFloat(x) + addX},${parseFloat(y) + addY})`
  });
  svgElement.setAttribute("transform", replacement);
}

const DISPERSION = -2.5;

const makePlot = () => {
  if (!plot.value) {
    return;
  }

  let data: VisualizationEntry[] = [];
  const originalComponents: VisualizationEntry[] = [];
  if (props.carbonTree) {
    addFootprint(data, "asset", props.carbonTree.asset.footprint);
    const connections = props.useOriginal ? props.carbonTree.originalConnections : props.carbonTree.connections;
    // console.log("CONNECTIONS", props.carbonTree.connectionStatus);
    const workingTrees = [...Object.values(connections).map(t => [1, t] as [parentBulkCount: number, tree: CarbonTree])];
    while (workingTrees.length > 0) {
      const [parentBulkCount, t] = workingTrees.shift()!;
      const bulkCount = parentBulkCount * (props.useOriginal ? (t.originalBulkCount || 1) : t.bulkCount);
      addFootprint(data, "components", t.asset.footprint, bulkCount, t.name);
      // Currently, only display one lower level. Multiple levels require more than just the next line (i.e. also: From which asset to subtract).
      // workingTrees.push(...Object.values(t.connections).map(t => [parentBulkCount * t.bulkCount, t]));
    }
    const originalWorkingTrees = [...Object.values(props.carbonTree.originalConnections).map(t => [1, t] as [parentBulkCount: number, tree: CarbonTree])];
    while (originalWorkingTrees.length > 0) {
      const [parentBulkCount, t] = originalWorkingTrees.shift()!;
      const bulkCount = parentBulkCount * (t.originalBulkCount || 1);
      addFootprint(originalComponents, "components", t.asset.footprint, bulkCount, t.name);
      // Currently, only display one lower level. Multiple levels require more than just the next line (i.e. also: From which asset to subtract).
      // workingTrees.push(...Object.values(t.connections).map(t => [parentBulkCount * t.bulkCount, t]));
    }
  } else if (props.carbonFootprint) {
    addFootprint(data, "asset", props.carbonFootprint)
  }

  // Subtract component footprints from largest asset footprint of same life cycle phase.
  const largestAssetCo2eq = createLifeCycleObject<VisualizationEntry | undefined>(() => undefined);
  const subtractMax = createLifeCycleObject(() => 0);
  const subtractAvg = createLifeCycleObject(() => 0);
  const subtractMin = createLifeCycleObject(() => 0);
  for (let i = data.length - 1; i >= 0; i -= 1) {
    const d = data[i];
    if (d.nodeType === "components") {
    } else if (
      largestAssetCo2eq[d.lifeCycle] === undefined
    ) {
      largestAssetCo2eq[d.lifeCycle] = d;
    } else {
      addEntry(largestAssetCo2eq[d.lifeCycle]!, d);
      data.splice(i, 1)
    }
  }
  for (const original of originalComponents) {
    subtractAvg[original.lifeCycle] += original.avg;
    subtractMin[original.lifeCycle] += original.min;
    subtractMax[original.lifeCycle] += original.max;
  }
  for (const lifeCycle of Object.keys(largestAssetCo2eq) as (typeof lifeCyclePhaseSequence[number])[]) {
    if ((largestAssetCo2eq[lifeCycle]?.min || -1) > subtractMin[lifeCycle]) {
      largestAssetCo2eq[lifeCycle]!.min! -= subtractMin[lifeCycle];
    }
    if ((largestAssetCo2eq[lifeCycle]?.avg || -1) > subtractAvg[lifeCycle]) {
      largestAssetCo2eq[lifeCycle]!.avg! -= subtractAvg[lifeCycle];
    }
    if ((largestAssetCo2eq[lifeCycle]?.max || -1) > subtractMax[lifeCycle]) {
      largestAssetCo2eq[lifeCycle]!.max! -= subtractMax[lifeCycle];
    }
  }

  data.sort((a, b) => b.avg - a.avg);

  // Calculate y1, yMin, yAvg, yMax
  const nextYMax = createLifeCycleObject(() => 0);
  const nextY = createLifeCycleObject(() => 0);
  if (props.nodeTypeFilter !== "components") {
    for (const d of data.filter(x => x.nodeType === "asset")) {
      d.yMin = nextYMax[d.lifeCycle] + d.min;
      d.yMax = nextYMax[d.lifeCycle] + d.max;
      d.yAvg = nextYMax[d.lifeCycle] + d.avg;
      nextY[d.lifeCycle] = d.yAvg;
      nextYMax[d.lifeCycle] = d.yMax;
    }
    for (const d of data.filter(x => x.nodeType === "components")) {
      if (nextYMax[d.lifeCycle] === nextY[d.lifeCycle] || !props.showMinMax) {
        d.y1 = nextY[d.lifeCycle];
      } else {
        d.y1 = nextYMax[d.lifeCycle];
      }
      d.yMin = d.y1 + d.min;
      d.yMax = d.y1 + d.max;
      d.yAvg = d.y1 + d.avg;
      nextYMax[d.lifeCycle] = d.yMax;
      nextY[d.lifeCycle] = d.yAvg;
    }
  } else {
    data.sort((a, b) => a.avg - b.avg);
    for (const d of data.filter(x => x.nodeType === "components")) {
      d.y1 = nextY[d.lifeCycle];
      d.yMin = d.y1 + d.min;
      d.yMax = d.y1 + d.max;
      d.yAvg = d.y1 + d.avg;
      nextY[d.lifeCycle] = d.y1 + (props.showMinMax ? d.max : d.avg);
    }
  }

  const min = Math.min(...data.filter(d => d.min > 0).map(d => d.min));
  const max = Math.max(...data.map(d => d.max));
  const toUnit = bestMatchingGrams((min+max)/2, "kg");

  data = data.filter(d => (d.co2eq !== 0 || d.max && d.max !== 0) && (!props.nodeTypeFilter || props.nodeTypeFilter === d.nodeType));
  data = _.cloneDeep(data);

  yMax.value = Math.max(...data.map(d => d.yMax), yMax.value, props.yMax || 0)

  const rules = data.filter(d => d.yMin < d.yMax);

  const componentCounts = createLifeCycleObject(() => 0);
  for (const d of data.filter(x => x.nodeType === "components")) {
    componentCounts[d.lifeCycle] += 1;
  }
  const maxComponentCount = Math.max(...Object.values(componentCounts), 1);
  const stageHeight = 30;
  if (!props.yMax || props.yMax !== yMax.value) {
    emit('yMaxChange', yMax.value);
  }
  const p = Plot.plot({
    width: Math.max(plot.value.clientWidth, 480),
    /*
    facet: {
      data,
      x: (d) => d.lifeCycle[0]
    },
     */
    // color: { label: "Source" },
    y: {
      grid: true,
      domain: [0, convertGrams(yMax.value, "kg", toUnit)],
      label: `CO2eq in ${toUnit}`,
      transform: (f) => convertGrams(f, "kg", toUnit),
      type: props.useSqrtScale ? "sqrt" : "linear",
      insetBottom: stageHeight, // TODO: insetTop
    },
    x: {
      label: null,
      ticks: [],
      // ticks: base.map(b => b.lifeCycle).filter(t => !t.endsWith("_"))
    },
    marks: [
      Plot.axisX({
        filter: (d) => !d.endsWith("_"),
        render: (index, scaled, values, dimensions, context, next) => {
          const el = next?.(index, scaled, values, dimensions, context);
          if (el && (el.getAttribute("aria-label") || "").includes("label")) {
            const firstTransform = (el.childNodes.item(0) as SVGTextElement).getAttribute("transform") || "";
            const secondTransform = (el.childNodes.item(1) as SVGTextElement).getAttribute("transform") || "";
            const firstX = TRANSLATE_REGEX.exec(firstTransform)?.[1] || "0";
            const secondX = TRANSLATE_REGEX.exec(secondTransform)?.[1] || "0";
            const width = parseFloat(secondX) - parseFloat(firstX);
            const hPadding = 3;
            const height = 8 + 2 * hPadding;
            const prependChildren: SVGElement[] = [];
            for (const childNode of el.childNodes) {
              const child = childNode as SVGTextElement;
              const assetCount = componentCounts[child.textContent as LifeCyclePhase];
              const alpha = assetCount / maxComponentCount;
              const y = child.getAttribute("y") || "0";
              let transform = child.getAttribute("transform") || "";
              if (transform.includes("translate")) {
                transform = transform.replace(TRANSLATE_REGEX, (_, transX, transY) => {
                  return `translate(${parseFloat(transX) - width/2},${parseFloat(transY) - height + hPadding})`
                });
              } else {
                transform += `; translate(${-width/2}, ${-height})`
              }
              prependChildren.push(createSVGElement({
                tag: 'rect', attributes: { y, height: height.toString(10), width: width.toString(10), transform, fill: `rgba(${MAX_ASSET_RGB.join(",")}, ${alpha})`}
              }));
            }
            for (const newChild of prependChildren) {
              el.prepend(newChild);
            }
          }
          return el;
        }
      }),
      Plot.frame({
        render: (index, scaled, values, dimensions, context, next) => {
          const el = next?.(index, scaled, values, dimensions, context);
          if (!el) {
            return el;
          }
          const x = parseFloat(el.getAttribute("x") || "0");
          const y = parseFloat(el.getAttribute("y") || "0") + parseFloat(el.getAttribute("height") || "0") - stageHeight   ;
          const globalWidth = parseFloat(el.getAttribute("width") || "0");
          const height = stageHeight;
          let offsetX = x;
          const elementWidth = globalWidth / (lifeCycleStageSequence.length - 1 + lifeCyclePhaseSequence.length);
          const content: SVGElementConfig[] = lifeCycleStageSequence.map((s, i) => {
            const phases = lifeCyclePhaseByStage[s];
            const x = offsetX;
            const width = phases.length * elementWidth;
            offsetX += width + elementWidth;
            return [
              ...(i === 0 ? [] : [ { tag: 'text', attributes: { x: x - elementWidth / 2, y: y + height / 2, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 12 }, content: "\u2192" } ]),
              { tag: 'rect', attributes: { x, width, height, y, fill: `rgba(${lifeCycleStageColor[s].join(",")},.3)` } },
              { tag: 'text', attributes: { x: x + width / 2, y: y + height / 2, "text-anchor": "middle", "dominant-baseline": "central", "font-size": 12 }, content: `${ucfirst(lifeCycleStageDescription[s])}` },
            ];
          }).flat();
          return createSVGElement({ tag: 'g', content });
        }
      }),
      // Scales and grids
      Plot.rectY(base, { x: "lifeCycle", y: "co2eq" }),
      Plot.ruleX(
        base,
        {
          x: "lifeCycle",
          y: yMax.value,
          filter: (d) => d.lifeCycle.endsWith("_"),
          strokeOpacity: .1,
        }
      ),
      // Plot.barY([{ x: "T", y: yMax.value }], { x: "x", y: "y", insetLeft: -14, insetRight: -8, fillOpacity: 0.1 }),
      // Data
      // Bars 1 (background/tooltip)
      Plot.barY(
        data,
        {
          sort: props.useSqrtScale ? "co2eq" : undefined,
          x: "lifeCycle",
          y1: "y1",
          y2: "yAvg",
          // y: "co2eq",
          fill: "transparent",
          insetBottom: 1,
          tip: {
            render: (index, scaled, values, dimensions, context, next) => {
              const el = next?.(index, scaled, values, dimensions, context);
              if (el) {
                el.style.pointerEvents = "none";
                const text = el.querySelector("text")
                const d = data[index[0]];
                addTranslate(text?.parentNode?.parentNode as SVGElement | null, d?.nodeType === "asset" ? -DISPERSION : DISPERSION);
                if (text && d) {
                  const fill = barColor(d);
                  text.replaceChildren(...createTooltipElement(d, toUnit, fill))
                }
              }
              // el.appendChild(<>)
              return el || null;
            },
          },
        }
      ),
      // Bars 2 (foreground)
      Plot.barY(
        data.filter(d => d.nodeType === "asset"),
        {
          sort: props.useSqrtScale ? "co2eq" : undefined,
          x: "lifeCycle",
          y1: "y1",
          y2: "yAvg",
          dx: -DISPERSION,
          // y: "co2eq",
          fill: barColor,
          // insetBottom: 1,
          // strokeWidth: 1,
          strokeLinejoin: "bivel",
        }),
      Plot.barY(
        data.filter(d => d.nodeType === "components"),
        {
          sort: props.useSqrtScale ? "co2eq" : undefined,
          x: "lifeCycle",
          y1: "y1",
          y2: "yAvg",
          // y: "co2eq",
          dx: DISPERSION,
          fill: barColor,
          // insetBottom: 1,
          // strokeWidth: 1,
          strokeLinejoin: "bivel",
        }),
      props.showMinMax ?
      // Confidence intervals 1
      Plot.ruleX(
        rules.filter(d => d.nodeType === "asset"),
        {
          x: "lifeCycle",
          y1: "yMin",
          y2: "yMax",
          marker: 'tick',
          dx: -DISPERSION,
          stroke: (d) => d.count > 1 ? "#000" : "#999",
        }
      ) : [],
      props.showMinMax ? Plot.ruleX(
        rules.filter(d => d.nodeType === "components"),
        {
          x: "lifeCycle",
          y1: "yMin",
          y2: "yMax",
          marker: 'tick',
          dx: DISPERSION,
          stroke: "#000",
        }
      ) : [],
      // Confidence intervals 2
      // Plot.ruleX(
      //   Object.values(columnInfo),
      //   { x: "lifeCycle", y1: (d) => d.assetTotalMax + d.componentsTotal, y2: (d) => d.assetTotalMax + d.componentsTotalMax, marker: 'tick', filter: (d) => (d.assetTotalMax + d.componentsTotal) < (d.assetTotalMax + d.componentsTotalMax) }
      // ),
      // Plot.ruleY([0]),
      Plot.tickY(
        data.filter(d => d.nodeType === "components"),
        {
          sort: props.useSqrtScale ? "co2eq" : undefined,
          x: "lifeCycle",
          y: "yAvg",
          // y: "co2eq",
          dx: DISPERSION,
          stroke: "rgba(255, 255, 255, .5)",
          // insetBottom: 1,
          // strokeWidth: 1,
        }
      ),
      // Plot.gridX(["A4", "B7", "C4", "D"], { dx: 16.5, strokeOpacity: 1 }),
      // Plot.frame({ fill: "#F00", fillOpacity: 0.2 }),
      // Plot.tip(data, Plot.pointer({ x: "lifeCycle", title: (d) => d.co2eq }))
    ]
  })


  for (const child of plot.value.childNodes) {
    child.remove();
  }
  plot.value.appendChild(p);
}

watch(() => plot.value, makePlot)
watch(() => [
  props.carbonFootprint,
  props.carbonTree,
  props.nodeTypeFilter,
  props.useSqrtScale,
  props.showMinMax,
  props.yMax,
], makePlot);
window.addEventListener('resize', debounce(makePlot, 250));
</script>

<template>
  <div ref="plot"></div>
</template>
