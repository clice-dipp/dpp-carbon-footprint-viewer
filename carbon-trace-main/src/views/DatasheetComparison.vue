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

import { useRoute } from 'vue-router'
import type { components } from '@/lib/api/AssetAdministrationShellRepository'
import { computed, inject, onUnmounted, type Ref, ref, watch } from 'vue'
import { BackOnErrorHandler } from '@/lib/BackOnErrorHandler'
import { computedAsync } from '@vueuse/core'
import { convertGrams, grams, loadFullAssetInfo, or, simulationFromRoute } from '@/lib/util'
import { AssetIdMap } from '@/lib/AssetIdMap'
import { assetIdMapKey, shellDescriptionsKey } from '@/lib/injectionKeys'
import { AnalysisWarningHandler } from '@/lib/AnalysisWarningHandler'
import {
  StarIcon as SolidStarIcon
} from '@heroicons/vue/24/solid'
import AnalysisWarnings from '@/components/AnalysisWarnings.vue'
import CarbonTree from '../lib/model/CarbonTree'
import BreadcrumbsBar from '@/components/BreadcrumbsBar.vue'
import { debounce, sum } from 'lodash'
import { LifeCyclePhases } from '../lib/lifeCycleUtil'
import CarbonFootprint from '@/lib/model/CarbonFootprint'
import { storageRef } from '@/lib/storage'
import ShellCard from '@/components/ShellCard.vue'
import type { ShellDescriptionSmallInterface } from '@/lib/api/shellTypes'
import { StarIcon } from '@heroicons/vue/24/outline'

const warnings = ref<[string, string | undefined][]>([]);
const route = useRoute();

const showAssetModal = ref(false);
const searchValue = ref("");
const allDescriptions = inject<Ref<ShellDescriptionSmallInterface[]>>(shellDescriptionsKey)
const hiddenShells = computed<boolean[] | undefined>(() => {
  if (!searchValue.value) { return undefined; }
  const s = searchValue.value.toLowerCase();
  return allDescriptions?.value.map(
    (d) =>
      !d.id.toLowerCase().includes(s) &&
      !d.name.toLowerCase().includes(s) &&
      !d.globalAssetId.toLowerCase().includes(s) &&
      !d.idShort?.toLowerCase().includes(s) &&
      !d.description?.toLowerCase().includes(s)
  )
})
const selectedShells = ref(new Set<string>(route.params.assets?.map(atob)));

function toggleSelectedShell(globalAssetId: string) {
  if (selectedShells.value.has(globalAssetId)) {
    selectedShells.value.delete(globalAssetId);
  } else {
    selectedShells.value.add(globalAssetId);
  }
}

const favorites = storageRef<{ [globalAssetId: string]: boolean }>("selectedShellsById", {})
const modalShells = computed(() => {
  return allDescriptions?.value?.filter((_, i) => !hiddenShells.value?.[i]).sort((a, b) => {
    console.log(a, favorites.value);
    if (favorites.value?.[a.globalAssetId] === favorites.value?.[b.globalAssetId]) {
      return 0;
    }
    if (favorites.value?.[a.globalAssetId]) {
      return -1;
    }
    return 1;
  });
});

const idMap = inject<Ref<AssetIdMap>>(assetIdMapKey);
const infos = computedAsync<(Awaited<ReturnType<typeof loadFullAssetInfo>> & { 'carbonFootprint': CarbonFootprint })[]>(async () => {
  if (!idMap?.value) {
    return [];
  }
  const { assets } = route.params;
  const data = (Array.isArray(assets) ? assets : [ assets ]).map((a) => BackOnErrorHandler.bind(
    loadFullAssetInfo(a, idMap.value, "url-", (...args) => warnings.value.push(args), simulationFromRoute(route)),
    (e) => {
      console.error(e);
      if (e.status === 422) {
        return ["The URL to the asset is invalid or does not point to a valid asset", "Check the link"]
      }
      return ["An error occurred while loading the asset", "Try another asset"];
    }
  ));
  return (await Promise.all(data)).filter(i => (i.carbonTree || i.carbonFootprint) !== undefined);
}, undefined)

const hiddenAssets = computed(() => {
  const assets = Array.isArray(route.params.assets) ? route.params.assets : [ route.params.assets ];
  if (!infos.value) {
    return [];
  }
  if (assets.length === infos.value.length) {
    return [];
  }
  return assets.map(atob).filter(a => infos.value.every((i) => i.asset.assetInformation.globalAssetId !== a));
})

watch(() => hiddenAssets.value, (newValue) => {
  if (newValue.length) {
    warnings.value.unshift(["Asset not being displayed", `Following assets are not being displayed because they do not contain carbon footprint information: ${newValue.join(', ')}`])
  }
})

const descriptions = computed(() => infos.value.map(i => i.description));
const addresses = computed(() => infos.value.map(i => i.address));
const carbon = computed<(CarbonTree | CarbonFootprint)[]>(() => (infos.value || []).map(i => i.carbonTree || i.carbonFootprint));

const carbonMultipliers = ref<number[]>([]);
watch(() => carbon.value, (newValue) => {
  carbonMultipliers.value = Array(newValue.length).fill(1);
})


function co2eqByLifeCyclePhases(
  data: CarbonTree | CarbonFootprint,
  customCount?: number,
  includeBulkCount = false
): { [lifeCyclePhases: string]: number} {
  if (data instanceof CarbonFootprint) {
    return Object.fromEntries(data.product.map((p) => [p.lifeCyclePhase.toString(), p.co2eq * (customCount || 1)]));
  }
  const count = includeBulkCount ? customCount || data.connection?.bulkCount || 1 : customCount || 1;
  if (data.asset.footprint) {
    return Object.fromEntries(data.asset.footprint.product.map((p) => [p.lifeCyclePhase.toString(), p.co2eq * count]));
  }
  const phases = data.connectionsArray.map((p) => co2eqByLifeCyclePhases(p, undefined, true));
  const co2eqs = phases[0];
  for (let i = 1; i < phases.length; i += 1) {
    const p = phases[i];
    for (const [k, v] of Object.entries(p)) {
      co2eqs[k] = (co2eqs[k] || 0) + v * count;
    }
  }
  return co2eqs;
}


const carbonValues = computed(() => (
  carbon.value.map((c, i) => ({
    'totalCo2eq': (c?.totalCo2eq || 0) * carbonMultipliers.value[i],
    'productCo2eq': (c?.productCo2eq || 0) * carbonMultipliers.value[i],
    'transportCo2eq': (c?.transportCo2eq || 0) * carbonMultipliers.value[i]
  }))
));
const carbonSums = computed(() => ({
  'totalCo2eq': sum(carbonValues.value.map(c => c.totalCo2eq)),
  'productCo2eq': sum(carbonValues.value.map(c => c.productCo2eq)),
  'transportCo2eq': sum(carbonValues.value.map(c => c.transportCo2eq)),
}))
const carbonMax = computed(() => ({
  'totalCo2eq': Math.max(...carbonValues.value.map(c => c.totalCo2eq)),
  'productCo2eq': Math.max(...carbonValues.value.map(c => c.productCo2eq)),
  'transportCo2eq': Math.max(...carbonValues.value.map(c => c.transportCo2eq)),
}))

const co2eqByPhases = computed(() => (
  carbon.value.map((c, i) => co2eqByLifeCyclePhases(c, carbonMultipliers.value[i]))
));
const availableCo2eqPhases = computed(() => [...new Set(co2eqByPhases.value.map(Object.keys).flat())].sort());
const co2eqPhaseSums = computed(() => Object.fromEntries(availableCo2eqPhases.value.map((p) => [p, sum(co2eqByPhases.value.map((c) => c[p] || 0))])))
const co2eqPhaseMax = computed(() => Object.fromEntries(availableCo2eqPhases.value.map((p) => [p, Math.max(...co2eqByPhases.value.map((c) => c[p] || 0))])))

const table = ref<HTMLTableElement>();

const copyToastVisible = ref(false);
let hideTimeout: number | undefined;
function showCopyToast() {
  clearTimeout(hideTimeout);
  copyToastVisible.value = true;
  hideTimeout = setTimeout(() => { copyToastVisible.value = false; }, 1000);
}

const copyValue = ref("");
const copyExplanation = ref("");
function copyContent(this: HTMLElement) {
  copyValue.value = this.attributes.getNamedItem("data-copy")?.value || this.textContent || "";
  copyExplanation.value = this.attributes.getNamedItem("data-copy-explanation")?.value || "";
  navigator.clipboard.writeText(copyValue.value);
  showCopyToast();
}

watch(() => table.value, (tableNew, tableOld) => {
  if (tableOld) {
    const oldCells = tableOld.getElementsByTagName('td');
    for (const cell of oldCells) {
      cell.removeEventListener('click', copyContent);
    }
  }
  if (!tableNew) {
    return;
  }
  const cells = tableNew.getElementsByTagName('td');
  for (const cell of cells) {
    if (!cell.classList.contains('no-copy')) {
      cell.addEventListener('click', copyContent);
      cell.classList.add('cursor-copy')
    }
  }
}, { immediate: true })

const pinCombined = storageRef("pinCombinedColumn", false);

const nextToLastRight = ref(100);
const nextToLastRightCss = computed(() => `${nextToLastRight.value}px`)

const recalculateNextToLastRight = debounce(() => {
  console.log("hallo", table.value?.querySelector('tr:first-child > *:nth-last-child(1)'))
    nextToLastRight.value = table.value?.querySelector('tr:nth-child(2) > *:nth-last-child(1)')?.clientWidth || 0;
  }, 250);

watch(() => table.value, recalculateNextToLastRight)
window.addEventListener('resize', recalculateNextToLastRight)

onUnmounted(() => {
  if (table.value) {
    const oldCells = table.value.getElementsByTagName('td');
    for (const cell of oldCells) {
      cell.removeEventListener('click', copyContent);
    }
  }
  window.removeEventListener('resize', recalculateNextToLastRight);
})

function base64(str: string) {
  return btoa(str);
}

function addAssets() {
  showAssetModal.value = true;
}
</script>

<style>
table.table-pin-next-to-last tr > *:nth-last-child(2) {
  right: v-bind(nextToLastRightCss);
}
</style>

<template>
  <dialog class="modal" :class="{ 'modal-open': showAssetModal }">
    <div class="modal-box max-w-screen-xl h-4/5 rounded-2xl shadow-lg bg-base-100 overflow-y-scroll pt-0">
      <div class="flex flex-row gap-4 justify-center items-center sticky top-0 z-20 bg-base-100 py-2 pl-4 pr-8">
        <span>Choose one or multiple assets</span>
        <input class="input input-sm py-0 bg-secondary/10 flex-grow" placeholder="Search" v-model="searchValue" />
        <form method="dialog" @click="showAssetModal = false">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
      </div>
      <div class="grid grid-cols-4 gap-4 p-4 bg-white rounded-lg">
        <em class="text-center col-span-4" v-if="hiddenShells && hiddenShells.every(x => x)">
          No assets found<br />
          <button @click="searchValue = ''" class="btn btn-secondary btn-sm">Clear Search</button>
        </em>
        <div
          v-for="(shell, i) of modalShells"
          class="relative bg-base-100 shadow-xl h-full cursor-pointer hover:scale-110 transition-all rounded hover:z-10"
          :class="{ 'outline outline-4 outline-primary': selectedShells.has(shell.globalAssetId) }"
          @click="toggleSelectedShell(shell.globalAssetId);"
        >
          <span
            v-if="favorites[shell.globalAssetId]"
            class="transition-all rounded-lg p-1 top-1 left-1 absolute z-10 w-8 h-8 bg-yellow-400 text-base-100">
            <SolidStarIcon />
          </span>
          <ShellCard
            :key="shell.globalAssetId"
            :shell="shell"
            compact
            show-co2
          />
        </div>
      </div>
      <div class="px-4 sticky bottom-0 z-20">
        <router-link
          v-if="selectedShells.size"
          class="btn btn-primary btn-block"
          :to="{ 'name': 'datasheet', params: { assets: [...selectedShells].map(base64) }}"
        >
          Compare {{ selectedShells.size }} Assets
        </router-link>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="showAssetModal = false;">close</button>
    </form>
  </dialog>
  <div class="pl-20">
    <div class="w-full relative h-screen overflow-x-auto overflow-y-auto">
      <BreadcrumbsBar class="mt-1.5 sticky left-0" />
      <AnalysisWarnings class="my-4 shadow-lg z-20 mr-4 rounded-xl sticky left-0" :warnings="warnings" />
      <div class="toast z-10" v-show="copyToastVisible">
        <div class="alert alert-info">
          <span>Copied <code class="rounded p-1 bg-black/5">{{ copyValue }}</code><span v-if="copyExplanation"> ({{ copyExplanation }})</span>.</span>
        </div>
      </div>
      <div>
        <table v-if="infos && infos.length > 0" class="table table-pin-cols table-pin-rows table-data" :class="{ 'table-pin-next-to-last': pinCombined }" ref="table">
          <!--
          <colgroup>
            <col />
            <col class="col-content" v-for="d of ds" :key="d.id" />
            <col class="col-content" />
          </colgroup>
          -->
          <thead>
            <tr class="border-b-0">
              <th class="pt-0 pb-0"></th>
              <th class="pt-0 pb-0" v-for="d of descriptions" :key="d!.id">
                <div class="join join-horizontal flex pt-1">
                  <router-link :to="{ name: 'visualization.single', params: { asset: base64(d!.globalAssetId) } }" class="btn flex-grow join-item btn-secondary/10 btn-xs" target="_blank">View Asset</router-link>
                  <router-link
                    v-if="descriptions.length > 1"
                    :to="{ name: 'datasheet', params: { assets: descriptions.filter(other => other !== d).map(o => base64(o.globalAssetId)) }}"
                    class="btn btn-error join-item btn-xs"
                  >&times;</router-link>
                </div>
              </th>
              <th></th>
              <th></th>
            </tr>
            <tr class="bg-secondary" style="z-index: 100;">
              <th class="pt-0 pb-0"></th>
              <th v-for="(d, i) of descriptions" :key="d!.id" class="pt-0 pb-0">
                <div class="flex items-center">
                  <span class="flex-grow">{{ d!.name }}</span>
                  <div class="ml-2 input input-sm input-bordered flex items-center gap-2 px-1">
                    <button class="btn btn-xs btn-secondary" :disabled="carbonMultipliers[i] <= 0 ? true : undefined" @click="carbonMultipliers[i] = Math.max(0, carbonMultipliers[i]-1)">-</button>
                    <input class="input input-xs w-10 hide-controls grow text-center" type="number" min="0" v-model="carbonMultipliers[i]" />
                    <button class="btn btn-xs btn-secondary" @click="carbonMultipliers[i] += 1">+</button>
                  </div>
                </div>
              </th>
              <th class="relative w-4">
                <button
                  type="button"
                  class="absolute inset-0 bg-base-200"
                  @click="addAssets"
                >+</button>
              </th>
              <th>
                <div class="flex items-center">
                  <em>Combined</em>
                  <span class="tooltip tooltip-left font-normal" data-tip="Pin column">
                    <input type="checkbox" class="checkbox checkbox-secondary checkbox-sm ml-2" v-model="pinCombined" />
                  </span>
                </div>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Name</th>
              <td v-for="d of descriptions" :key="d.id">{{ d.name }}</td>
              <td class="relative w-4 no-copy">
                <button
                  type="button"
                  class="absolute inset-0 bg-base-200"
                  @click="addAssets"
                >+</button>
              </td>
              <td></td>
              <th>Name</th>
            </tr>
            <tr>
              <th>Description</th>
              <td v-for="d of descriptions" :key="d.id">{{ d.description }}</td>
              <td class="relative w-4 no-copy">
                <button
                  type="button"
                  class="absolute inset-0 bg-base-200"
                  @click="addAssets"
                >+</button>
              </td>
              <td></td>
              <th>Description</th>
            </tr>
            <tr>
              <th>ID</th>
              <td v-for="d of descriptions" :key="d.id">{{ d.id }}</td>
              <td class="relative w-4 no-copy">
                <button
                  type="button"
                  class="absolute inset-0 bg-base-200"
                  @click="addAssets"
                >+</button>
              </td>
              <td></td>
              <th>ID</th>
            </tr>
            <tr>
              <th>Global Asset ID</th>
              <td v-for="d of descriptions" :key="d.id">{{ d.globalAssetId }}</td>
              <td class="relative w-4 no-copy">
                <button
                  type="button"
                  class="absolute inset-0 bg-base-200"
                  @click="addAssets"
                >+</button>
              </td>
              <td></td>
              <th>Global Asset ID</th>
            </tr>
            <tr>
              <th>ID Short</th>
              <td v-for="d of descriptions" :key="d.id">{{ d.idShort }}</td>
              <td class="relative w-4 no-copy">
                <button
                  type="button"
                  class="absolute inset-0 bg-base-200"
                  @click="addAssets"
                >+</button>
              </td>
              <td></td>
              <th>ID Short</th>
            </tr>
            <tr>
              <th>Asset Kind</th>
              <td v-for="d of descriptions" :key="d.id">{{ d.assetKind }}</td>
              <td class="relative w-4 no-copy">
                <button
                  type="button"
                  class="absolute inset-0 bg-base-200"
                  @click="addAssets"
                >+</button>
              </td>
              <td></td>
              <th>Asset Kind</th>
            </tr>
            <tr>
              <th>Address</th>
              <td v-for="(a, i) of addresses" :key="i">{{ a }}</td>
              <td class="relative w-4 no-copy">
                <button
                  type="button"
                  class="absolute inset-0 bg-base-200"
                  @click="addAssets"
                >+</button>
              </td>
              <td></td>
              <th>Address</th>
            </tr>
            <tr
              class="hover-with-before group"
              v-for="[name, key] of ([['Total CO2eq', 'totalCo2eq'], ['Product CO2eq', 'productCo2eq'], ['Transport CO2eq', 'transportCo2eq']] as const)"
              :key="key"
            >
              <th class="z-10">{{ name }}</th>
              <td
                v-for="(c, i) of carbon"
                :key="i"
                class="bg-base-100 group-hover:bg-base-100"
                :data-copy="convertGrams(carbonValues[i][key], 'kg', 'g')"
                data-copy-explanation="CO2eq in g"
                :style="`--bg-alpha: ${(carbonValues[i][key] / carbonMax[key]) * .25};`"
              >
                {{ grams(carbonValues[i][key], "kg") }}
                <small v-if="carbonMultipliers[i] !== 1" class="float-right">
                  (for {{ carbonMultipliers[i] }} units)
                </small>
              </td>
              <td class="relative w-4 no-copy">
                <button
                  type="button"
                  class="absolute inset-0 bg-base-200"
                  @click="addAssets"
                >+</button>
              </td>
              <td
                :data-copy="convertGrams(carbonSums[key], 'kg', 'g')"
                data-copy-explanation="CO2eq in g"
              >{{ grams(carbonSums[key], "kg") }}</td>
              <th>{{ name }}</th>
            </tr>
            <tr>
              <th>Covered Life Cycle Phases</th>
              <td v-for="(c, i) of carbon" :key="i">{{ or(c?.coveredLifeCyclePhases, () => (c instanceof CarbonTree ? `${c.byChildrenCoveredLifeCyclePhases} (from its components)` : undefined)) }}</td>
              <td class="relative w-4 no-copy">
                <button
                  type="button"
                  class="absolute inset-0 bg-base-200"
                  @click="addAssets"
                >+</button>
              </td>
              <td>{{ LifeCyclePhases.merged(...carbon.map(c => c?.coveredLifeCyclePhases).filter(x => x !== undefined) as LifeCyclePhases[]) }}</td>
              <th>Covered Life Cycle Phases</th>
            </tr>
            <tr v-for="phase of availableCo2eqPhases" :key="phase" class="hover-with-before group">
              <th class="z-10">{{ phase }}</th>
              <td
                v-for="(c, i) of co2eqByPhases"
                :key="i"
                class="bg-base-100 group-hover:bg-base-100"
                :data-copy="c[phase] ? convertGrams(c[phase], 'kg', 'g') : ''"
                data-copy-explanation="CO2eq in g"
                :style="`--bg-alpha: ${(c[phase] / co2eqPhaseMax[phase]) * .25};`"
              >
                {{ c[phase] ? grams(c[phase], "kg") : '' }}
                <small v-if="c[phase] && carbonMultipliers[i] !== 1" class="float-right">
                  (for {{ carbonMultipliers[i] }} items)
                </small>
              </td>
              <td class="relative w-4 no-copy">
                <button
                  type="button"
                  class="absolute inset-0 bg-base-200"
                  @click="addAssets"
                >+</button>
              </td>
              <td
                :data-copy="convertGrams(co2eqPhaseSums[phase], 'kg', 'g')"
                class="bg-base-100 group-hover:bg-base-100"
                data-copy-explanation="CO2eq in g"
              >{{ grams(co2eqPhaseSums[phase], "kg") }}</td>
              <th>{{ phase }}</th>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th></th>
              <th v-for="d of descriptions" :key="d.id">{{ d.name }}</th>
              <th class="relative w-4 no-copy">
                <button
                  type="button"
                  class="absolute inset-0 bg-base-200"
                  @click="addAssets"
                >+</button>
              </th>
              <th><em>Combined</em></th>
              <th></th>
            </tr>
          </tfoot>
        </table>
      </div>
      <div class="sticky left-0 hidden">
        <pre>{{ co2eqByPhases }}</pre>
        <pre v-for="info of infos">{{ info.description }}</pre>
      </div>
    </div>
  </div>
</template>
