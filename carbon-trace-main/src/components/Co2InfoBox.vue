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
import { computedAsync } from '@vueuse/core'
import { diffToString, grams, loadFullAssetInfo, simulationFromRoute } from '@/lib/util'
import { ErrorClient } from '@/lib/ErrorDataHandler'
import { computed, inject, type Ref } from 'vue'
import { AssetIdMap } from '@/lib/AssetIdMap'
import { assetIdMapKey } from '@/lib/injectionKeys'
import { XMarkIcon } from '@heroicons/vue/24/outline'
import CarbonTree from '@/lib/model/CarbonTree'
import { useRoute } from 'vue-router'

const props = withDefaults(defineProps<{
  asset: string | CarbonTree,
  compact?: boolean,
  showDiff?: boolean,
}>(), { showDiff: false });
const idMap = inject<Ref<AssetIdMap>>(assetIdMapKey);
const route = useRoute();
const tree = computedAsync(async () => {
  if (props.asset instanceof CarbonTree) {
    return props.asset;
  }
  const { carbonTree, carbonFootprint } = (await loadFullAssetInfo(btoa(props.asset), idMap?.value, "url-", () => {}, simulationFromRoute(route)));
  return {
    totalCo2eq: carbonTree?.totalCo2eq || carbonFootprint?.totalCo2eq,
    productCo2eq: carbonTree?.productCo2eq || carbonFootprint?.productCo2eq,
    transportCo2eq: carbonTree?.transportCo2eq || carbonFootprint?.transportCo2eq
  };
}, undefined, { onError(e: any) { ErrorClient.add(e.toString()) } })
const hasUndefined = computed(() =>
  tree.value?.totalCo2eq === undefined ||
  tree.value?.productCo2eq === undefined ||
  tree.value?.transportCo2eq === undefined
)
const tooltipText = computed(() => {
  const info = hasUndefined.value ? " (×: Data not available)": "";
  return `CO₂ equivalent${info}`
})

function diffString(num: number) {
  return diffToString(num, grams(num, "kg"), grams(0, "kg"));
}

const diff = computed(() => {
  const { asset } = props;
  if (!(asset instanceof CarbonTree) || !props.showDiff) {
    return undefined;
  }
  const {
    totalCo2eqDiff,
    productCo2eqDiff,
    transportCo2eqDiff
  } = asset;
  return {
    total: diffString(totalCo2eqDiff),
    product: diffString(productCo2eqDiff),
    transport: diffString(transportCo2eqDiff)
  }
})
</script>

<template>
  <div
    class="border border-secondary rounded-lg inline-block group/co2info tooltip"
    :class="compact ? 'text-sm p-0.5' : 'p-2'"
    :data-tip="tooltipText"
  >
    <div class="inline-block text-center w-1/3 relative" :class="compact ? 'p-0.5' : 'p-2'">
      <span class="loading loading-ball loading-md group-hover:hidden" v-if="tree === undefined"></span>
      <XMarkIcon v-else-if="tree.totalCo2eq === undefined" class="inline-block group-hover/co2info:hidden h-4 mx-auto mb-0.5" />
      <span v-else class="group-hover/co2info:opacity-0">
        {{ grams(tree.totalCo2eq, "kg") }}
        <span v-if="showDiff" class="text-nowrap text-xs"><br />{{ diff?.total }}</span>
      </span>
      <span class="hidden group-hover/co2info:inline absolute inset-0.5 text-center">total</span>
    </div>
    <div class="inline-block bg-secondary/50 text-center w-1/3 relative" :class="compact ? 'p-0.5 rounded-l-md' : 'p-2 rounded-l'">
      <span class="loading loading-ball loading-md group-hover:hidden" v-if="tree === undefined"></span>
      <XMarkIcon v-else-if="tree.productCo2eq === undefined" class="inline-block group-hover/co2info:hidden h-4 mx-auto mb-0.5" />
      <span v-else class="group-hover/co2info:opacity-0">
        {{ grams(tree.productCo2eq, "kg") }}
        <span v-if="showDiff" class="text-nowrap text-xs"><br />{{ diff?.product }}</span>
      </span>
      <span class="hidden group-hover/co2info:inline absolute inset-0.5 text-center">product</span>
    </div>
    <div class="inline-block bg-secondary/70 text-center w-1/3 relative" :class="compact ? 'p-0.5 rounded-r-md' : 'p-2 rounded-r'">
      <span class="loading loading-ball loading-md group-hover:hidden" v-if="tree === undefined"></span>
      <XMarkIcon v-else-if="tree.transportCo2eq === undefined" class="inline-block group-hover/co2info:hidden h-4 mx-auto mb-0.5" />
      <span v-else class="group-hover/co2info:opacity-0">
        {{ grams(tree.transportCo2eq, "kg") }}
        <span v-if="showDiff" class="text-nowrap text-xs"><br />{{ diff?.transport }}</span>
      </span>
      <span class="hidden group-hover/co2info:inline absolute inset-0.5 text-center">transport</span>
    </div>
  </div>
</template>
