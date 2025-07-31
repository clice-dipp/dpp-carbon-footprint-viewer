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
  <div class="border-warning border-2 rounded flex p-4" v-if="props.warnings.length">
    <div class="mr-4">
    <ExclamationTriangleIcon class="w-12 h-12 bg-warning p-2 rounded" />
    </div>
    <div class="join join-vertical">
      There were warnings when loading the analysis. Be sceptical and cautious when analysing the results. Validate important values.
      <div class="collapse collapse-arrow join-item border-none px-0 border">
        <input type="checkbox" name="analysis-warning-accordion" />
        <div class="collapse-title font-medium px-0">Further Details</div>
        <div class="collapse-content px-0 grid grid-cols-3 gap-4">
          <div class="card bg-warning/25" v-for="([title, message], i) of props.warnings" :key="i">
            <div class="card-body">
              <h2 class="card-title">{{ title }}</h2>
              <p>{{ message || "No further details provided" }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{ warnings: [string, string | undefined][]}>()
</script>
