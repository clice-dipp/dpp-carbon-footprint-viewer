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
import {
  allowedGrams,
  bestMatchingGrams,
  grams,
  loadFullAssetInfo,
  numberToString,
  pluralize,
  pluralizeWord
} from '@/lib/util'
import { computed, inject, nextTick, type Ref, ref, watch } from 'vue'
import AddressMap from '@/components/AddressMap.vue'
import AssetThumbnail from '@/components/AssetThumbnail.vue'
import Co2InfoDiagram from '@/components/Co2InfoDiagram.vue'
import LifeCycleOverviewDiagram from '@/components/LifeCycleOverviewDiagram.vue'
import { InformationCircleIcon } from '@heroicons/vue/24/outline'
import { storageRef } from '@/lib/storage'
import OverflowingInfo from '@/components/OverflowingInfo.vue'
import {
  type LifeCyclePhase,
  LifeCyclePhases,
  type LifeCycleStage,
  lifeCycleStageDescription,
  lifeCycleStageSequence
} from '@/lib/lifeCycleUtil'
import type CarbonTree from '@/lib/model/CarbonTree'
import TransportCarbonFootprintDiagram from '@/components/TransportCarbonFootprintDiagram.vue'

const props = defineProps<{ info: Awaited<ReturnType<typeof loadFullAssetInfo>>}>()

const thumbnailHidden = ref(true);

const map = ref<typeof AddressMap>();
function recenterMap() { map.value?.recenter(); }
watch(thumbnailHidden, () => {
  nextTick(recenterMap);
});


const co2eq = computed(() => {
  return {
    total: props.info.carbonTree?.totalCo2eq || props.info.carbonFootprint?.totalCo2eq,
    product: props.info.carbonTree?.productCo2eq || props.info.carbonFootprint?.productCo2eq,
    transport: props.info.carbonTree?.transportCo2eq || props.info.carbonFootprint?.transportCo2eq
  };
});

const unit = computed<typeof allowedGrams[number]>(() => bestMatchingGrams(Math.max(co2eq.value?.product || 0, co2eq.value?.transport || 0), "kg"));
const showFootprintText = storageRef("showFootprintText", true);

const lifeCyclePhases = computed(() => {
  const { coveredLifeCyclePhases } = props.info.carbonFootprint || props.info.carbonTree?.asset.footprint || { coveredLifeCyclePhases: undefined };
  if (coveredLifeCyclePhases) {
    return coveredLifeCyclePhases;
  }
  const { carbonTree } = props.info
  if (!carbonTree) {
    return new LifeCyclePhases();
  }
  const phases: LifeCyclePhase[] = [];
  carbonTree.forEach((tree: CarbonTree) => {
    if (tree.asset.footprint) {
      phases.push(...tree.asset.footprint.coveredLifeCyclePhases.phases);
      return false;
    }
    return true;
  });
  return new LifeCyclePhases(phases);
});
</script>
<template>
  <div class="m-4 gap-4 grid grid-cols-6">
    <div class="card h-72 relative rounded-lg" v-if="props.info.address" :class="!thumbnailHidden ? 'col-span-4' : 'col-span-6'">
      <div class="absolute bottom-6 text-center left-0 right-0 z-10">
        <div class="inline-block m-auto bg-base-100/30 p-2 rounded backdrop-blur">{{ info.address }}</div>
      </div>
      <figure class="flex-grow">
        <AddressMap
          ref="map"
          class="rounded-lg overflow-hidden shadow-xl h-full"
          :street="info.address.street!"
          :city="info.address.city!"
          :state-county="info.address.stateCounty"
          :zipcode="info.address.zipcode!"
          :country-code="info.address.countryCode!" />
        <!--<div class="alert alert-success mx-4">Here would be a map which is currently deactivated.</div>-->
      </figure>
    </div>
    <AssetThumbnail
      @load="recenterMap"
      v-model="thumbnailHidden"
      :asset-id="info.asset.id"
      class="box-border h-72 overflow-hidden rounded-lg"
      :class="info.address ? 'col-span-2' : 'col-span-6'"
      alt="Asset Thumbnail" />
    <div class="alert alert-info col-span-6" v-if="!info.carbonFootprint && !info.carbonTree">
      Product or Transport Carbon Footprint data not available.
    </div>
    <OverflowingInfo v-model="showFootprintText" class="col-span-2 rounded-b-none border-b-0">
      The Carbon Footprint of the whole asset is
      <strong>{{ grams(co2eq?.total || 0, "kg", unit) }}</strong>,
      with the production of the asset itself (also transport of sub-components) accounting for
      <strong>{{ grams(co2eq?.product || 0, "kg", unit) }}</strong>
      and with <strong>{{ grams(co2eq?.transport || 0, "kg", unit) }}</strong> accounting for the transport of the
      asset itself.
    </OverflowingInfo>
    <OverflowingInfo v-model="showFootprintText" class="col-span-4 rounded-b-none border-b-0">
      The asset was transported
      <strong>{{ numberToString(info.carbonFootprint?.transport.length || 0) }}</strong>
      {{ pluralizeWord(info.carbonFootprint?.transport.length || 0, "time") }}
      which added up to a total of
      <strong>{{ grams(co2eq?.transport || 0, "kg", unit) }}</strong> (not accounting for the
      transport of sub-components). Below diagram shows the transport emissions divided by each trip the
      asset took<span v-if="info.carbonFootprint?.transport.some((c) => c.co2eq === 0)">
      except for the <strong>{{ pluralize(info.carbonFootprint?.transport.filter((c) => c.co2eq === 0).length, "trip") }}</strong>
      without emissions</span>.
    </OverflowingInfo>
    <div class="col-span-2 row-span-3 flex p-2 alert -mt-4 rounded-t-none border-t-0 bg-base-200/20" v-if="info.carbonTree || info.carbonFootprint">
      <Co2InfoDiagram :carbon-tree-or-footprint="info.carbonTree || info.carbonFootprint" direction="left" class="h-full flex-grow rounded-lg overflow-hidden" />
    </div>
    <div class="col-span-4 flex p-2 alert -mt-4 rounded-t-none border-t-0 bg-base-200/20">
      <TransportCarbonFootprintDiagram :aas-id="info.asset.id" class="h-full flex-grow rounded-lg overflow-hidden" direction="left" />
    </div>
    <OverflowingInfo v-model="showFootprintText" class="col-span-4 rounded-b-none border-b-0">
      <strong class="capitalize">{{ numberToString(lifeCyclePhases.stages.length) }}</strong> {{ pluralizeWord(lifeCyclePhases.stages.length, "life cycle stage") }} of this
      asset {{ pluralizeWord(lifeCyclePhases.stages.length, "is", "are") }} known ({{ lifeCyclePhases.stages.map(s => `'${s} - ${lifeCycleStageDescription[s]}'`).join(", ") }}).
      The diagram shows the <strong>{{ grams(co2eq?.product || 0, "kg", unit) }}</strong> emissions divided into each life cycle stage.
      The life cycle stages exclude the direct transport emissions of this asset but include the indirect
      transport emissions of sub-components.
    </OverflowingInfo>
    <div class="col-span-4 flex p-2 alert -mt-4 rounded-t-none border-t-0 bg-base-200/20">
      <LifeCycleOverviewDiagram :aas-id="info.asset.id" class="h-full flex-grow rounded-lg overflow-hidden" direction="left" />
    </div>
  </div>
</template>
