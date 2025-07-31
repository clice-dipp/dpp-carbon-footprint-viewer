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

import { isString } from '@/lib/util'
import IdTree from '@/lib/model/IdTree'
import { GENERIC, IRDI, NAMEPLATE } from '@/lib/model/semanticIds'

export default class Address {
  manufacturerName?: string

  street?: string

  zipcode?: string

  city?: string

  stateCounty?: string

  countryCode?: string

  constructor(idTree: IdTree) {
    const nameplate = idTree
      .any([NAMEPLATE['2'], NAMEPLATE['1'], NAMEPLATE.ZVEI], 'Nameplate')
    const contact = nameplate
      ?.any([NAMEPLATE.CONTACT_INFORMATION, NAMEPLATE.PHYSICAL_ADDRESS], ['ContactInformation', 'PhysicalAddress'])

    this.manufacturerName = nameplate?.any(IRDI.MANUFACTURER_NAME, 'ManufacturerName')?.langValue
    this.street = contact?.any([IRDI.STREET, GENERIC.STREET], 'Street')?.langValue
    this.zipcode = contact?.any([IRDI.ZIPCODE, GENERIC.ZIPCODE], ['Zipcode', 'PostalCode', 'Zip'])?.langValue
    this.city = contact?.any([IRDI.CITY, GENERIC.CITY], ['CityTown', 'City'])?.langValue
    this.stateCounty = contact?.any([IRDI.STATE_COUNTY, GENERIC.STATE_COUNTY], 'StateCounty')?.langValue
    this.countryCode = contact?.any([IRDI.NATIONAL_CODE, IRDI.COUNTRY_CODE], ['NationalCode', 'CountryCode'])?.langValue
  }

  isComplete() {
    return isString(this.street, this.zipcode, this.city, this.countryCode);
  }

  addressString(recipient: string | undefined = undefined, delimiter: string = ', '): string | undefined {
    if (!this.isComplete()) {
      console.warn('Cannot construct address, missing values.')
      return undefined
    }
    if (recipient === undefined) {
      recipient = this.manufacturerName
    }
    return (recipient ? recipient + delimiter : '')
      + this.street + delimiter
      + this.zipcode + ' ' + this.city + delimiter
      + (this.stateCounty ? this.stateCounty + delimiter : '')
      + this.countryCode!.toUpperCase()
  }

  toString() {
    return this.addressString()
  }
}
