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
import {
  type RouteLocation,
  type RouteLocationRaw,
  useRouter
} from 'vue-router'
import { computed } from 'vue'

const router = useRouter();
const routesByPath = Object.fromEntries(router.getRoutes().map((r) => [r.path, r]))
const routesByName = Object.fromEntries(router.getRoutes().map((r) => [r.name, r]))
const terminusRoute = routesByPath["/"];
if (!terminusRoute) {
  console.error("Breadcrumbs terminus not correctly set")
}
const routePath = computed(() => {
  let c: RouteLocation = router.currentRoute.value;
  const p: [RouteLocationRaw, string][] = [
    [c, c.meta.breadcrumb as string]
  ];
  while (c.meta.back) {
    let { back } = c.meta;
    if (typeof back !== "string" && typeof back !== "function" && typeof back !== "object") {
      console.error("Could not build breadcrumb path, terminating early");
      break;
    }
    if (typeof back === "function") {
      back = back(p[0][0]);
    }
    if (typeof back === "string") {
      back = { name: back };
    }
    const routeLocation = back as RouteLocation;
    if (!routeLocation.name && !routeLocation.path) {
      console.error("Could not build breadcrumb path, terminating early");
      break;
    }
    const backRoute: RouteLocation = routeLocation.path ? routesByPath[routeLocation.path] : routesByName[routeLocation.name!];
    p.unshift([routeLocation, backRoute.meta.breadcrumb as string]);
    c = backRoute;
  }
  if (c.path !== terminusRoute.path) {
    p.unshift([terminusRoute, terminusRoute.meta.breadcrumb as string]);
  }
  return p;
})
</script>
<template>
  <div class="breadcrumbs">
    <ul>
      <li v-for="([route, breadcrumb], i) of routePath" :key="i"><router-link :to="route">{{ breadcrumb }}</router-link></li>
    </ul>
  </div>
</template>
