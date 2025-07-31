import type { components } from '@/lib/api/SubmodelRepository'

export type AssetKind = components["schemas"]["AssetKind"];
export type SubmodelKind = components["schemas"]["ModellingKind"];
export type Property = components["schemas"]["Property"];
export type SubmodelElement = components["schemas"]["SubmodelElement"];

type XSUrl = "xs:anyURI"
type XSBlob = "xs:base64Binary" | "xs:byte" | "xs:hexBinary" | "xs:unsignedByte"
type XSBoolean = "xs:boolean"
type XSDate = "xs:date" | "xs:dateTime" | "xs:time"
type XSNumber = "xs:decimal" | "xs:double" | "xs:float" | "xs:int" | "xs:integer" | "xs:long" | "xs:negativeInteger" | "xs:nonNegativeInteger" | "xs:nonPositiveInteger" | "xs:positiveInteger" | "xs:short"
type XSString = "xs:string" | "xs:duration" | "xs:gDay" | "xs:gMonth" | "xs:gMonthDay" | "xs:gYear" | "xs:gYearMonth" | "xs:unsignedInt" | "xs:unsignedLong" | "xs:unsignedShort"
export type XSType = XSUrl | XSBlob | XSBoolean | XSDate | XSNumber | XSString

export type DataType<Type extends XSType> = Type extends XSUrl
  ? URL
  : Type extends XSBlob
  ? Blob
  : Type extends XSBoolean
  ? boolean
  : Type extends XSDate
  ? Date
  : Type extends XSNumber
  ? number
  : Type extends XSString
  ? string
  : undefined;


export interface ShellDescriptionSmallInterface {
  name: string;
  globalAssetId: string;
  id: string;
  idShort?: string;
  assetKind?: AssetKind;
  description?: string;
  specificAssetIds: Set<string>;
}

export interface ShellDescriptionsSmallInterface {
  cursor?: string;
  shells: ShellDescriptionSmallInterface[];
}

export interface ShellDescriptionsLoaderInterface {
  (cursor?: string): Promise<ShellDescriptionsSmallInterface>;
}

export interface SubmodelInterface {
  idShort: string,
  id: string,
}

export interface AssetAddressInterface {
  nationalCode: string,
  cityTown: string,
  company: string,
  department: string,
  street: string,
  zipcode: string,
  poBox: string,
  stateCountry: string,
  nameOfContact: string,
}
