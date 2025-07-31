/**
 *   Copyright 2025 Moritz Bock and Software GmbH (previously Software AG)
 *   
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *   
 *     http://www.apache.org/licenses/LICENSE-2.0
 *   
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import _ from "lodash"
import { createRouter, createWebHistory } from "vue-router"
import DatasheetComparison from "@/views/DatasheetComparison.vue"
import SwapSelection from "@/views/SwapSelection.vue"
import HomeView from "../views/HomeView.vue"
import VisualizationSingle from "../views/VisualizationSingle.vue"
import VisualizationDual from "../views/VisualizationDual.vue"
import VisualizationMulti from "../views/VisualizationMulti.vue"
import SingleOverview from '@/views/single/SingleOverview.vue'
import SingleLifeCycle from '@/views/single/SingleLifeCycle.vue'
import SingleComponents from '@/views/single/SingleComponents.vue'
import SingleSimulation from '@/views/single/SingleSimulation.vue'
import AboutView from '@/views/AboutView.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
      meta: {
        back: null,
        breadcrumb: "Asset Selection"
      }
    },
    {
      path: "/shells/:asset",
      component: VisualizationSingle,
      children: [
        {
          path: "/shells/:asset",
          name: "visualization.single",
          component: SingleOverview,
          meta: {
            back: "home",
            breadcrumb: "Overview of One Asset"
          },
        },
        {
          path: "/shells/:asset/lifecycle",
          name: "visualization.single.lifecycle",
          component: SingleLifeCycle,
          meta: {
            back: "visualization.single",
            breadcrumb: "Life Cycle Analysis"
          },
        },
        {
          path: "/shells/:asset/components",
          name: "visualization.single.components",
          component: SingleComponents,
          meta: {
            back: "visualization.single",
            breadcrumb: "Component Analysis"
          },
        },
        {
          path: "/shells/:asset/simulation",
          name: "visualization.single.simulation",
          component: SingleSimulation,
          meta: {
            back: "visualization.single",
            breadcrumb: "Component Analysis"
          },
        }
      ]
    },
    {
      path: "/swap/:asset",
      name: "swap",
      component: SwapSelection,
      meta: {
        back: "home",
        breadcrumb: "Select Components to Swap"
      }
    },
    {
      path: "/about",
      name: "about",
      component: AboutView,
      meta: {
        back: "home",
        breadcrumb: "About"
      }
    },
    {
      path: "/dual/:first/:second",
      name: "visualization.dual",
      component: VisualizationDual,
      meta: {
        back: (r) => ({ name: "table", params: { assets: [r.params.first, r.params.second] }}),
        breadcrumb: "Overview of Two Assets"
      }
    },
    {
      path: "/shells/:assets+",
      name: "visualization.multi",
      component: VisualizationMulti,
      meta: {
        back: "home",
        breadcrumb: "Overview of Multiple Assets"
      },
      beforeEnter: (to, from, next) => {
        if (to.params.assets.length < 3) {
          console.error(`Parameter "assets" is required at least three times for route visualization.multi.`);
          next(false);
        } else {
          next();
        }
      }
    },
    {
      path: "/datasheet/:assets+",
      name: "datasheet",
      component: DatasheetComparison,
      meta: {
        back: "home",
        breadcrumb: "Data Sheet"
      }
      /*
      meta: {
        back: (r) => ({ name: "visualization.single", params: { asset: r.params.assets[0] }}),
        breadcrumb: "Datasheet"
      },
       */
    },
  ],
})

const guardHashIfEmpty = true;
const guardParameters = ["preload", "simulationChanges"];
router.beforeEach(async (to, from) => {
  let hashChanged = false;
  if (guardHashIfEmpty && from.hash && to.hash.length === 0) {
    if (to.fullPath.split("#")[0] !== from.fullPath.split("#")[0]) {
      to.hash = from.hash;
      hashChanged = true;
    }
  }
  // Only allow to remove values from param preload if that's the only param being edited
  // because we might need all preloaded assets to build references between assets.
  for (const param of guardParameters) {
    const fromParam = typeof from.query[param] === "string" ? [from.query[param]] : from.query[param] || [];
    const toParam = typeof to.query[param] === "string" ? [to.query[param]] : to.query[param] || [];
    if (
      (to.hash !== from.hash ||
        to.name !== from.name ||
        !_.isEqual(to.params, from.params) ||
        // Check all query params except preload if they changed
        Object.entries(from.query)
          .filter(([k]) => k !== param)
          .every(([k, v]) => !_.isEqual(to.query[k], v)
          ))
      && _.difference(fromParam, toParam).length > 0
    ) {
      to.query[param] = _.compact(_.uniq([toParam, fromParam].flat()));
      return to;
    }
  }
  if (hashChanged) {
    return to;
  }
})

export default router
