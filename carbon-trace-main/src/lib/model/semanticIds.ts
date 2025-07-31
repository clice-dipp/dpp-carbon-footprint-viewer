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

export const NAMEPLATE = Object.freeze({
  2: 'https://admin-shell.io/zvei/nameplate/2/0/Nameplate',
  1: 'https://admin-shell.io/zvei/nameplate/1/0/Nameplate',
  ZVEI: 'https://www.hsu-hh.de/aut/aas/nameplate',
  CONTACT_INFORMATION: 'https://admin-shell.io/zvei/nameplate/1/0/ContactInformations/ContactInformation',
  PHYSICAL_ADDRESS: 'https://www.hsu-hh.de/aut/aas/physicaladdress',
});

export const IRDI = Object.freeze({
  MANUFACTURER_NAME: '0173-1#02-AAO677#002',
  STREET: '0173-1#02-AAO128#002',
  ZIPCODE: '0173-1#02-AAO129#002',
  CITY: '0173-1#02-AAO132#002',
  STATE_COUNTY: '0173-1#02-AAO133#002',
  NATIONAL_CODE: '0173-1#02-AAO134#002',
  COUNTRY_CODE: '0173-1#02-AAO730#001',
  FOOTPRINT: {
    STREET: '0173-1#02-ABH956#001',
    HOUSE_NUMBER: '0173-1#02-ABH957#001',
    ZIPCODE: '0173-1#02-ABH958#001',
    CITY_TOWN: '0173-1#02-ABH959#001',
    COUNTRY: '0173-1#02-AAO259#005',
    LATITUDE: '0173-1#02-ABH960#001',
    LONGITUDE: '0173-1#02-ABH961#001',
  },
  PCF: {
    CALCULATION_METHOD: '0173-1#02-ABG854#002',
    CO2EQ: '0173-1#02-ABG855#001',
    REFERENCE_VALUE_FOR_CALCULATION: '0173-1#02-ABG856#001',
    QUANTITY_OF_MEASURE_FOR_CALCULATION: '0173-1#02-ABG857#001',
    LIFE_CYCLE_PHASE: '0173-1#02-ABG858#001',
    GOODS_ADDRESS_HANDOVER: '0173-1#02-ABI497#001',
  },
  TCF: {
    CALCULATION_METHOD: '0173-1#02-ABG859#002',
    CO2EQ: '0173-1#02-ABG860#001',
    REFERENCE_VALUE_FOR_CALCULATION: '0173-1#02-ABG861#002',
    QUANTITY_OF_MEASURE_FOR_CALCULATION: '0173-1#02-ABG862#001',
    PROCESSES_FOR_GREENHOUSE_GAS_EMISSION_IN_A_TRANSPORT_SERVICE: '0173-1#02-ABG863#002',
    GOODS_TRANSPORT_ADDRESS_TAKEOVER: '0173-1#02-ABI499#001',
    GOODS_TRANSPORT_ADDRESS_HANDOVER: '0173-1#02-ABI498#001',
  }
});

export const IRI = Object.freeze({
  HIERARCHY: {
    ARCHE_TYPE: 'https://admin-shell.io/idta/HierarchicalStructures/ArcheType/1/0',
    STRUCTURE: 'https://admin-shell.io/idta/HierarchicalStructures/1/0/Submodel',
    ENTRY: 'https://admin-shell.io/idta/HierarchicalStructures/EntryNode/1/0',
    NODE: 'https://admin-shell.io/idta/HierarchicalStructures/Node/1/0',
    HAS_PART: 'https://admin-shell.io/idta/HierarchicalStructures/HasPart/1/0',
    IS_PART_OF: 'https://admin-shell.io/idta/HierarchicalStructures/IsPartOf/1/0',
    BULK_COUNT: 'https://admin-shell.io/idta/HierarchicalStructures/BulkCount/1/0',
  },
  CARBON_FOOTPRINT: {
    "0/9": 'https://admin-shell.io/idta/CarbonFootprint/CarbonFootprint/0/9',
    "1/0": 'https://admin-shell.io/idta/CarbonFootprint/CarbonFootprint/1/0',
    PRODUCT: {
      "0/9": 'https://admin-shell.io/idta/CarbonFootprint/ProductCarbonFootprint/0/9',
      "1/0": 'https://admin-shell.io/idta/CarbonFootprint/ProductCarbonFootprint/1/0',
    },
    TRANSPORT: {
      "0/9": 'https://admin-shell.io/idta/CarbonFootprint/TransportCarbonFootprint/0/9',
      "1/0": 'https://admin-shell.io/idta/CarbonFootprint/TransportCarbonFootprint/1/0'
    },
    PUBLICATION_DATE: 'https://admin-shell.io/idta/CarbonFootprint/PublicationDate/1/0',
    EXPIRATION_DATE: 'https://admin-shell.io/idta/CarbonFootprint/ExpirationnDate/1/0',
  },
})

export const GENERIC = Object.freeze({
  STREET: 'https://www.hsu-hh.de/aut/aas/street',
  ZIPCODE: 'https://www.hsu-hh.de/aut/aas/postalcode',
  CITY: 'https://www.hsu-hh.de/aut/aas/city',
  STATE_COUNTY: 'https://www.hsu-hh.de/aut/aas/statecounty',
})
