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

<script lang="ts" setup>

import { computed, ref } from 'vue'

const props = defineProps<{ modelValue: any, options: (any | { label: any, value: any })[], equalWidth: boolean }>();
const emit = defineEmits(["update:modelValue"]);

const options = computed<{ label: string, value: string }[]>(() => props.options.map(p => (typeof p === "string" ? { label: p, value: p} : p)));
const values = computed(() => options.value.map(o => o.value));

const root = ref<HTMLDivElement>();
const el = computed(() => root.value?.children[values.value.indexOf(props.modelValue)+1] as HTMLDivElement);

</script>
<template>
  <div class="border rounded-lg py-2 text-center relative box-content block" ref="root">
    <div class="absolute transition-all duration-300 top-0 bottom-0 overflow-hidden" :style="`width: ${el?.clientWidth}px; margin-left: ${el?.offsetLeft}px;`">
      <div class="bg-base-200 absolute inset-1 rounded"></div>
    </div>
    <template v-for="{ label, value } of options" :key="value">
      <div
        :style="equalWidth ? `width: ${100*(1/options.length)}%` : ''"
        class="inline-block z-10 relative cursor-pointer px-2"
        @click="emit('update:modelValue', value)"
      >{{ label }}</div>
    </template>
  </div>
</template>
