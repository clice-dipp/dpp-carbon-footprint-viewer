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
import { computed, type ComputedRef, inject, provide, reactive, type Ref, ref, watch } from 'vue'
import ShellCard from '@/components/ShellCard.vue'
import { assetIdMapKey, externalShellsKey, shellDescriptionsKey } from '@/lib/injectionKeys'
import shellRepo from '@/lib/api/shells'
import type { ShellDescriptionSmallInterface } from '@/lib/api/shellTypes'
import {
  CubeIcon,
  GlobeEuropeAfricaIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronUpIcon,
  XMarkIcon,
  ArrowLeftIcon,
  StarIcon
} from '@heroicons/vue/24/outline'
import {
  StarIcon as SolidStarIcon
} from '@heroicons/vue/24/solid'
import { createUpdateQuery, pluralize } from '@/lib/util'
import { type RouteLocationRaw, useRouter } from 'vue-router'
import clients from '@/lib/api/clients'
import type { components } from '@/lib/api/AssetAdministrationShellRepository'
import { toDescriptionSmall, toDescriptionsSmall } from '@/lib/api/registry'
import { storageRef } from '@/lib/storage'
import BreadcrumbsBar from '@/components/BreadcrumbsBar.vue'

const descriptions = inject<Ref<ShellDescriptionSmallInterface[]>>(shellDescriptionsKey)
const descriptionsById = computed(() => Object.fromEntries((descriptions?.value || []).map(d => [d.globalAssetId, d])))

const router = useRouter();
const updateQuery = createUpdateQuery(router);
function base64(str: string) {
  return btoa(str);
}

type AnalysisOption = {
  name: string,
  description: string,
  colorClass: string,
  paleColorClass: string,
  colorGradientClass: string,
  paleColorGradientClass: string,
  route: (shells?: ShellDescriptionSmallInterface[]) => RouteLocationRaw,
  min?: number,
  max?: number,
}

const showExternal = computed(() => clients.hasAssetAdditionals && router.currentRoute.value.query.assets === "external");
const externalUrl = ref("");
const hiddenErrors = storageRef<string[]>("permanentlyHiddenErrors", []);

const externalShells = inject<Ref<{ [url: string]: null | string | components["schemas"]["AssetAdministrationShell"][] }>>(externalShellsKey);
const externalAssets = computed<{[globalAssetId: string]: ShellDescriptionSmallInterface}>(() => {
  return Object.fromEntries(
    toDescriptionsSmall(
      Object.values(externalShells?.value || {})
      .filter(Array.isArray)
      .flat()
    ).map((s) => [s.globalAssetId, s])
  )
});

const searchString = ref("");
const searchResult = computed(() => {
  if (searchString.value.trim().length === 0) {
    return [];
  }
  const attrs = ["id", "name", "globalAssetId", "idShort", "description"] as const;
  return [...Object.values(externalAssets?.value || {}), ...(descriptions?.value || [])].filter(
    (d) => attrs.some((a) => d[a]?.toLowerCase().includes(searchString.value.toLowerCase()))
  );
})

const selectedShellsById = storageRef<{ [globalAssetId: string]: boolean }>("selectedShellsById", {})
const selectedShells = computed(() =>
  Object.entries(selectedShellsById.value)
    .filter(([, isSelected]) => isSelected)
    .map(([id]) => descriptionsById.value[id] || externalAssets.value[id] || null)
    .filter(s => s !== null)
)

const analysisOptions: AnalysisOption[] = [
  {
    name: "Overview",
    description: "Not familiar whit the asset and its components? Get an overview.",
    colorClass: "bg-yellow-400/50",
    paleColorClass: "bg-yellow-400/20",
    colorGradientClass: "from-yellow-400/50",
    paleColorGradientClass: "to-yellow-400/20",
    min: 1,
    max: 1,
    route: (shells) => ({ name: 'visualization.single', params: { 'asset': btoa((shells || selectedShells.value)[0]?.globalAssetId) }})
  },
  {
    name: "Component Analysis",
    description: "Is one responsible for most of the products footprint?",
    colorClass: "bg-yellow-400/50",
    paleColorClass: "bg-yellow-400/20",
    colorGradientClass: "from-yellow-400/50",
    paleColorGradientClass: "to-yellow-400/20",
    min: 1,
    max: 1,
    route: (shells) => ({ name: 'visualization.single.components', params: { 'asset': btoa((shells || selectedShells.value)[0]?.globalAssetId) }})
  },
  {
    name: "Life Cycle Analysis",
    description: "Which phases add how much to the carbon footprint? How much is emitted during transport?",
    colorClass: "bg-yellow-400/50",
    paleColorClass: "bg-yellow-400/20",
    colorGradientClass: "from-yellow-400/50",
    paleColorGradientClass: "to-yellow-400/20",
    min: 1,
    max: 1,
    route: (shells) => ({ name: 'visualization.single.lifecycle', params: { 'asset': btoa((shells || selectedShells.value)[0]?.globalAssetId) }})
  },
  {
    name: "Simulation",
    description: "Simulate the swap of one or multiple sub-components.",
    colorClass: "bg-yellow-400/50",
    paleColorClass: "bg-yellow-400/20",
    colorGradientClass: "from-yellow-400/50",
    paleColorGradientClass: "to-yellow-400/20",
    min: 1,
    max: 1,
    route: (shells) => ({ name: 'visualization.single.simulation', params: { 'asset': btoa((shells || selectedShells.value)[0]?.globalAssetId) }})
  },
  {
    name: "Compare two assets",
    description: "Compare the environmental impact of two assets against each other",
    colorClass: "bg-yellow-400/50",
    paleColorClass: "bg-yellow-400/20",
    colorGradientClass: "from-yellow-400/50",
    paleColorGradientClass: "to-yellow-400/20",
    min: 2,
    max: 2,
    route: () => ({ name: 'visualization.dual', params: { 'first': btoa(selectedShells.value[0]?.globalAssetId), 'second': btoa(selectedShells.value[1]?.globalAssetId) } })
  },
  {
    name: "Assess multiple assets",
    description: "Assess the environmental optimization possibilities between multiple assets",
    colorClass: "bg-yellow-400/50",
    paleColorClass: "bg-yellow-400/20",
    colorGradientClass: "from-yellow-400/50",
    paleColorGradientClass: "to-yellow-400/20",
    min: 3,
    route: () => ({ name: 'visualization.multi', params: { 'assets': selectedShells.value.map(s => btoa(s.globalAssetId)) } })
  },
  {
    name: "Data Sheet",
    description: "View the information about one or multiple assets side by side in a table",
    min: 1,
    colorClass: "bg-yellow-400/50",
    paleColorClass: "bg-yellow-400/20",
    colorGradientClass: "from-yellow-400/50",
    paleColorGradientClass: "to-yellow-400/20",
    route: (shells) => ({ name: 'datasheet', params: { 'assets': (shells || selectedShells.value).map(s => btoa(s.globalAssetId)) } })
  }
]

function isAvailable(o: AnalysisOption) {
  const shellNum = selectedShells.value.length;
  return (o.min === undefined || o.min <= shellNum) && (o.max === undefined || o.max >= shellNum);
}

const availableOptions = computed(() => {
  return analysisOptions.filter(isAvailable);
})

const singleAssetOptions = analysisOptions.filter((o) => (!o.min || o.min <= 1))

const selectedOptionIndex = storageRef<number>("selectedOptionIndex", 0);
const selectedOption = computed<AnalysisOption>(() => analysisOptions[selectedOptionIndex.value]);
watch(() => selectedShells.value?.length || 0, (length) => {
  const { min, max } = selectedOption.value;
  if (min && min > length || max && max < length) {
    selectedOptionIndex.value = analysisOptions.map((o, i) => isAvailable(o) ? i : undefined).find((i) => i !== undefined) || 0
  }
}, { immediate: true })

const doc = document;

const preload = computed(() => {
  let queryPreload = router.currentRoute.value.query.preload;
  if (!queryPreload) {
    queryPreload = [];
  }
  if (!Array.isArray(queryPreload)) {
    queryPreload = [queryPreload];
  }
  return queryPreload as string[];
})

function removeExternalUrlRoute(url: string) {
  url = btoa(url);
  return updateQuery('preload', preload.value.filter(u => u !== url));
}

const shells = computed(() => (showExternal.value ? Object.values(externalAssets.value) : descriptions?.value!));
</script>

<template>
  <button class="fixed bottom-20 left-4 btn btn-error btn-xs w-12 btn-outline group hover:w-auto z-50" v-if="hiddenErrors.length > 0" @click="hiddenErrors = [];">
    Errors
    <span class="hidden group-hover:inline"> &ndash; You hid errors in the past. Click to show errors again when reappearing</span>
  </button>
  <router-link :to="{ name: 'about' }" class="btn btn-outline btn-xs w-12 fixed left-4 bottom-12 italic font-serif font-normal btn-secondary">
    info
  </router-link>
  <div class="grid grid-cols-4 2xl:grid-cols-6 ml-16">
    <div class="col-span-3 2xl:col-span-5 px-4" v-if="descriptions">
      <BreadcrumbsBar class="mt-2" />
      <input type="text" placeholder="Search..." class="input input-bordered w-full mb-4" v-model="searchString" />
      <template v-if="searchString.trim().length > 0">
        <div class="grid grid-cols-4 gap-4 pb-4 2xl:grid-cols-6" v-if="searchResult.length > 0">
          <div class="shadow-xl rounded relative group has-[:checked]:outline outline-4 outline-yellow-400 bg-base-100" v-for="shell of searchResult" :key="shell.id">
            <label
              class="shadow-xl rounded-tl-sm rounded-br-lg absolute has-[:checked]:outline outline-0 outline-yellow-400 cursor-pointer transition-all duration-300 z-20"
            >
              <input type="checkbox" class="hidden peer" v-model="selectedShellsById[shell.globalAssetId]" />
              <span class="transition-all group-hover:opacity-80 rounded-lg p-1 peer-checked:opacity-100 opacity-0 top-0 left-0 absolute z-10 w-8 h-8 bg-yellow-400 peer-checked:pl-0 peer-checked:pt-0 peer-checked:rounded-tr-none peer-checked:rounded-bl-none peer-checked:rounded-tl-sm text-base-100 m-1 peer-checked:m-0">
                  <SolidStarIcon v-if="selectedShellsById[shell.globalAssetId]" />
                  <StarIcon v-else />
                </span>
            </label>
            <div class="hidden z-10 group-hover:block absolute inset-0 bg-base-100/50 rounded pt-4 overflow-scroll">
              <div class="grid grid-cols-3 gap-2 mb-4">
                <router-link class="rounded btn mx-4 col-span-3" type="button" v-for="option of singleAssetOptions" :key="option.name" :to="option.route([shell])">
                  {{ option.name }}
                </router-link>
              </div>
            </div>
            <ShellCard :shell="shell" />
          </div>
        </div>
        <div v-else class="grid-cols-6 text-center italic pb-4">No shells match the search.</div>
        <button class="btn btn-secondary mb-4" @click="searchString = ''"><ArrowLeftIcon class="w-4" /> Clear</button>
      </template>
      <template v-else>
        <div class="transition-all duration-300">
          <div role="tablist" class="tabs tabs-lifted" v-if="clients.hasAssetAdditionals">
            <router-link role="tab" class="tab" :class="{'tab-active [--tab-bg:oklch(var(--b2)/.3)]': !showExternal}" :to="updateQuery('assets', null)">Pre-loaded assets</router-link>
            <router-link role="tab" class="tab" :class="{'tab-active [--tab-bg:oklch(var(--b2)/.3)]': showExternal}" :to="updateQuery('assets', 'external')">External assets</router-link>
          </div>
        </div>
        <div class="form-control bg-base-200/30 px-2 border border-t-0 border-base-300" v-if="showExternal">
          <div class="alert alert-warning mt-2">
            <strong>This is a proof-of-concept!</strong> Do not load shells with classified information that may not become public. This demo was not developed with information security as a priority.
          </div>
          <div class="label">
            <span class="label-text">Add a link to any <code>.aasx</code>, <code>.aas.json</code>, or <code>.aas.xml</code> and select its assets afterwards</span>
          </div>
          <label class="input input-bordered flex items-center gap-2">
            <GlobeEuropeAfricaIcon class="w-6 h-6 opacity-70" />
            <input type="url" class="grow peer" placeholder="https://..." v-model="externalUrl">
            <router-link
              class="btn btn-sm btn-primary p-2"
              :disabled="externalUrl.length ? undefined : 'disabled'"
              :to="updateQuery('preload', [...preload, base64(externalUrl)])"
              @click="externalUrl = ''"
            >
              Load external assets
            </router-link>
          </label>
          <ul class="my-1">
            <li
              v-for="(asset, url) of externalShells"
              :key="url"
              class="flex gap-2 my-1 p-4 bg-base-200 transition-all duration-300"
              :class="{
                'text-error': typeof asset === 'string',
                'text-success': asset && typeof asset === 'object'
              }"
            >
              <div class="relative w-7 h-7">
                <span class="loading loading-spinner loading-md"></span>
                <ExclamationCircleIcon v-show="typeof asset === 'string'" class="w-full h-full -top-0.5 -left-0.5 absolute inset-0 z-10 bg-base-100 rounded-full animate-[ping-reverse_.3s_ease-in-out_forwards]" />
                <CheckCircleIcon v-show="asset !== null && typeof asset === 'object'" class="w-full h-full -top-0.5 -left-0.5 absolute inset-0 z-10 bg-base-100 rounded-full animate-[ping-reverse_.3s_ease-in-out_forwards]" />
              </div>
              <span class="flex-grow">
                {{ url }}: <strong>{{ asset === null ? 'Loading...' : typeof asset === 'string' ? asset : 'Loaded. Select assets below' }}</strong>
              </span>
              <router-link class="btn btn-outline btn-sm" :to="removeExternalUrlRoute(url as string)">
                {{ asset && typeof asset === 'object' ? 'Remove' : 'Hide' }}
              </router-link>
            </li>
          </ul>
        </div>
        <div class="grid grid-cols-4 gap-4 p-4 pr-4 2xl:grid-cols-6 bg-base-200/30 border border-t-0 border-base-300" v-if="shells.length">
          <Transition
            v-for="shell in shells"
            :key="shell.globalAssetId"
          >
            <div class="shadow-xl rounded relative group has-[:checked]:outline outline-4 outline-yellow-400 bg-base-100">
              <label
                class="shadow-xl rounded-tl-sm rounded-br-lg absolute has-[:checked]:outline outline-0 outline-yellow-400 cursor-pointer transition-all duration-300 z-20"
              >
                <input type="checkbox" class="hidden peer" v-model="selectedShellsById[shell.globalAssetId]" />
                <span class="transition-all group-hover:opacity-80 rounded-lg p-1 peer-checked:opacity-100 opacity-0 top-0 left-0 absolute z-10 w-8 h-8 bg-yellow-400 peer-checked:pl-0 peer-checked:pt-0 peer-checked:rounded-tr-none peer-checked:rounded-bl-none peer-checked:rounded-tl-sm text-base-100 m-1 peer-checked:m-0">
                  <SolidStarIcon v-if="selectedShellsById[shell.globalAssetId]" />
                  <StarIcon v-else />
                </span>
              </label>
              <div class="hidden z-10 group-hover:block absolute inset-0 bg-base-100/50 rounded pt-4 overflow-scroll">
                <div class="grid grid-cols-3 gap-2 mb-4">
                  <router-link class="rounded btn mx-4 col-span-3" type="button" v-for="option of singleAssetOptions" :key="option.name" :to="option.route([shell])">
                    {{ option.name }}
                  </router-link>
                </div>
              </div>
              <ShellCard :shell="shell" />
            </div>
          </Transition>
        </div>
      </template>
    </div>
    <div class="flex flex-col shadow-lg h-screen sticky top-0">
      <!-- Cart -->
      <div class="text-center transition-all duration-300" :class="selectedOption?.colorClass">
        <div class="w-[84px] h-[84px] relative inline-block" v-if="selectedShells.length < 2">
          <CubeIcon class="h-12 absolute ml-[18px] mt-[20.5px]" />
        </div>
        <div class="w-[84px] h-[84px] relative inline-block" v-else-if="selectedShells.length === 2">
          <CubeIcon class="h-12 absolute ml-[9px] mt-[15px]" />
          <CubeIcon class="h-12 absolute ml-[27px] mt-[25.5px]" />
        </div>
        <div class="w-[84px] h-[84px] relative inline-block" v-else>
          <CubeIcon class="h-12 absolute mt-[10px]" />
          <CubeIcon class="h-12 absolute ml-[18px] mt-[20.5px]" />
          <CubeIcon class="h-12 absolute ml-[36px] mt-[31px]" />
        </div>
      </div>
      <div class="bg-gradient-to-b from-0% to-100% transition-all duration-300" :class="`${selectedOption?.colorGradientClass} ${selectedOption?.paleColorGradientClass}`">
        <h2 class="text-lg mx-4 text-center"><StarIcon class="inline-block w-8 text-yellow-500 -mt-2" /> Favorites</h2>
      </div>
      <div class="flex-grow flex flex-col transition-all duration-300 min-h-0" :class="selectedOption.paleColorClass">
        <div class="rounded-t-lg mx-4 mt-4 bg-base-100 flex-grow flex flex-col align-middle shadow-inner overflow-y-scroll">
          <em class="mt-4 text-center" v-if="!selectedShells.length">No assets selected</em>
          <div class="relative group mt-4 mx-4" v-else v-for="(shell, i) of selectedShells" :key="shell.globalAssetId">
            <div class="shadow-xl rounded relative group has-[:checked]:outline outline-4 outline-yellow-400 bg-base-100">
              <label
                class="shadow-xl rounded-tl-sm rounded-br-lg absolute has-[:checked]:outline outline-0 outline-yellow-400 cursor-pointer transition-all duration-300 z-20"
              >
                <input type="checkbox" class="hidden peer" v-model="selectedShellsById[shell.globalAssetId]" />
                <span class="transition-all group-hover:opacity-80 rounded-lg p-1 peer-checked:opacity-100 opacity-0 top-0 left-0 absolute z-10 w-8 h-8 bg-yellow-400 peer-checked:pl-0 peer-checked:pt-0 peer-checked:rounded-tr-none peer-checked:rounded-bl-none peer-checked:rounded-tl-sm text-base-100 m-1 peer-checked:m-0">
                  <SolidStarIcon v-if="selectedShellsById[shell.globalAssetId]" />
                  <StarIcon v-else />
                </span>
              </label>
              <div class="hidden z-10 group-hover:block absolute inset-0 bg-base-100/50 rounded pt-4 overflow-scroll">
                <div class="grid grid-cols-3 gap-2 mb-4">
                  <router-link class="rounded btn mx-4 col-span-3" type="button" v-for="option of singleAssetOptions" :key="option.name" :to="option.route([shell])">
                    {{ option.name }}
                  </router-link>
                </div>
              </div>
              <ShellCard :shell="shell" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
