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
  <div class="fixed bottom-0 right-8 z-40" v-if="!hide && !hideFloatingInfo">
    <div class="m-4 alert alert-error shadow-xl flex">
      <div class="flex-grow">
        {{ errors.length }} {{ pluralizeWord(errors.length, "Error") }} occured while loading the visualizations.
        Scroll down for more information.
      </div>
      <div>
        <button class="btn btn-sm btn-outline" @click="onMoreClick">More <ArrowDownIcon class="h-4" /></button>
        <button class="ml-4 btn btn-sm btn-outline" @click="hideFloatingInfoCount = errors.length">Dismiss <XMarkIcon class="h-4" /></button>
      </div>
    </div>
  </div>
  <div v-show="errors.length && !hide" class="m-4 z-50 relative">
    <div class="collapse bg-error text-error-content relative">
      <button class="absolute top-4 right-4 z-10" @click="hideCount = errors.length"><XMarkIcon class="h-6" /></button>
      <input type="checkbox" v-model="expandErrors" />
      <div class="collapse-title text-xl font-medium">
        <div class="badge badge-outline relative">
          {{ errors.length }}
          <div class="badge badge-outline absolute" :class="{ 'animate-[ping_.8s_ease-in-out_forwards]': ping }">
            {{ errors.length }}
          </div>
        </div>
        {{ pluralizeWord(errors.length, "Error") }}
      </div>
      <div class="collapse-content">
        <div class="join join-vertical w-full">
          <div
            class="collapse collapse-arrow join-item border border-base-300 group"
            v-for="error in errors"
            :key="error.message"
          >
            <input type="checkbox" />
            <div class="absolute z-50 top-2 left-2 group-hover:inline-block hidden bg-base-100 join">
              <button type="button" class="btn btn-outline btn-xs join-item" @click="hideError(error)">Hide</button>
              <button type="button" class="btn btn-outline btn-xs join-item" @click="hidePermanently(error)">Hide also in the future</button>
            </div>
            <div class="collapse-title text-xl font-medium bg-base-100">
              <code v-if="error.status">{{ error.status }}</code>
              {{ error.message }}
              <TimeAgo :date="error.timestamp" class="badge badge-sm opacity-50" />
            </div>
            <div class="collapse-content overflow-scroll bg-base-100">
              <!--<pre class="mb-2">{{ error.timestamp }}</pre>-->
              <p v-if="error.details" class="mb-2">{{ error.details }}</p>
              <pre v-if="error.trace" class="mb-2 whitespace-pre-wrap">{{ error.trace }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ErrorClient, type ErrorDataHandler } from '@/lib/ErrorDataHandler'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import TimeAgo from '@/components/TimeAgo.vue'
import { pluralize, pluralizeWord } from '../lib/util'
import { XMarkIcon, ArrowDownIcon } from '@heroicons/vue/24/outline'
import { storageRef } from '@/lib/storage'

const permanentlyHidden = storageRef<string[]>("permanentlyHiddenErrors", []);

/**
 * Errors to show
 */
const errors = reactive<ErrorDataHandler[]>([])
const hiddenErrors = reactive<ErrorDataHandler[]>([]);

/**
 * Show errors supplied by the error client
 */
const hideCount = ref(0);
const hide = computed(() => errors.length <= hideCount.value);

/**
 * Trigger a ping animation
 */
const ping = ref(false)

/**
 * Hide the floating information that there are errors.
 */
const hideFloatingInfoCount = ref(0);
const hideFloatingInfo = computed(() => errors.length <= hideFloatingInfoCount.value);


const expandErrors = ref(false);
watch(expandErrors, () => {
  hideFloatingInfoCount.value = errors.length;
});

/**
 * Show the ping animation once
 */
function pingOnce () {
  ping.value = false
  nextTick(() => {
    ping.value = true
    setTimeout(() => (ping.value = false), 800)
  })
}

/**
 * Register the error handler to the client
 * @param e Error data to show
 */
ErrorClient.errorFunction = (e: ErrorDataHandler | undefined) => {
  if (e === undefined) {
    return
  }
  console.error(e.message, e)
  pingOnce()
  if (permanentlyHidden.value.includes(e.message)) {
    hiddenErrors.push(e);
  } else {
    errors.unshift(e)
  }
}

function onMoreClick() {
  hideFloatingInfoCount.value = errors.length;
  expandErrors.value = true;
  nextTick(() => {
    window.scrollTo(0, document.body.scrollHeight);
  })
}

function hideError(error: ErrorDataHandler) {
  const i = errors.indexOf(error);
  if (i < 0) {
    return;
  }
  errors.splice(i, 1);
  hiddenErrors.push(error);
}

function hidePermanently(error: ErrorDataHandler) {
  permanentlyHidden.value.push(error.message);
  hideError(error);
}
</script>
