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

<script setup lang="tsx">
import { useRoute } from 'vue-router'
import { computed, inject, type Ref, ref } from 'vue'
import { CubeIcon, CubeTransparentIcon } from '@heroicons/vue/24/outline'
import { generateColor, loadFullAssetInfo, simulationFromRoute } from '@/lib/util'
import { BackOnErrorHandler } from '@/lib/BackOnErrorHandler'
import { AssetIdMap } from '@/lib/AssetIdMap'
import { assetIdMapKey } from '@/lib/injectionKeys'
import { computedAsync } from '@vueuse/core'
import comparison from '@/lib/Comparison'
import { LifeCyclePhases } from '../lib/lifeCycleUtil'
import Co2eqDiff from '@/components/Co2eqDiff.vue'
import { storageRef } from '@/lib/storage'
import BreadcrumbsBar from '@/components/BreadcrumbsBar.vue'
const warnings = ref<[string, string | undefined][]>([]);
const route = useRoute();

const idMap = inject<Ref<AssetIdMap>>(assetIdMapKey);
const infos = computedAsync(async () => {
  if (!idMap?.value) {
    return undefined;
  }
  const { first, second } = route.params;
  const data = ([first, second] as const).map((a) => BackOnErrorHandler.bind(
    loadFullAssetInfo(a, idMap.value, "url-", (...args) => warnings.value.push(args), simulationFromRoute(route)),
    (e) => {
      console.error(e);
      if (e.status === 422) {
        return ["The URL to the asset is invalid or does not point to a valid asset", "Check the link"]
      }
      return ["An error occurred while loading the asset", "Try another asset"];
    }
  ));
  return Promise.all(data);
}, undefined)

const first = computed(() => infos.value?.[0]);
const second = computed(() => infos.value?.[1]);

const comp = computed(() => {
  if (first.value?.carbonFootprint && second.value?.carbonFootprint) {
    const c = comparison(first.value, second.value);
    return c;
  }
  return undefined;
})

function onlyTrue(arr: any): boolean | undefined {
  if (!Array.isArray(arr)) {
    return undefined;
  }
  return arr.every((x: any) => x === true);
}

const coveredLifeCyclePhasesIntersection = computed(() => {
  if (!first.value?.carbonFootprint?.coveredLifeCyclePhases || !second.value?.carbonFootprint?.coveredLifeCyclePhases) {
    return [];
  }
  return first.value.carbonFootprint.coveredLifeCyclePhases.intersection(second.value.carbonFootprint.coveredLifeCyclePhases);
})

const showDebug = storageRef("showDebug", false);

</script>

<template>
  <BreadcrumbsBar class="mt-1.5 ml-4" />
  <div class="grid gap-4 m-4 grid-cols-5">
    <div></div>
    <div v-for="(i, j) of infos" :key="j" class="col-span-2 flex">
      <CubeTransparentIcon v-if="i.description.assetKind === 'Type'" class="size-8 rounded inline-block p-1 text-gray-800" :style="`background: ${generateColor(i.asset.id)}`" />
      <CubeIcon v-else class="size-8 rounded inline-block p-1 text-gray-800" :style="`background: ${generateColor(i.asset.id)}`" />
      <div class="pl-2">
        <h1 class="col col-span-2 text-2xl">
          {{ i.description.name }}
        </h1>
        <h2 v-if="i.description.idShort" class="col-span-2 font-mono text-sm">{{ i.description.idShort
          }}</h2>
        <p class="pt-3 ital" v-if="i.description.description">{{ i.description.description }}</p>
      </div>
    </div>
    <div class="col-span-5"><h2 class="text-2xl text-center shadow-inner bg-gray-50 py-2">Carbon Footprint</h2></div>
    <template v-if="first?.carbonFootprint && second?.carbonFootprint && comp?.carbonFootprint">
      <table class="col-span-5 table text-center">
        <thead>
          <tr>
            <th class="w-1/5"></th>
            <th class="w-1/5">Product</th>
            <th class="w-1/5 border-r">Transport</th>
            <th class="w-1/5">Product</th>
            <th class="w-1/5">Transport</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th></th>
            <td><Co2eqDiff :value="first.carbonFootprint.productCo2eq" :other="second.carbonFootprint.productCo2eq" /></td>
            <td class="border-r"><Co2eqDiff :value="first.carbonFootprint.transportCo2eq" :other="second.carbonFootprint.transportCo2eq" /></td>
            <td><Co2eqDiff :value="second.carbonFootprint.productCo2eq" :other="first.carbonFootprint.productCo2eq" /></td>
            <td><Co2eqDiff :value="second.carbonFootprint.transportCo2eq" :other="first.carbonFootprint.transportCo2eq" /></td>
          </tr>
          <tr>
            <th>Total</th>
            <td class="border-r" colspan="2"><Co2eqDiff :value="first.carbonFootprint.totalCo2eq" :other="second.carbonFootprint.totalCo2eq" /></td>
            <td colspan="2"><Co2eqDiff :value="second.carbonFootprint.totalCo2eq" :other="first.carbonFootprint.totalCo2eq" /></td>
          </tr>
        </tbody>
      </table>

      <div>Covered Life Cycle Phases</div>
      <div class="col-span-4 text-center bg-gray-100" v-if="coveredLifeCyclePhasesIntersection.length === first.carbonFootprint.coveredLifeCyclePhases.length">{{ first.carbonFootprint.coveredLifeCyclePhases.toString() }}</div>
      <template v-else>
        <div class="col-span-2 text-center bg-gray-100">
          <template v-for="(p, i) of first.carbonFootprint.coveredLifeCyclePhases.phases" :key="p">
            {{ (i === 0 ? "" : ", ") }}
            <template v-if="coveredLifeCyclePhasesIntersection.includes(p)">{{ p }}</template>
            <strong v-else>{{ p }}</strong>
          </template>
        </div>
        <div class="col-span-2 text-center bg-gray-100">
          <template v-for="(p, i) of second.carbonFootprint.coveredLifeCyclePhases.phases" :key="p">
            {{ (i === 0 ? "" : ", ") }}
            <template v-if="coveredLifeCyclePhasesIntersection.includes(p)">{{ p }}</template>
            <strong v-else>{{ p }}</strong>
          </template>
        </div>
      </template>

      <button class="btn btn-outline" type="button" @click="showDebug = !showDebug">{{ showDebug ? "Hide" : "Show" }} Debug</button>
      <pre class="col-span-2 bg-gray-100 p-4 rounded-lg shadow-lg" v-if="showDebug">{{ first.carbonFootprint }}</pre>
      <pre class="col-span-2 bg-gray-100 p-4 rounded-lg shadow-lg" v-if="showDebug">{{ second.carbonFootprint }}</pre>
    </template>
  </div>
</template>
