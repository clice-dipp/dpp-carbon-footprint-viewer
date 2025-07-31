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

import type {
  CarbonFootprintType,
  ProductCarbonFootprint,
  TransportCarbonFootprint
} from '@/lib/model/CarbonFootprintType'
import { LifeCyclePhases } from '@/lib/lifeCycleUtil'
import _ from 'lodash'
import type IdTree from '@/lib/model/IdTree'
import { IRDI, IRI } from '@/lib/model/semanticIds'
import { ensure } from '@/lib/util'
import { DateTime } from 'luxon'
import { ErrorClient } from '@/lib/ErrorDataHandler'


export function parseCarbonFootprintAddress(idTree: IdTree) {
  return {
    street: idTree.oneOrUndefined(IRDI.FOOTPRINT.STREET, 'Street')?.stringValue,
    houseNumber: idTree.oneOrUndefined(IRDI.FOOTPRINT.HOUSE_NUMBER, 'HouseNumber')?.stringValue,
    zipcode: idTree.oneOrUndefined(IRDI.FOOTPRINT.ZIPCODE, ['ZipCode', 'Zipcode'])?.stringValue,
    cityTown: idTree.oneOrUndefined(IRDI.FOOTPRINT.CITY_TOWN, 'CityTown')?.stringValue,
    country: idTree.oneOrUndefined(IRDI.FOOTPRINT.COUNTRY, 'Country')?.stringValue,
    latitude: idTree.oneOrUndefined(IRDI.FOOTPRINT.LATITUDE, 'Latitude')?.valueAs(parseFloat),
    longitude: idTree.oneOrUndefined(IRDI.FOOTPRINT.LONGITUDE, 'Longitude')?.valueAs(parseFloat),
  }
}


export function toCarbonFootprintData(footprint: IdTree | IdTree[], carbonFootprint?: CarbonFootprintType) {
  carbonFootprint = carbonFootprint || {
    product: [],
    transport: [],
  }
  if (Array.isArray(footprint)) {
    for (const fp of footprint) {
      toCarbonFootprintData(fp, carbonFootprint);
    }
    return carbonFootprint;
  }
  for (const pcf of footprint.all([
    IRI.CARBON_FOOTPRINT.PRODUCT['0/9'],
    IRI.CARBON_FOOTPRINT.PRODUCT['1/0'],
  ], "ProductCarbonFootprint")) {
    carbonFootprint.product.push({
      calculationMethod: new Set([ensure(pcf.one(IRDI.PCF.CALCULATION_METHOD, "PCFCalculationMethod").stringValue)]),
      co2eq: pcf.one(IRDI.PCF.CO2EQ, "PCFCO2eq").valueAs(parseFloat) || 0,
      referenceValueForCalculation: ensure(pcf.one(IRDI.PCF.REFERENCE_VALUE_FOR_CALCULATION, "PCFReferenceValueForCalculation").stringValue),
      quantityOfMeasureForCalculation: pcf.one(IRDI.PCF.QUANTITY_OF_MEASURE_FOR_CALCULATION, "PCFQuantityOfMeasureForCalculation").valueAs(parseFloat),
      lifeCyclePhase: pcf.oneOrUndefined(IRDI.PCF.LIFE_CYCLE_PHASE, "PCFLifeCyclePhase")?.valueAs(v => new LifeCyclePhases(v)) || new LifeCyclePhases(), // TODO: Perhaps enforce lifeCycle phase because it's required by specification
      goodsAddressHandover: parseCarbonFootprintAddress(pcf.one(IRDI.PCF.GOODS_ADDRESS_HANDOVER, 'PCFGoodsAddressHandover')),
      publicationDate: pcf.oneOrUndefined(IRI.CARBON_FOOTPRINT.PUBLICATION_DATE, "PublicationDate")?.valueAs((v) => DateTime.fromISO(v).toJSDate()),
      expirationDate: pcf.oneOrUndefined(IRI.CARBON_FOOTPRINT.EXPIRATION_DATE, "ExpirationDate")?.valueAs((v) => DateTime.fromISO(v).toJSDate()),
    });
  }
  let hasProcessesError = false;
  for (const tcf of footprint.all([
    IRI.CARBON_FOOTPRINT.TRANSPORT['0/9'],
    IRI.CARBON_FOOTPRINT.TRANSPORT['1/0'],
  ], "TransportCarbonFootprint")) {
    carbonFootprint.transport.push({
      calculationMethod: ensure(tcf.one(IRDI.TCF.CALCULATION_METHOD, "TCFCalculationMethod").stringValue),
      co2eq: tcf.one(IRDI.TCF.CO2EQ, "TCFCO2eq").valueAs(parseFloat) || 0,
      referenceValueForCalculation: ensure(tcf.one(IRDI.TCF.REFERENCE_VALUE_FOR_CALCULATION, "TCFReferenceValueForCalculation").stringValue),
      quantityOfMeasureForCalculation: tcf.one(IRDI.TCF.QUANTITY_OF_MEASURE_FOR_CALCULATION, "TCFQuantityOfMeasureForCalculation").valueAs(parseFloat),
      processesForGreenhouseGasEmissionInATransportService: tcf.one(IRDI.TCF.PROCESSES_FOR_GREENHOUSE_GAS_EMISSION_IN_A_TRANSPORT_SERVICE, "TCFProcessesForGreenhouseGasEmissionInATransportService").as((v) => {
        const value = v.data?.value;
        if (!value) {
          ErrorClient.add({
            message: `The asset does not specify whether its calculations encompass Well-to-Tank, Tank-to-Wheel, or both`,
            details: 'The value of TCFProcessesForGreenhouseGasEmissionInATransportService does not exist, therefore the analysis handles the missing value as Well-to-Wheel'
          });
          console.warn("Value of TCFProcessesForGreenhouseGasEmissionInATransportService does not exist: Assuming multiple values and thus WTW");
          return "WTW - Well-to-Wheel";
        }
        if (value.startsWith("WTT")) {
          return "WTT - Well-to-Tank";
        }
        if (value.startsWith("TTW")) {
          return "TTW - Tank-to-Wheel";
        }
        if (value.startsWith("WTW")) {
          return "WTW - Well-to-Wheel";
        }
        throw new Error(`TCFProcessesForGreenhouseGasEmissionInATransportService '${value}' is unknown`)
      }),
      goodsTransportAddressTakeover: parseCarbonFootprintAddress(tcf.one(IRDI.TCF.GOODS_TRANSPORT_ADDRESS_TAKEOVER, 'TCFGoodsTransportAddressTakeover')),
      goodsTransportAddressHandover: parseCarbonFootprintAddress(tcf.one(IRDI.TCF.GOODS_TRANSPORT_ADDRESS_HANDOVER, 'TCFGoodsTransportAddressHandover')),
      publicationDate: tcf.oneOrUndefined(IRI.CARBON_FOOTPRINT.PUBLICATION_DATE, "PublicationDate")?.valueAs((v) => DateTime.fromISO(v).toJSDate()),
      expirationDate: tcf.oneOrUndefined(IRI.CARBON_FOOTPRINT.EXPIRATION_DATE, "ExpirationDate")?.valueAs((v) => DateTime.fromISO(v).toJSDate()),
    })
  }
  return carbonFootprint;
}


export default class CarbonFootprint implements CarbonFootprintType {
  readonly coveredLifeCyclePhases: LifeCyclePhases;

  readonly product: ProductCarbonFootprint[]

  readonly transport: TransportCarbonFootprint[]

  constructor(
    product: ProductCarbonFootprint[] | Omit<CarbonFootprintType, 'coveredLifeCyclePhases'>,
    transport?: TransportCarbonFootprint[]
  ) {
    if (!Array.isArray(product)) {
      transport = product.transport;
      product = product.product;
    } else if (transport === undefined) {
      throw Error(`transport is undefined`)
    }
    this.product = product;
    this.transport = transport;
    this.coveredLifeCyclePhases = LifeCyclePhases.merged(
      ...this.product.map(l => l.lifeCyclePhase)
    )
  }

  get productCo2eq() {
    return _.sum(this.product.map((p) => p.co2eq));
  }

  get transportCo2eq() {
    return _.sum(this.transport.map((t) => t.co2eq));
  }

  get totalCo2eq() {
    return this.productCo2eq + this.transportCo2eq;
  }

  public static fromIdTree(idTree: IdTree | IdTree[]) {
    return new CarbonFootprint(toCarbonFootprintData(idTree));
  }
}
