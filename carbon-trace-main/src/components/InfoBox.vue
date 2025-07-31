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

<template>
  <div class="flex flex-col relative">
    <span
      v-if="props.explanation"
      :class="`tooltip-${direction}`"
      class="tooltip bg-black/10 px-2 rounded-full cursor-help absolute top-2 right-2 z-20"
      :data-tip="props.explanation"
    >?</span>
    <div class="relative z-10 flex-grow p-4 flex items-center justify-center rounded-t-lg overflow-hidden">
      <slot></slot>
    </div>
    <router-link
      class="text-center text-sm font-normal btn btn-xs m-1"
      v-if="to"
      :to="props.to"
    >
      {{ linkText }}
      <ChevronDoubleRightIcon class="h-4 inline-block" />
    </router-link>
  </div>
</template>
<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import {
  ChevronDoubleRightIcon
} from '@heroicons/vue/24/outline'

const props = withDefaults(
  defineProps<{
    explanation?: string,
    direction?: "left" | "right" | "top" | "bottom",
    to?: RouteLocationRaw,
    linkText?: string,
  }>(),
  {
    explanation: undefined,
    direction: "right",
    to: undefined,
    linkText: "More info",
  }
);
</script>
