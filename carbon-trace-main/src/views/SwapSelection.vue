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
import { computed, inject, provide, type Ref, ref } from 'vue'
import { CubeIcon, CubeTransparentIcon, ArrowsPointingOutIcon } from '@heroicons/vue/24/outline'
import { generateColor, loadFullAssetInfo, simulationFromRoute } from '@/lib/util'
import { computedAsync } from '@vueuse/core'
import AssetThumbnail from '@/components/AssetThumbnail.vue'
import { BackOnErrorHandler } from '@/lib/BackOnErrorHandler'
import { assetIdMapKey, draggedShellKey, shellDescriptionsKey } from '@/lib/injectionKeys'
import { AssetIdMap } from '@/lib/AssetIdMap'
import CarbonSankeyDiagram from '@/components/CarbonSankeyDiagram.vue'
import BreadcrumbsBar from '@/components/BreadcrumbsBar.vue'
import RuleLine from '@/components/RuleLine.vue'
import Co2InfoBox from '@/components/Co2InfoBox.vue'
import ShellCard from '@/components/ShellCard.vue'
import type { ShellDescriptionSmallInterface } from '@/lib/api/shellTypes'
import AssetTree from '@/components/AssetTree.vue'

const route = useRoute();
const idMap = inject<Ref<AssetIdMap>>(assetIdMapKey);
const draggedShell = ref<ShellDescriptionSmallInterface | undefined>();

provide<Ref<ShellDescriptionSmallInterface | undefined>>(draggedShellKey, draggedShell)

const info = computedAsync(async () => {
  if (!idMap?.value) {
    return undefined;
  }
  const data = await BackOnErrorHandler.bind(loadFullAssetInfo(route.params.asset as string, idMap.value, "url-", () => {}, simulationFromRoute(route)), (e) => {
    if (e.status === 422) {
      return ["The URL to the asset is invalid or does not point to a valid asset", "Check the link"]
    }
    return ["An error occurred while loading the asset", "Try another asset"];
  });
  return data;
}, undefined)
const selectedShells = ref<ShellDescriptionSmallInterface[]>([])

const searchValue = ref("");

const descriptions = inject<Ref<ShellDescriptionSmallInterface[]>>(shellDescriptionsKey)
const descriptionsById = computed(() => Object.fromEntries((descriptions?.value || []).map(d => [d.globalAssetId, d])))
const hiddenShells = computed<boolean[] | undefined>(() => {
  if (!searchValue.value) { return undefined; }
  const s = searchValue.value.toLowerCase();
  return descriptions?.value.map(
    (d) =>
      d.id.toLowerCase().indexOf(s) === -1 &&
      d.name.toLowerCase().indexOf(s) === -1 &&
      d.globalAssetId.toLowerCase().indexOf(s) === -1 &&
      d.idShort?.toLowerCase().indexOf(s) === -1 &&
      d.description?.toLowerCase().indexOf(s) === -1
  )
})

function startSwap(e: DragEvent, shell: ShellDescriptionSmallInterface) {
  draggedShell.value = shell;
}
function cancelSwap() {
  draggedShell.value = undefined;
}


</script>

<template>
  <div class="grid grid-cols-4 2xl:grid-cols-6">
    <div class="col-span-3 2xl:col-span-5">
      <BreadcrumbsBar class="mt-1.5 ml-20" />
      <div class="m-4" v-if="info !== undefined">
        <div class="flex">
          <div class="flex flex-col flex-grow">
            <div class="flex flex-row gap-2">
              <CubeTransparentIcon v-if="info.description.assetKind === 'Type'" class="size-8 rounded inline-block p-1 text-gray-800" :style="`background: ${generateColor(info.asset.id)}`" />
              <CubeIcon v-else class="size-8 rounded inline-block p-1 text-gray-800" :style="`background: ${generateColor(info.asset.id)}`" />
              <div class="flex-grow">
                <h1 class="col col-span-2 text-2xl">
                  {{ info.description.name }}
                </h1>
                <h2 v-if="info.description.idShort" class="col-span-2 font-mono text-sm">{{ info.description.idShort }}</h2>
                <p class="pt-3 ital" v-if="info.description.description">{{ info.description.description }}</p>
                <Co2InfoBox :asset="info.asset.id" class="mt-4 min-w-80" />
              </div>
            </div>
            <div class="flex-grow relative pt-8 ml-40" v-if="info?.carbonTree">
              <RuleLine class="h-full w-4 bg-gradient-to-t to-transparent bg-transparent ml-2" v-once />
            </div>
          </div>
          <AssetThumbnail
            :asset-id="info.asset.assetInformation.globalAssetId!"
            class="rounded shadow-xl p-2 box-border h-72"
          />
        </div>
        <div v-if="info?.carbonTree">
          <AssetTree :asset="info.carbonTree" :hide-expand="true" :scroll-y="true" />
        </div>
        <div class="alert alert-error" v-else>
          This asset does provide a hierarchy. Its Carbon Footprint was provided by the file directly. Thus, it is not possible to filter single components.
        </div>
      </div>
    </div>
    <div class="flex flex-col shadow-lg h-screen sticky top-0">
      <!-- Cart -->
      <div class="transition-all duration-300">
        <div class="bg-gradient-to-b from-0% to-100% bg-primary/40 transition-all duration-300 p-4">
          Swap components by dragging components from below and dropping them over the assets components
        </div>
        <div class="bg-gradient-to-b from-0% to-100% from-primary/40 to-primary/10 p-4">
          <input type="text" class="input bg-base-100/40 w-full" placeholder="Search.." v-model="searchValue">
        </div>
      </div>
      <div class="flex-grow flex flex-col transition-all duration-300 min-h-0 bg-primary/10">
        <div class="rounded-t-lg mx-4 mt-4 bg-base-100 flex-grow flex flex-col align-middle shadow-inner overflow-y-scroll">
          <em class="mt-4 text-center" v-if="!descriptions?.length">No assets selected</em>
          <div
            class="relative group mt-4 mx-4"
            v-else
            v-for="(shell, i) of descriptions"
            :key="shell.globalAssetId"
            draggable="true"
            @dragstart="(e) => startSwap(e, shell)" v-show="!hiddenShells?.[i]"
            @dragend="cancelSwap"
          >
            <ShellCard :shell="shell" class="shadow-xl" compact show-co2 />
            <div class="hidden group-hover:flex absolute inset-0 hover:bg-base-100/50 rounded p-4 items-center justify-center cursor-move">
              <div class="m-4 text-center bg-base-100/70 rounded p-4">
                Drag and drop this component over one on the left to swap them.
                <ArrowsPointingOutIcon class="h-12 mx-auto mt-2" />
              </div>
            </div>
          </div>
          <div class="bottom-0 sticky px-2 bg-gradient-to-b from-0% to-100% from-base-100/0 to-base-100/80 join flex pb-2 pt-4">
            <router-link
              class="btn btn-primary join-item flex-grow"
              :disabled="false ? undefined : 'disabled'"
              :to="{ name: 'home' }"
            >Analyse</router-link>
            <!--
            <div class="dropdown dropdown-end dropdown-top" v-if="availableOptions.length > 1">
              <div class="btn btn-primary join-item" role="button" tabindex="0"><ChevronUpIcon class="w-5 h-5" /></div>
              <ul class="menu dropdown-content bg-base-100 rounded-box z-[1] w-52 p-2 shadow" tabindex="0">
                <li v-for="option of availableOptions" :key="option.name">
                  <router-link :to="option.route()"><span><strong>{{ option.name }}</strong><br /><span class="text-xs">{{ option.description }}</span></span></router-link></li>
              </ul>
            </div>
            -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
