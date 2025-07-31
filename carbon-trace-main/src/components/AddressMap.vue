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
  <div ref="mapContainer" class="flex-1" @resize="recenter"></div>
</template>

<script setup lang="ts">
import { inject, onUnmounted, type Ref, ref, watch } from 'vue'
import { darkModeKey } from '@/lib/injectionKeys'

const props = defineProps<{
  street: string,
  city: string,
  stateCounty?: string,
  zipcode: string,
  countryCode: string
}>()

const mapContainer = ref<HTMLDivElement>();
const darkMode = inject<Ref<boolean>>(darkModeKey);

let lastCenter = [9.389, 47.636] as [number, number];
watch(props, async () => {
  /*
  const query = `address_line1=${encodeURIComponent(props.street)}&`
    + `place=${encodeURIComponent(props.city)}`
    + (props.stateCounty ? `region=${encodeURIComponent(props.stateCounty)}` : "")
    + `postcode=${encodeURIComponent(props.zipcode)}`
    + `country=${encodeURIComponent(props.countryCode)}`
   */
  const addressString = `${props.street}\n${props.city}\n${props.stateCounty ? `${props.stateCounty}\n` : ''}${props.zipcode}`;
  const query = `q=${encodeURIComponent(addressString)}&country=${encodeURIComponent(props.countryCode)}`;
 
}, { immediate: true })

function recenter() {
  
}

onUnmounted(() => {
  
})

defineExpose({
  recenter
})
</script>
