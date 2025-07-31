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
import CarbonTree from '@/lib/model/CarbonTree'
import { storageRef } from '@/lib/storage'
import { computed, inject, type Ref, ref, watch } from 'vue'
import ShellCard from '@/components/ShellCard.vue'
import type { ShellDescriptionSmallInterface } from '@/lib/api/shellTypes'
import { assetIdMapKey, shellDescriptionsKey } from '@/lib/injectionKeys'
import {
  type LifeCyclePhase,
  lifeCyclePhaseDescription,
  LifeCyclePhases,
  lifeCyclePhaseSequence
} from '@/lib/lifeCycleUtil'
import { loadFullAssetInfo } from '@/lib/util'
import type CarbonFootprint from '@/lib/model/CarbonFootprint'
import { AssetIdMap } from '@/lib/AssetIdMap'
import {
  StarIcon as SolidStarIcon
} from '@heroicons/vue/24/solid'
import type { CarbonTreeType } from '@/lib/model/CarbonFootprintType'
import { v4 as uuidv4 } from 'uuid';

function generateId(input: string | null | undefined = ""): string {
  // Step 1: Replace all characters that are not A-Z, a-z, 0-9, -, or _
  let sanitized = (input || "").replace(/[^a-zA-Z0-9-_]+/g, '_');

  // Step 2: Replace consecutive underscores with a single underscore
  sanitized = sanitized.replace(/_+/g, '_');

  // Step 3: Optionally, trim any leading or trailing underscores
  sanitized = sanitized.replace(/^_+|_+$/g, '');

  return (sanitized.length ? `${sanitized}-` : "") + uuidv4().toString();
}

const searchValue = ref("");
const descriptions = inject<Ref<ShellDescriptionSmallInterface[]>>(shellDescriptionsKey)
const hiddenShells = computed<boolean[] | undefined>(() => {
  if (!searchValue.value) { return undefined; }
  const s = searchValue.value.toLowerCase();
  return descriptions?.value.map(
    (d) =>
      !d.id.toLowerCase().includes(s) &&
      !d.name.toLowerCase().includes(s) &&
      !d.globalAssetId.toLowerCase().includes(s) &&
      !d.idShort?.toLowerCase().includes(s) &&
      !d.description?.toLowerCase().includes(s)
  )
})

const favorites = storageRef<{ [globalAssetId: string]: boolean }>("selectedShellsById", {})
const modalShells = computed(() => {
  return descriptions?.value?.filter((_, i) => !hiddenShells.value?.[i]).sort((a, b) => {
    console.log(a, favorites.value);
    if (favorites.value?.[a.globalAssetId] === favorites.value?.[b.globalAssetId]) {
      return 0;
    }
    if (favorites.value?.[a.globalAssetId]) {
      return -1;
    }
    return 1;
  });
});

const baseAsset = ref<ShellDescriptionSmallInterface | CarbonTree>();
const basePCF = () => ({ co2eq: undefined, lifeCyclePhase: undefined })
const currentPCFIndex = ref(-1);
const assetName = ref("");
const assetDescription = ref("");
const assetPCFs = ref<{ co2eq?: number, lifeCyclePhase?: LifeCyclePhases }[]>([basePCF()]);
const assetTCFs = ref<(number | undefined)[]>([undefined]);
const submitText = ref("");
const title = ref("");
let generateName = (name: string) => name;
let generateDescription = (description?: string, name?: string) => (description || "");
const reset = () => {
  currentPCFIndex.value = -1;
  assetName.value = "";
  assetDescription.value = "";
  assetPCFs.value = [basePCF()];
  assetTCFs.value = [undefined];
  baseAsset.value = undefined;
  title.value = "Component";
  submitText.value = "Submit Component";
  generateName = (name: string) => name;
  generateDescription = (description?: string, name?: string) => (description || "");
}
const createCarbonTree = () => {
  const id = generateId(assetName.value);
  const entityId = generateId(assetName.value);
  return {
    asset: {
      id,
      idShort: id,
      displayName: assetName.value,
      description: assetDescription.value,
      footprint: {
        product: assetPCFs.value.filter(({ co2eq }) => typeof co2eq === 'number' && Number.isFinite(co2eq)).map(({ co2eq, lifeCyclePhase }) => ({ co2eq, lifeCyclePhase: (lifeCyclePhase || new LifeCyclePhases()), calculationMethod: new Set(["Simulation"]), referenceValueForCalculation: "", quantityOfMeasureForCalculation: 1, goodsAddressHandover: {} })),
        transport: assetTCFs.value.filter(({ co2eq }) => typeof co2eq === 'number' && Number.isFinite(co2eq)).map((co2eq) => ({ co2eq, calculationMethod: "Simulation", referenceValueForCalculation: "", quantityOfMeasureForCalculation: 1, processesForGreenhouseGasEmissionInATransportService: "WTW - Well-to-Wheel", goodsTransportAddressTakeover: {}, goodsTransportAddressHandover: {} })),
      }
    },
    entity: {
      idShort: entityId,
    },
    connections: {},
    connection: { bulkCount: 1 },
  } as CarbonTreeType;
}

const showEditModal = ref(false);
const showAssetModal = ref(false);
const showLifeCycleModal = ref(false);
const selectedLifeCyclePhases = ref<LifeCyclePhase[]>([]);

let editModalResolve: (tree: CarbonTreeType) => any = () => {};
let editModalReject: (error: any) => any = () => {};
const allowChangeBase = ref(true);

const show = (
  { base, swap, newGenerateName, newGenerateDescription, newTitle, newSubmitText }:
  { base?: CarbonTree, swap?: boolean, newGenerateName?: (name: string) => string, newGenerateDescription?: (description: string, name: string) => string, newTitle?: string, newSubmitText?: string } = {}
) => {
  allowChangeBase.value = base === undefined;
  baseAsset.value = base;
  showAssetModal.value = swap || false;
  title.value = newTitle || title.value;
  submitText.value = newSubmitText || submitText.value;
  showEditModal.value = true;
  generateName = newGenerateName || generateName;
  generateDescription = newGenerateDescription || generateDescription;
  return new Promise<CarbonTreeType>((resolve, reject) => {
    editModalResolve = resolve;
    editModalReject = reject;
  })
}

const submit = () => {
  showEditModal.value = false;
  const tree = createCarbonTree();
  reset();
  editModalResolve(tree);
  editModalResolve = () => {};
  editModalReject = () => {};
}

const close = () => {
  editModalReject(null);
  editModalResolve = () => {};
  editModalReject = () => {};
  reset();
  showEditModal.value = false;
}

let currentLoadKey = 0;
const idMap = inject<Ref<AssetIdMap>>(assetIdMapKey);
watch(baseAsset, (shell) => {
  currentLoadKey += 1;
  if (!shell) {
    return;
  }
  const loadKey = currentLoadKey;
  assetName.value = generateName(shell.name);
  assetDescription.value = generateDescription(shell.description, shell.name);
  const adjustSettings = (carbonTree?: CarbonTree, carbonFootprint?: CarbonFootprint) => {
    if (loadKey !== currentLoadKey) {
      return;
    }
    if (!carbonTree && !carbonFootprint) {
      return;
    }
    if (carbonFootprint) {
      assetPCFs.value = carbonFootprint.product.filter(a => a.co2eq > 0).map(({ co2eq, lifeCyclePhase }) => ({ co2eq, lifeCyclePhase }));
      assetTCFs.value = carbonFootprint.transport.filter(a => a.co2eq > 0).map(a => a.co2eq);
    } else if (carbonTree) {
      assetPCFs.value = [{ co2eq: carbonTree.productCo2eq, lifeCyclePhase: carbonTree.coveredLifeCyclePhases.length ? carbonTree.coveredLifeCyclePhases : carbonTree.byChildrenCoveredLifeCyclePhases }];
      assetTCFs.value = [carbonTree?.transportCo2eq];
    }
  };

  if (shell instanceof CarbonTree) {
    adjustSettings(shell, shell.asset.footprint);
  } else {
    loadFullAssetInfo(btoa(shell.globalAssetId), idMap?.value).then(({ carbonTree, carbonFootprint }) => adjustSettings(carbonTree, carbonFootprint));
  }
})

defineExpose({
  show,
  close
})
</script>

<template>
  <div class="modal" :class="{ 'modal-open': showEditModal }" ref="modal">
    <div class="modal-box card bg-base-100">
      <form method="dialog" @click="close">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
      <div class="card-body">
        <h2 class="card-title">{{ title }}</h2>
        <!--
        <ToggleSelect :options="[{ value: false, label: 'Simple Settings' }, { value: true, label: 'Advanced Settings' }]" v-model="advancedSettings" :equal-width="true" class="w-full" />
        -->
        <div
          v-if="baseAsset"
          class="border rounded px-4 pt-2 pb-4 text-center"
        >
          Based on:
        <ShellCard
          :shell="baseAsset"
          class="mt-2 shadow-xl max-w-96 m-auto mb-4 text-left"
          compact
          />
          <template v-if="allowChangeBase">
            <button @click="showAssetModal = true" class="btn btn-sm btn-outline btn-secondary flex-grow mr-4" type="button">Change</button>
            <button @click="baseAsset = undefined" class="btn btn-outline btn-sm btn-secondary flex-grow" type="button">Remove</button>
          </template>
        </div>
        <div class="flex flex-row w-full gap-2 items-center" v-else>
          <span>optional:</span>
          <button @click="showAssetModal = true" class="btn btn-sm btn-secondary/20 flex-grow">Select Base Asset</button>
        </div>
        <input class="input input-bordered w-full" placeholder="Name" v-model="assetName" />
        <textarea class="input input-bordered w-full py-4 min-h-20" placeholder="Description" v-model="assetDescription"></textarea>
        <div class="border p-2 grid grid-cols-1 gap-2" v-for="(pcf, i) of assetPCFs" :key="i">
          <label class="input input-bordered w-full flex items-center gap-2">
            <input placeholder="Product Carbon Footprint" type="number" class="flex-grow" step="0.1" min="0" v-model="pcf.co2eq" /> <span>kg</span>
          </label>
          <div class="text-center">
            {{ pcf.lifeCyclePhase ? `Life Cycles: ${pcf.lifeCyclePhase.toString(false, true)}` : "No Life Cycles Set" }}
            <button type="button" class="btn btn-secondary btn-sm mt-2" @click="showLifeCycleModal = true; currentPCFIndex = i; selectedLifeCyclePhases = [...(pcf.lifeCyclePhase?.phases || [])];">Choose</button>
          </div>
        </div>
        <button class="btn btn-block btn-secondary -mt-2 btn-sm" type="button" @click.prevent="assetPCFs.push({})">Add another Product Carbon Footprint</button>

        <label class="input input-bordered w-full flex items-center gap-2" v-for="i of assetTCFs.length" :key="i">
          <input placeholder="Transport Carbon Footprint" type="number" class="flex-grow" step="0.1" min="0" v-model="assetTCFs[i-1]" /> <span>kg</span>
        </label>
        <button class="btn btn-block btn-secondary -mt-2 btn-sm" type="button" @click.prevent="assetTCFs.push(undefined)">Add another Transport Carbon Footprint</button>

        <button class="btn btn-block btn-primary" type="submit" @click.prevent="submit">{{ submitText }}</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="close">close</button>
    </form>
  </div>
  <dialog class="modal" :class="{ 'modal-open': showAssetModal }">
    <div class="modal-box max-w-screen-lg h-4/5 rounded-2xl shadow-lg bg-base-100 overflow-y-scroll pt-0">
      <div class="flex flex-row gap-4 justify-center items-center sticky top-0 z-10 bg-base-100 py-2 pl-4 pr-8">
        <span>Choose an asset</span>
        <input class="input input-sm py-0 bg-secondary/10 flex-grow" placeholder="Search" v-model="searchValue" />
        <form method="dialog" @click="showAssetModal = false">
          <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
        </form>
      </div>
      <div class="grid grid-cols-4 gap-4 p-4 bg-white rounded-lg">
        <em class="text-center col-span-4" v-if="hiddenShells && hiddenShells.every(x => x)">
          No assets found<br />
          <button @click="searchValue = ''" class="btn btn-secondary btn-sm">Clear Search</button>
        </em>
        <div
          v-for="(shell, i) of modalShells"
          class="relative bg-base-100 shadow-xl h-full cursor-pointer hover:scale-110 transition-all"
          @click="baseAsset = shell; showAssetModal = false;"
        >
          <span
            v-if="favorites[shell.globalAssetId]"
            class="transition-all rounded-lg p-1 top-1 left-1 absolute z-10 w-8 h-8 bg-yellow-400 text-base-100">
            <SolidStarIcon />
          </span>
          <ShellCard
            :key="shell.globalAssetId"
            :shell="shell"
            compact
            show-co2
          />
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="showAssetModal = false;">close</button>
    </form>
  </dialog>
  <dialog class="modal" :class="{ 'modal-open': showLifeCycleModal }">
    <div class="modal-box">
      <form method="dialog" @click="showLifeCycleModal = false; selectedLifeCyclePhases = [];">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
      </form>
      <label class="label cursor-pointer" v-for="lifeCycle of lifeCyclePhaseSequence" :key="lifeCycle">
        <input type="checkbox" class="checkbox" :value="lifeCycle" v-model="selectedLifeCyclePhases" />
        <span class="ml-4 label-text flex-grow">{{ lifeCycle }} &mdash; {{ lifeCyclePhaseDescription[lifeCycle ]}}</span>
      </label>
      <button class="btn btn-block btn-primary mt-2" type="submit" @click.prevent="assetPCFs[currentPCFIndex].lifeCyclePhase = new LifeCyclePhases(selectedLifeCyclePhases); selectedLifeCyclePhases = []; showLifeCycleModal = false;">Set Life Cycle Phases</button>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button @click="showLifeCycleModal = false; selectedLifeCyclePhases = [];" type="button">close</button>
    </form>
  </dialog>
</template>
