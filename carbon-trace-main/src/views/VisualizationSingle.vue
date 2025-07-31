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
import { computed, inject, ref, type Ref } from 'vue'
import { diffToString, generateColor, loadFullAssetInfo, simulationFromRoute } from '@/lib/util'
import { computedAsync } from '@vueuse/core'
import { BackOnErrorHandler } from '@/lib/BackOnErrorHandler'
import { assetIdMapKey } from '@/lib/injectionKeys'
import { AssetIdMap } from '@/lib/AssetIdMap'
import BreadcrumbsBar from '@/components/BreadcrumbsBar.vue'
import {
  ChartBarSquareIcon,
  ChevronDoubleRightIcon,
  ChevronDoubleLeftIcon,
  CloudIcon,
  CubeIcon,
  CubeTransparentIcon,
  CursorArrowRaysIcon,
  PuzzlePieceIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'
import InfoBox from '@/components/InfoBox.vue'
import SingleFallbackLinkCard from '@/components/SingleFallbackLinkCard.vue'
import { storageRef } from '@/lib/storage'
import { Connection } from '@/lib/model/CarbonTree'
// PresentationChartBarIcon CircleStackIcon CogIcon
const route = useRoute();
const idMap = inject<Ref<AssetIdMap>>(assetIdMapKey);

const info = computedAsync<Awaited<ReturnType<typeof loadFullAssetInfo> | undefined>>(async () => {
  if (!idMap?.value) {
    return undefined;
  }
  return BackOnErrorHandler.bind(loadFullAssetInfo(route.params.asset as string, idMap.value, "url-", () => {}, simulationFromRoute(route)), (e) => {
    if (e.status === 422) {
      return ["The URL to the asset is invalid or does not point to a valid asset", "Check the link"]
    }
    return ["An error occurred while loading the asset", "Try another asset"];
  });
}, undefined)

const expandTabs = storageRef('expandPageTabs', true);
const showSimulation = computed(() => info.value?.carbonTree?.hasChanges && route.name !== "visualization.single.simulation")
</script>

<template>
  <div class="ml-20 bg-base-100 shadow-lg shadow-base-100 pt-1.5 z-50 relative">
    <BreadcrumbsBar />
  </div>
  <div class="flex w-full">
    <div class="page-tabs bottom-10 pt-20 pb-14 -mt-12" :class="{'min-w-72': expandTabs }">
      <button class="absolute right-2 top-14" @click="expandTabs = !expandTabs"><ChevronDoubleRightIcon class="w-4" v-if="!expandTabs" /><ChevronDoubleLeftIcon class="w-4" v-else /></button>
      <div class="page-tabs-container" v-if="info">
        <router-link
          class="page-tab h-1/4"
          :class="{'active': route.name === 'visualization.single'}"
          :to="{ name: 'visualization.single', params: { assetId: info.asset.id } }"
        >
          <div class="page-tab-container">
            <ChartBarSquareIcon class="h-10 mx-auto mb-2 min-h-6 text-base-content" />
            <div class="text-base-content">
              <strong>Overview</strong>
              <div :class="{'hidden': !expandTabs}">
                Not familiar with the asset and its components? Get an overview.
              </div>
            </div>
          </div>
        </router-link>
        <router-link
          :to="{ name: 'visualization.single.components', params: { assetId: info.asset.id } }"
          class="page-tab h-1/4"
          :class="{'active': route.name === 'visualization.single.components'}"
        >
          <div class="page-tab-container">
            <PuzzlePieceIcon class="h-10 mx-auto mb-2 min-h-6 text-base-content" />
            <div class="text-base-content">
              <strong>Components</strong>
              <div :class="{'hidden': !expandTabs}">
                Is one responsible for most of the products footprint?
              </div>
            </div>
          </div>
        </router-link>
        <router-link
          :to="{ name: 'visualization.single.lifecycle', params: { assetId: info.asset.id } }"
          class="page-tab h-1/4"
          :class="{'active': route.name === 'visualization.single.lifecycle'}"
        >
          <div class="page-tab-container">
            <CloudIcon class="h-10 mx-auto mb-2 min-h-6 text-base-content" />
            <div class="text-base-content">
              <strong>Life Cycles</strong>
              <div :class="{'hidden': !expandTabs}">
                Which phases add how much to the carbon footprint? How much is emitted during transport?
              </div>
            </div>
          </div>
        </router-link>
        <router-link
          :to="{ name: 'visualization.single.simulation', params: { assetId: info.asset.id } }"
          class="page-tab h-1/4"
          :class="{'active': route.name === 'visualization.single.simulation'}"
        >
          <div class="page-tab-container">
            <ArrowPathIcon class="h-10 mx-auto mb-2 min-h-6 text-base-content" />
            <div class="text-base-content">
              <strong>Simulation</strong>
              <div :class="{'hidden': !expandTabs}">
                Simulate the swap of one or multiple sub-components.
              </div>
            </div>
          </div>
        </router-link>
      </div>
    </div>
    <div class="flex-grow min-w-0">
      <Transition>
        <div class="m-4 gap-4 grid grid-cols-6 duration-200 absolute" v-if="!info">
          <div class="col-span-6 gap-2 flex">
            <div class="skeleton size-8 rounded inline-block p-1"></div>
            <div>
              <div class="skeleton col col-span-2 h-6 w-52 mt-1"></div>
              <div class="skeleton col-span-2 h-5 mt-2 w-44"></div>
              <div class="mt-3 skeleton h-5 w-72"></div>
              <div class="mt-1 skeleton h-5 w-64"></div>
              <div class="mt-1 skeleton h-5 w-72"></div>
            </div>
          </div>
          <div class="skeleton col-span-6 bg-gray-100 h-96"></div>
        </div>
      </Transition>
      <Transition>
        <div class="m-4 gap-4 grid grid-cols-6 duration-200" v-if="info">
          <div class="col-span-4 gap-2 flex">
            <CubeTransparentIcon v-if="info.description?.assetKind === 'Type'" class="size-8 rounded inline-block p-1 text-gray-800" :style="`background: ${generateColor(info.asset.id)}`" />
            <CubeIcon v-else class="size-8 rounded inline-block p-1 text-gray-800" :style="`background: ${generateColor(info.asset.id)}`" />
            <div>
              <h1 class="col col-span-2 text-2xl">
                {{ info.description?.name }}
                <span v-if="info.carbonFootprint" class="badge badge-success text-success-content">carbon footprint provided</span>
                <span v-else-if="info.carbonTree" class="badge badge-warning text-warning-content">carbon footprint calculated from sub-components</span>
                <span v-else class="badge badge-error text-error-content">no carbon footprint data</span>
              </h1>
              <h2 v-if="info.description?.idShort" class="col-span-2 font-mono text-sm">{{ info.description.idShort }}</h2>
              <p class="pt-3 ital" v-if="info.description?.description">{{ info.description.description }}</p>
            </div>
          </div>
          <template v-if="info.carbonTree">
            <InfoBox
              class="col-span-1 text-center bg-base-200 rounded-lg p-4"
              explanation="Only components directly attached to this asset"
              direction="left"
            >
              <span class="text-3xl leading-4">
                {{ info.carbonTree.directComponentsCount }}
                <span class="text-xs" v-if="info.carbonTree.directComponentsCountDiff !== 0">
                  {{ diffToString(info.carbonTree.directComponentsCountDiff) }}
                </span>
              </span><br />
              direct sub-components
            </InfoBox>
            <InfoBox
              class="col-span-1 text-center bg-base-200 rounded-lg p-4"
              explanation="All components this asset and all its components are made of"
              direction="left"
            >
              <span class="text-3xl leading-4">{{ info.carbonTree.allComponentsCount }}
                <span class="text-xs" v-if="info.carbonTree.allComponentsCountDiff !== 0">
                  {{ diffToString(info.carbonTree.allComponentsCountDiff) }}
                </span>
              </span><br />
              overall sub-components
            </InfoBox>
          </template>
          <InfoBox
            class="col-span-2 text-center bg-base-200 rounded-lg flex align-middle"
            explanation="There are no components attached to this component"
            direction="left"
            v-else
          >
            <div>
              <span class="text-3xl">standalone</span><br />
              without sub-components
            </div>
          </InfoBox>
        </div>
      </Transition>
      <Transition>
        <div class="sticky top-4 duration-200 px-4 z-50" v-if="showSimulation">
          <div class="alert alert-warning shadow">
            <strong>Simulation</strong>
            <span>
              The values of this asset are being simulated. To view which changes were made, click
              <router-link class="btn btn-outline btn-sm" :to="{ name: 'visualization.single.simulation', params: { assetId: info.asset.id } }">here</router-link>.
            </span>
          </div>
        </div>
      </Transition>

      <router-view v-slot="{ Component }" v-if="info">
        <component :is="Component" :info="info" />
      </router-view>

      <div class="grid grid-cols-6 gap-4 m-4" v-if="info">
        <h2 class="col-span-6 text-3xl font-light text-center py-4">More
          <CursorArrowRaysIcon class="inline-block h-10" />
        </h2>
        <SingleFallbackLinkCard :to="{ name: 'visualization.single.components', params: { assetId: info.asset.id } }" class="text-accent border-accent">
          <PuzzlePieceIcon class="h-10 mx-auto mb-2" />
          <div class="text-base-content">
            <strong>Components</strong><br />
            Is one responsible for most of the products footprint?
          </div>
        </SingleFallbackLinkCard>
        <SingleFallbackLinkCard :to="{ name: 'visualization.single.lifecycle', params: { assetId: info.asset.id } }" class="text-secondary border-secondary">
          <CloudIcon class="h-10 mx-auto mb-2" />
          <div class="text-base-content">
            <strong>Life Cycles</strong><br />
            Which phases add how much to the carbon footprint? How much is emitted during transport?
          </div>
        </SingleFallbackLinkCard>
        <SingleFallbackLinkCard :to="{ name: 'visualization.single.simulation', params: { assetId: info.asset.id } }" to="home" class="text-primary border-primary">
          <ArrowPathIcon class="h-10 mx-auto mb-2" />
          <div class="text-base-content">
            <strong>Simulation</strong><br />
            Simulate the swap of one or multiple sub-components.
          </div>
        </SingleFallbackLinkCard>

        <div class="collapse col-span-6 bg-base-200/30">
          <input type="checkbox" />
          <div class="collapse-title">Debug Info</div>
          <div class="collapse-content grid grid-cols-2 gap-2">
            <div class="col-span-1 overflow-x-scroll">
              <h2 class="text-2xl">Asset JSON</h2>
              <pre>{{ info.asset }}</pre>
            </div>
            <div class="col-span-1 overflow-x-scroll">
              <h2 class="text-2xl">Submodel JSON</h2>
              <pre>{{ info.submodels?.json() }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

    <!--
    <div class="alert alert-info col-span-4" v-if="info.carbonTree === undefined && info.carbonFootprint !== undefined">
      This assets product and transport carbon footprint is directly provided.
    </div>
    <div class="alert alert-warning col-span-4" v-else-if="info.carbonTree?.assetProductCo2eq === undefined || info.carbonTree?.assetTransportCo2eq === undefined">
      <span>
        This assets
        <strong v-if="info.carbonTree?.assetProductCo2eq === undefined">product</strong>
        <template v-if="info.carbonTree?.assetProductCo2eq === undefined && info.carbonTree?.assetTransportCo2eq === undefined">&nbsp;and</template>&nbsp;
        <strong v-if="info.carbonTree?.assetTransportCo2eq === undefined">transport</strong>
        carbon footprint is only calculated by the sum of its components.
      </span>
    </div>
    <div class="alert alert-info col-span-4" v-else>
      This assets carbon footprint is directly provided and provided by its components.
    </div>
    -->

    <!--
    <div class="col-span-3">
      <div class="card shadow-xl bg-base-100">
        <div class="card-body">
          <h2 class="card-title">Carbon Footprint Divided into its Life Cycles</h2>
          <LifeCyclePlot :carbon-tree="info.carbonTree" :carbon-footprint="info.carbonFootprint" v-if="info.carbonTree || info.carbonFootprint" />
        </div>
      </div>
    </div>
    <div class="col-span-3" v-if="info.carbonTree">
      <div class="card shadow-xl bg-base-100">
        <div class="card-body">
          <h2 class="card-title">Component Footprints</h2>
          <ComponentFootprintPlot :carbon-tree="info.carbonTree" />
        </div>
      </div>
    </div>
    <div class="col-span-6" v-if="info.carbonTree">
      <div class="card shadow-xl bg-base-100">
        <div class="card-body">
          <h2 class="card-title">Component Distribution of the Carbon Footprint</h2>
          <CarbonSankeyDiagram :carbon-tree="info.carbonTree" />
        </div>
      </div>
    </div>

    <div class="collapse shadow-xl col-span-3 bg-base-100">
      <input type="checkbox" />
      <div class="collapse-title">Asset JSON</div>
      <pre class="collapse-content">{{ info.asset }}</pre>
    </div>
    <div class="collapse shadow-xl col-span-3 bg-base-100">
      <input type="checkbox" />
      <div class="collapse-title">Submodel JSON</div>
      <pre class="collapse-content overflow-x-scroll">{{ info.submodels?.json() }}</pre>
    </div>
    -->
</template>
