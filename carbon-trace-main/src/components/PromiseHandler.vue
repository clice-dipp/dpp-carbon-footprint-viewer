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

<script setup lang="ts" generic="PromiseValue">
import { ref } from 'vue'
import { ErrorClient } from '@/lib/ErrorDataHandler'

const props = withDefaults(
  defineProps<{
    promise: Promise<PromiseValue>,
    onfulfilled?: (data: PromiseValue) => any,
    onrejected?: (reason: any) => any,
    finally?: () => any,
  }>(),
  {
    onfulfilled: () => {},
    onrejected: (reason: any) => { ErrorClient.add(reason); },
    finally: () => {},
  }
)
const loading = ref(true);
const data = ref<PromiseValue | undefined>(undefined);
const error = ref<any>(undefined);

props.promise
  .then((d) => { data.value = d; })
  .catch((e) => { error.value = e; })
  .finally(() => { loading.value = false; })
</script>

<template>
  <slot name="loading" v-if="loading"></slot>
  <slot v-else-if="data" name="resolved" :data="data"></slot>
  <slot v-else name="rejected" :error="error"></slot>
</template>
