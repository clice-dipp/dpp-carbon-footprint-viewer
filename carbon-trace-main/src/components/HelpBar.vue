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

import { type Slot, inject, type Ref } from 'vue'
import { helpBarKey } from '@/lib/injectionKeys'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const content = inject<Ref<Slot>>(helpBarKey);
</script>
<template>
  <Transition>
    <div class="fixed inset-0 flex" style="z-index: 99999;" v-if="content">
      <div class="flex-grow bg-black opacity-10" @click="content = undefined;"></div>
      <div class="bg-base-100 h-full shadow-xl p-4 overflow-y-auto">
        <button @click="content = undefined;" class="btn btn-secondary btn-sm btn-outline px-1"><XMarkIcon class="w-6 h-6" /></button>
        <Component :is="content" v-if="content" />
        <div>
          <button class="btn btn-secondary btn-outline btn-block btn-sm" @click="content = undefined;">Close</button>
        </div>
      </div>
    </div>
  </Transition>
</template>
