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
import { onUnmounted, ref, watch } from 'vue'
import shellRepo from '@/lib/api/shells'
import { asyncComputed } from '@vueuse/core'

const props = withDefaults(defineProps<{ assetId: string, hideOnError?: boolean, alt?: string }>(), { hideOnError: true, alt: "Asset thumbnail" });

const thumbnail = ref<HTMLImageElement>();
const thumbnailSrc = asyncComputed(async () => shellRepo.thumbnail(props.assetId))
const thumbnailHidden = defineModel<boolean>({ default: false });

function hideThumbnail() {
  thumbnailHidden.value = true;
}

function showThumbnail() {
  thumbnailHidden.value = false;
}

const emit = defineEmits<{ load: [], error: [] }>()

function emitLoad() {
  emit('load')
}

function emitError() {
  emit('error')
}

watch(thumbnail, (t, oldT) => {
  if (t) {
    if (props.hideOnError) {
      t.addEventListener('error', hideThumbnail);
    }
    t.addEventListener('error', emitError);
    t.addEventListener('load', emitLoad);
  }
  if (oldT) {
    oldT.removeEventListener('error', hideThumbnail);
    oldT.removeEventListener('error', emitError);
    oldT.removeEventListener('load', emitLoad);
  }
}, { immediate: true });

onUnmounted(() => {
  thumbnail.value?.removeEventListener('error', hideThumbnail);
  thumbnail.value?.removeEventListener('error', emitError);
  thumbnail.value?.removeEventListener('load', emitLoad);
})

watch(thumbnailSrc, (newSrc) => {
  if (!newSrc) {
    hideThumbnail();
  } else {
    showThumbnail();
  }
});

</script>
<template>
  <div
    v-if="thumbnailSrc"
    v-show="!thumbnailHidden"
    class="flex items-center justify-center relative"
  >
    <div
      class="size-full inset-0 absolute  bg-cover bg-center -z-10"
      :style="`background-image: url('${thumbnailSrc}'); filter: blur(50px);`"
    ></div>
    <img
      ref="thumbnail"
      class="max-w-full max-h-full"
      :alt="props.alt"
      :src="thumbnailSrc" />
  </div>
</template>
