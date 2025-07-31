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
import { useRoute, useRouter } from 'vue-router'
import shellRepo from '@/lib/api/shells'
import { nextTick, ref, watch } from 'vue'
import { CubeIcon, CubeTransparentIcon } from '@heroicons/vue/24/outline'
import { generateColor, pretend } from '@/lib/util'
import AssetSelection from '@/components/AssetSelection.vue'
import type { components } from '@/lib/api/AssetAdministrationShellRepository'
import { BackOnErrorHandler } from '@/lib/BackOnErrorHandler'
import BreadcrumbsBar from '@/components/BreadcrumbsBar.vue'

const route = useRoute();
const router = useRouter();
type Asset = components["schemas"]["AssetAdministrationShell"]
const assets = ref<(Asset | Asset[])[]>([]);
watch(() => route.params.assets as string[], async (newAssets) => {
  assets.value = structuredClone(await BackOnErrorHandler.bind(shellRepo.multiSourceShells(newAssets, "url-"), (e) => {
    return e.status === 422 ? ["The URL to at least one asset is invalid or does not point to a valid asset", "Check the link"] : ["An error occurred while loading the asset", "Try another asset"];
  }));
}, { immediate: true });

function changeUrl(asset: Asset, _: any, __: any, index: number) {
  const assets = [...route.params.assets as string[]];
  assets[index] = btoa(asset.id);
  pretend(router, { params: { assets }});
}
</script>

<template>
  <BreadcrumbsBar class="mt-1.5 ml-20" />
  <div class="grid gap-4 m-4 grid-cols-2 ml-20">
    <AssetSelection v-model="assets" class="gap-4 grid grid-cols-1 p-4 border border-1 rounded-lg" @change="changeUrl">
      <template v-slot="{ asset, description }">
        <CubeTransparentIcon v-if="description.assetKind === 'Type'" class="size-8 rounded inline-block p-1 text-gray-800" :style="`background: ${generateColor(asset.id)}`" />
        <CubeIcon v-else class="size-8 rounded inline-block p-1 text-gray-800" :style="`background: ${generateColor(asset.id)}`" />
        <div>
          <h1 class="col col-span-2 text-2xl">
            {{ description.name }}
          </h1>
          <h2 v-if="description.idShort" class="col-span-2 font-mono text-sm">{{ description.idShort
            }}</h2>
          <p class="pt-3 ital" v-if="description.description">{{ description.description }}</p>
        </div>
      </template>
    </AssetSelection>
  </div>
</template>
