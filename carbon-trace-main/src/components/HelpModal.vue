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
import { QuestionMarkCircleIcon } from '@heroicons/vue/24/outline'
import { type Component, inject, type Ref, ref, type Slot, useSlots } from 'vue'
import { helpBarKey } from '@/lib/injectionKeys'

const slots = useSlots();
const content = inject<Ref<Slot>>(helpBarKey);

const show = () => {
  if (content && slots.default) {
    content.value = slots.default;
  }
}
</script>
<template>
  <div class="relative inline-block">
    <button class="inline-block" @click="show">
      <slot name="icon">
        <QuestionMarkCircleIcon class="w-6 h-6 opacity-70" />
      </slot>
    </button>
  </div>
</template>
