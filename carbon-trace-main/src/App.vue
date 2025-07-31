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
import { RouterView, useRouter } from 'vue-router'
import ErrorLog from '@/components/ErrorLog.vue'
import LogoSVG from '@/assets/logo.svg'
import { storageRef } from '@/lib/storage'
import { Component, computed, provide, ref, watch } from 'vue'
import { allDescriptionsFromApi } from '@/lib/api/registry'
import { ErrorClient } from '@/lib/ErrorDataHandler'
import { darkModeKey, shellDescriptionsKey, assetIdMapKey, externalShellsKey, helpBarKey } from '@/lib/injectionKeys'
import BackOnError from '@/components/BackOnError.vue'
import { computedAsync } from '@vueuse/core'
import { AssetIdMap } from '@/lib/AssetIdMap'
import shellRepo from '@/lib/api/shells'
import type { components } from '@/lib/api/AssetAdministrationShellRepository'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import GlobalContextMenuComponent from '@/components/GlobalContextMenuComponent.vue'
import HelpBar from '@/components/HelpBar.vue'


const router = useRouter();
const lightThemeName = "corporate";
const darkThemeName = "business";
const useDarkTheme = storageRef<boolean>("darkTheme", window.matchMedia ? window.matchMedia("prefers-color-scheme: dark").matches : false);
provide(darkModeKey, useDarkTheme);
watch(useDarkTheme, () => {
  document.documentElement.dataset.theme = useDarkTheme.value ? darkThemeName : lightThemeName;
}, { immediate: true });

const shellDescriptions = computedAsync(
  async () => allDescriptionsFromApi(),
  [],
  { onError(e: any) { ErrorClient.add(e.toString()) } })
provide(shellDescriptionsKey, shellDescriptions);

const assetIdMap = ref(new AssetIdMap());
watch(shellDescriptions, (descriptions) => {
  for (const description of descriptions) {
    assetIdMap.value.add({
      id: description.id,
      idShort: description.idShort,
      globalAssetId: description.globalAssetId,
    })
  }
})
provide(assetIdMapKey, assetIdMap);

const externalShells = ref<{ [url: string]: null | string | components["schemas"]["AssetAdministrationShell"][] }>({});  // null = loading, string = error message, otherwise the shell
provide(externalShellsKey, externalShells);

watch(() => router.currentRoute.value.query.preload, (encodedUrls) => {
  encodedUrls = encodedUrls || [];
  const urls = ((Array.isArray(encodedUrls) ? encodedUrls : [encodedUrls]) as string[]).map(atob);
  const removeUrls = new Set(Object.keys(externalShells.value));
  for (const url of urls) {
    if (url in externalShells.value) {
      removeUrls.delete(url);
      // eslint-disable-next-line no-continue
      continue;
    }
    externalShells.value[url] = null;
    shellRepo.externalShell(url).then((assets) => {
      if (assets && Array.isArray(assets)) {
        for (const asset of assets) {
          assetIdMap?.value.add({
            id: asset.id,
            idShort: asset.idShort,
            globalAssetId: asset.assetInformation.globalAssetId,
            specificAssetIds: asset.assetInformation.specificAssetIds?.map((i) => i.value)
          })
        }
        externalShells.value[url] = assets;
      }
    }).catch((e) => {
      if (e.status === 422) {
        externalShells.value[url] = "The link does not point to a valid Asset Administration Shell";
      } else if (e.status === 404) {
        externalShells.value[url] = "The link does not points to a page which could not be found (404)";
      } else {
        console.error(e);
        externalShells.value[url] = "The asset could not be loaded"
      }
    })
  }
  for (const removeUrl of removeUrls) {
    delete externalShells.value[removeUrl];
  }
}, {
  immediate: true
})

const backRoute = computed(() => {
  let { back } = router.currentRoute.value.meta;
  if (typeof back !== "string" && typeof back !== "function" && typeof back !== "object" || back === null) {
    return undefined;
  }
  if (typeof back === "function") {
    back = back(router.currentRoute.value);
  }
  if (typeof back === "string") {
    return { name: back };
  }
  return back;
})

const helpBarContent = ref<Component>();
provide(helpBarKey, helpBarContent);
// $router.currentRoute.value.matched[0].props.default.test
</script>

<template>
  <div class="w-10 h-10 my-2 mx-4 fixed z-50">
      <router-link
        v-if="backRoute"
        type="button"
        class="block w-10 h-10 p-2 bg-base-100 box-border rounded border border-1 drop-shadow active:drop-shadow-none"
        :to="backRoute"
      >
        <ArrowLeftIcon />
      </router-link>
      <img :src="LogoSVG" alt="logo" class="my-2" v-else />
  </div>
  <div class="fixed bottom-0 py-2 px-4 z-50">
    <input type="checkbox" class="toggle" v-model="useDarkTheme" />
  </div>

  <HelpBar />
  <GlobalContextMenuComponent />
  <BackOnError />
  <div class="flex-grow">
    <RouterView :key="JSON.stringify([$route.name, $route.params])" />
  </div>
  <ErrorLog />
  <!--
  <div class="drawer drawer-open">
    <input id="main-drawer" type="checkbox" class="drawer-toggle" />
    <div class="drawer-content -ml-2 relative z-10">
      <GlobalContextMenuComponent />
      <BackOnError />
      <div class="flex-grow">
        <RouterView :key="JSON.stringify([$route.name, $route.params])" />
      </div>
      <ErrorLog class="mx-4 mb-6 flex-shrink" />
    </div>
    <div class="drawer-side">
      <div class="flex flex-col items-center h-full">
        <div class="w-10 h-10 relative my-4">
          <router-link
            v-if="backRoute"
            type="button"
            class="block w-10 h-10 p-2 bg-base-100 box-border rounded border border-1 drop-shadow active:drop-shadow-none"
            :to="backRoute"
          >
            <ArrowLeftIcon />
          </router-link>
          <img :src="LogoSVG" alt="logo" v-else />
        </div>
        <div class="flex-grow w-20">
          <!--
          <ul class="menu text-base-content w-20 items-center">
            <li><a><InformationCircleIcon class="w-7" /></a></li>
            <li><a><ChartPieIcon class="w-7" /></a></li>
          </ul>
          --x>
        </div>
        <div class="mb-2 flex-shrink">
          <input type="checkbox" class="toggle" v-model="useDarkTheme" />
        </div>
      </div>
    </div>
  </div>
  -->

  <!--
      <template v-if="typeof $router.currentRoute.value.meta.back === 'string'">
        <div class="fixed top-0 p-4 z-10 h-12 overflow-y-visible">
          <router-link
            type="button"
            class="inline-block w-10 h-10 p-2 bg-base-100 rounded border border-1 drop-shadow active:drop-shadow-none"
            :to="{ name: $router.currentRoute.value.meta.back }"
          >
            <ArrowLeftIcon />
          </router-link>
        </div>
      </template>
      <div class="flex flex-col">
        <ErrorBack />
        <div class="flex-grow">
          <RouterView :key="JSON.stringify([$route.name, $route.params])" />
        </div>
        <ErrorLog class="mx-4 mb-6 flex-shrink" />
      </div>
  -->
</template>
