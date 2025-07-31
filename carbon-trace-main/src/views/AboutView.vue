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
  <div class="ml-20 min-h-screen">
    <BreadcrumbsBar class="pt-4" />
    <div class="prose mt-8">
      <h1>About</h1>
      <p>
        This project was developed as part of the master thesis &ldquo;Visual Analytics on Digital
        Product Passports to Optimize Production Chains&rdquo; by
        Moritz Bock (mvb1996@gmail.com) and the Reseach department of Software GmbH (previously Software AG).
      </p>
      <p>
        It was written as part of the CLiCE-DiPP research project funded by the German Federal Ministry for Economic Affairs and Climate Action.
        <img alt="CLiCE-DiPP logo" src="@/assets/CLiCE-DiPP.svg" class="w-60 m-auto mt-4" />
      </p>
      <p>
        Please note that values in this demo do not reflect real emissions and are not real.
      </p>
    </div>
  </div>
</template>
<script setup lang="ts">
import BreadcrumbsBar from '@/components/BreadcrumbsBar.vue'
</script>
