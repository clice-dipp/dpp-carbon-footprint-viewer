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
import { type ShellDescriptionSmallInterface } from '@/lib/api/shellTypes'
import { CubeIcon } from '@heroicons/vue/24/outline'
import PromiseHandler from '@/components/PromiseHandler.vue'
import shells from '@/lib/api/shells'
import { computed, onUnmounted, ref, watch } from 'vue'
import { generateColor } from '@/lib/util'
import { type RouteLocationRaw, useRouter } from 'vue-router'
import Co2InfoBox from '@/components/Co2InfoBox.vue'
import CarbonTree from '@/lib/model/CarbonTree'

const props = withDefaults(defineProps<{
  shell: ShellDescriptionSmallInterface | CarbonTree,
  to?: RouteLocationRaw,
  toButton?: RouteLocationRaw,
  toButtonText?: string,
  compact?: boolean,
  showCo2?: boolean,
  showDiff?: boolean,
}>(), { to: undefined, toButton: undefined, toButtonText: "View", showDiff: false });

const imageHidden = ref(false);
const thumbnail = ref<HTMLImageElement>()
function hideImage() {
  imageHidden.value = true;
}
watch(thumbnail, (t, oldT) => {
  if (t) {
    t.addEventListener('error', hideImage);
  }
  if (oldT) {
    oldT.removeEventListener('error', hideImage);
  }
})

onUnmounted(() => {
  thumbnail.value?.removeEventListener('error', hideImage);
})

const router = useRouter();

const href = computed(() => {
  if (!props.to) {
    return undefined;
  }
  return router.resolve(props.to).href;
})

const shellId = computed(() => props.shell instanceof CarbonTree ? props.shell.asset.id : props.shell.id);

</script>

<template>
  <a :href="href" class="card bg-base-100" :class="{'card-compact': props.compact}">
    <figure :class="props.compact ? 'h-24' : 'h-36'" :style="`background: ${generateColor(shellId)}`">
      <PromiseHandler :promise="shells.thumbnail(shellId)">
        <template #loading>
          <span class="loading loading-ring w-40 opacity-5"></span>
        </template>
        <template #resolved="{ data }">
          <CubeIcon class="opacity-5 text-gray-700" :class="props.compact ? 'h-36' : 'h-48'" v-if="imageHidden || !data" />
          <img :src="data" v-else ref="thumbnail" class="max-h-full rounded-md" />
        </template>
        <template #rejected>
          <CubeIcon class="opacity-5 text-gray-700" :class="props.compact ? 'h-36' : 'h-48'" />
        </template>
      </PromiseHandler>
    </figure>
    <div class="card-body">
      <h2 class="card-title break-all text-wrap" :class="compact ? 'text-base mb-0' : 'text-lg'">{{ props.shell.name }}</h2>
      <p class="max-h-32 line-clamp-4">{{ props.shell.description }}</p>
      <Co2InfoBox
        v-if="showCo2"
        :asset="props.shell instanceof CarbonTree ? props.shell : shellId"
        :show-diff="showDiff"
        compact
      />
      <div class="card-actions" v-if="toButton">
        <router-link :to="toButton" class="btn btn-block btn-secondary/10" :class="props.compact ? 'btn-xs' : 'btn-sm'" target="_blank">{{ toButtonText }}</router-link>
      </div>
    </div>
  </a>
</template>
