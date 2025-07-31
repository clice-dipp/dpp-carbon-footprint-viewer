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

import type CarbonTree from '@/lib/model/CarbonTree'
import * as Plot from '@observablehq/plot'
import { ref, watch } from 'vue'

const props = defineProps<{ carbonTree?: CarbonTree }>();
const plot = ref<HTMLDivElement>();

function makePlot() {
  if (!plot.value) {
    return;
  }

  const data = [
    { id: "A", parent: null },
    { id: "B", parent: "A" },
    { id: "C", parent: "A" },
    { id: "D", parent: "B" },
    { id: "E", parent: "B" },
    { id: "F", parent: "C" },
  ];



  for (const child of plot.value.childNodes) {
    child.remove();
  }
  // plot.value.appendChild(p);
}

watch(() => plot.value, makePlot, { immediate: true })
</script>
<template>
  {{ props.carbonTree?.asset.id }}
  <div ref="plot"></div>
</template>
