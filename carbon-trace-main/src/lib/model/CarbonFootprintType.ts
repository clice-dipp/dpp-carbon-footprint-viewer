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

import type { LifeCyclePhases } from '@/lib/lifeCycleUtil'

type PCFCalculationMethod = "EN 15804" | "GHG Protocol" | "IEC TS 63058" | "ISO 14040" | "ISO 14044" | "ISO 14067" | "IEC 63366" | "PEP Ecopassport";
type ReferenceValueForCalculation = "g" | "kg" | "t" | "ml" | "l" | "cbm" | "qm" | "piece"
type TCFCalculationMethod = "EN 16258"
type ProcessForGreenhouseGasEmissionInATransportService = "WTT - Well-to-Tank" | "TTW - Tank-to-Wheel" | "WTW - Well-to-Wheel";

// Types in accordance with https://industrialdigitaltwin.org/wp-content/uploads/2024/01/IDTA-2023-0-9-_Submodel_CarbonFootprint.pdf

export type BasicInfo = {
  idShort: string;
  displayName?: string;
  description?: string;
}

export type ConnectionInfo = BasicInfo & {
  bulkCount?: number;
};

export type AssetInfo<CarbonFootprint extends CarbonFootprintType = CarbonFootprintType> = BasicInfo & {
  id: string;
  footprint?: CarbonFootprint;
}

export type CarbonTreeType<CarbonFootprint extends CarbonFootprintType = CarbonFootprintType> = {
  asset: AssetInfo<CarbonFootprint>;
  entity: BasicInfo;
  connection?: ConnectionInfo;
  parent?: CarbonTreeType<CarbonFootprint>;

  connections: { [id: string]: CarbonTreeType<CarbonFootprint>; }
}


export type CarbonFootprintType = {
  product: ProductCarbonFootprint[];
  transport: TransportCarbonFootprint[];
}

export type GoodsAddress = {
  street?: string;
  houseNumber?: string;
  zipcode?: string;
  cityTown?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export type ProductCarbonFootprint = {
  calculationMethod: Set<PCFCalculationMethod | string>;
  co2eq: number;
  referenceValueForCalculation: ReferenceValueForCalculation | string;
  quantityOfMeasureForCalculation: number;
  lifeCyclePhase: LifeCyclePhases;
  goodsAddressHandover: GoodsAddress;
  publicationDate?: Date;
  expirationDate?: Date;
}

export type TransportCarbonFootprint = {
  calculationMethod: TCFCalculationMethod | string;
  co2eq: number;
  referenceValueForCalculation: ReferenceValueForCalculation | string;
  quantityOfMeasureForCalculation: number;
  processesForGreenhouseGasEmissionInATransportService: ProcessForGreenhouseGasEmissionInATransportService;
  goodsTransportAddressTakeover: GoodsAddress;
  goodsTransportAddressHandover: GoodsAddress;
  publicationDate?: Date;
  expirationDate?: Date;
}
