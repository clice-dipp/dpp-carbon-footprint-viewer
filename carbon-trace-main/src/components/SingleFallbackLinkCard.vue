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
import InfoBox from '@/components/InfoBox.vue'
import { type RouteLocationRaw, useRoute, useRouter } from 'vue-router'
import { ChartBarSquareIcon } from '@heroicons/vue/24/outline'
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    explanation?: string,
    direction?: "left" | "right" | "top" | "bottom",
    to: RouteLocationRaw,
    fallbackTo?: RouteLocationRaw,
  }>(),
  {
    explanation: undefined,
    direction: "right",
    fallbackTo: undefined,
  }
);

const router = useRouter();

const isOtherRoute = computed(() => router.resolve(props.to).path === router.currentRoute.value.path);
const adjustedTo = computed(() => {
  if (isOtherRoute.value) {
    if (props.fallbackTo) {
      return props.fallbackTo;
    }
    return { name: 'visualization.single', params: router.currentRoute.value.params };
  }
  return props.to;
});
</script>

<template>
  <router-link class="col-span-2 text-center border-2 rounded-lg p-4" :to="adjustedTo">
    <InfoBox>
      <div class="text-center">
        <template v-if="!isOtherRoute">
          <slot />
        </template>
        <template v-else>
          <slot name="fallback">
            <ChartBarSquareIcon class="h-10 mx-auto mb-2" />
            <div class="text-base-content">
              <strong>Overview</strong><br />
              Not familiar with the asset and its components? Get an overview.
            </div>
          </slot>
        </template>
      </div>
    </InfoBox>
  </router-link>
</template>
