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
  <span>{{ timeString }}</span>
</template>
<script lang="ts" setup>
import { onUnmounted, ref } from 'vue'

/**
 * small component which shows a certain time ago and updates it every <interval, default=5000> milliseconds
 */
const props = withDefaults(
  defineProps<{
    interval?: number
    date?: Date
  }>(),
  { interval: 5000, date: undefined }
)

/**
 * Current string representation of the duration
 */
const timeString = ref('just now')
const date = props.date || new Date();

/**
 * Update the duration every interval
 */
const updateTime = setInterval(() => {
  const diff = Math.round((Date.now() - date.getTime()) / 1000)
  const seconds = diff % 60
  const minutes = Math.floor(diff / 60)
  if (diff == 0) {
    return 'just now'
  }
  let newTime = ''
  if (minutes) {
    newTime += minutes + ' minute'
    if (minutes != 1) {
      newTime += 's'
    }
  }
  if (seconds || !minutes) {
    if (minutes) {
      newTime += ' and '
    }
    newTime += seconds + ' second'
    if (seconds != 1) {
      newTime += 's'
    }
    newTime += ' '
  }
  timeString.value = newTime + ' ago'
}, props.interval)

// Delete the interval method when the not shown anymore
onUnmounted(() => {
  clearInterval(updateTime)
})
</script>
