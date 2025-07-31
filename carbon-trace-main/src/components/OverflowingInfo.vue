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
  <div class="alert bg-base-200/20 flex">
    <InformationCircleIcon class="w-8 h-8 py-1" />
    <div
      class="overflow-hidden overflow-ellipsis relative w-full z-0"
      :class="{'whitespace-nowrap h-6': !expanded}"
    >
      <button
        class="float-right link pl-1 cursor-pointer z-50"
        @click="expanded = !expanded"
        v-show="!expanded"
      >
        Show more
      </button>
      <div
        class="inline relative text-justify hyphens-auto"
        :class="{'-z-10': !expanded}"
      >
        <slot />
        <button
          class="link cursor-pointer"
          @click="expanded = !expanded"
          v-show="expanded"
        >
          Show less
        </button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { InformationCircleIcon } from '@heroicons/vue/24/outline'

const expanded = defineModel();
</script>
