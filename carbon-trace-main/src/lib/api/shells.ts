import { cached } from '@/lib/storage'
import apiConfig from '@/lib/apiConfig';
import clients from '@/lib/api/clients'
import type { components } from '@/lib/api/AssetAdministrationShellRepository'



export class Shells {
  static attachmentUrl(url: string) {
    const baseUrl = apiConfig.preferSubmodelRepository ? apiConfig.assetAdministrationShellRepositoryUrl : apiConfig.assetAdministrationShellSubmodelRepositoryUrl;
    return baseUrl + url;
  }

  @cached
  static async submodelReferences(aasIdentifier: string): Promise<string[]> {
    aasIdentifier = btoa(aasIdentifier);
    const { data, error } = await clients.repository
        .GET("/shells/{aasIdentifier}/submodel-refs", { params: { path: { aasIdentifier }}})
    if (error) {
      throw error;
    }
    const d = data as components["schemas"]["GetReferencesResult"];
    console.assert(!!d.paging_metadata, "paging_metadata not implemented but required")
    const submodelIds: string[] = [];
    if (!d.result) {
      return [];
    }
    for (const reference of d.result) {
      for (const { type, value } of reference.keys) {
        if (type.toLowerCase() === "submodel") {
          submodelIds.push(value)
        }
      }
    }
    return submodelIds;
  }


  @cached
  static async submodel(aasIdentifier: string, submodelIdentifier: string): Promise<components["schemas"]["Submodel"]> {
    aasIdentifier = btoa(aasIdentifier);
    submodelIdentifier = btoa(submodelIdentifier);
    const config = {
      params: {
        path: {
          aasIdentifier,
          submodelIdentifier
        }
      }
    }
    let get;
    if (apiConfig.preferSubmodelRepository) {
      get = clients.submodel.GET("/submodels/{submodelIdentifier}", config);
    } else {
      get = clients.repository.GET("/shells/{aasIdentifier}/submodels/{submodelIdentifier}", config);
    }
    const { data, error } = await get;
    if (error) {
      throw error;
    }
    return data;
  }

  @cached
  static async submodelByIdShort(aasIdentifier: string, idShort: string): Promise<components["schemas"]["Submodel"] | null> {
    const submodels = await Shells.submodelReferences(aasIdentifier);
    const promises: Promise<components["schemas"]["Submodel"]>[] = submodels.map((s) => Shells.submodel(aasIdentifier, s));
    const results = await Promise.all(promises);
    for (const result of results) {
      if (result.idShort === idShort) {
        return result;
      }
    }
    return null;
  }

  static async* submodelsBySemanticId(aasIdentifier: string, semanticIds: string | Iterable<string>): AsyncGenerator<components["schemas"]["Submodel"]> {
    const ids = new Set((typeof semanticIds === "string" ? [semanticIds] : semanticIds));
    const submodels = await Shells.submodelReferences(aasIdentifier);
    const promises: Promise<components["schemas"]["Submodel"]>[] = submodels.map((s) => Shells.submodel(aasIdentifier, s));
    for (const promise of promises) {
      // eslint-disable-next-line no-await-in-loop
      const result = await promise;
      if (result.semanticId?.keys.some(id => ids.has(id.value))) {
        yield result;
      }
    }
  }

  @cached
  static async submodelElementByIdShort(submodelPromise: Promise<components["schemas"]["Submodel"]> | null, idShort: string): Promise<components["schemas"]["SubmodelElement"] | null> {
    idShort = idShort.toLowerCase();
    const submodel = await submodelPromise;
    if (!submodel || !submodel.submodelElements) {
      return null;
    }
    for (const element of submodel.submodelElements) {
      if (element.idShort !== undefined && element.idShort.toLowerCase() === idShort) {
        return element;
      }
    }
    return null;
  }

  @cached
  static async submodelElementAttachmentUrlByIdShort(aasIdentifier: string, submodelIdShort: string, idShortPath: string): Promise<string | null> {
    const submodel = await Shells.submodelByIdShort(aasIdentifier, submodelIdShort);
    if (!submodel) {
      return null;
    }
    const submodelIdentifier = btoa(submodel.id);
    aasIdentifier = btoa(aasIdentifier)
    if (apiConfig.preferSubmodelRepository) {
      return Shells.attachmentUrl(`/submodels/${submodelIdentifier}/submodel-elements/${idShortPath}/attachment`)
    }
    return Shells.attachmentUrl(`/shells/${aasIdentifier}/submodels/${submodelIdentifier}/submodel-elements/${idShortPath}/attachment`)
  }

  @cached
  static async thumbnail(aasIdentifier: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = Shells.attachmentUrl(`/shells/${btoa(aasIdentifier)}/asset-information/thumbnail`);
      img.onload = () => resolve(img.src);
      img.onerror = () => {
        Shells.submodelElementAttachmentUrlByIdShort(aasIdentifier, "Identification", "TypThumbnail")
          .then((url) => { resolve(url) })
          .catch(reject);
      }
    })
  }

  @cached
  static async shell(aasIdentifier: string): Promise<components["schemas"]["AssetAdministrationShell"]> {
    aasIdentifier = btoa(aasIdentifier);
    const { data, error } = await clients.repository.GET(`/shells/{aasIdentifier}`, { params: { path: { aasIdentifier } }});
    if (error) {
      throw error;
    }
    return data;
  }

  @cached
  static async externalShell(url: string): Promise<components["schemas"]["AssetAdministrationShell"][]> {
    if (!clients.assetAdditionals) {
      console.error("assetAdditionalsClient is not available because it was not set as environment variable during build.")
      throw new Error("assetAdditionalsClient is not available because it was not set as environment variable during build.")
    }
    url = btoa(url)
    const { data, error } = await clients.assetAdditionals.GET(`/external-shells/{url}`, { params: { path: { url } }});
    if (error) {
      throw error;
    }
    return data as components["schemas"]["AssetAdministrationShell"][];
  }

  /**
   * Array = externally loaded, might be more than one shell.
   * @param aasIdentifiersOrUrl
   * @param urlPrefix
   * @param aasPrefix
   */
  @cached
  static async multiSourceShells(aasIdentifiersOrUrl: string[], urlPrefix?: string, aasPrefix?: string):
    Promise<(components["schemas"]["AssetAdministrationShell"][] | components["schemas"]["AssetAdministrationShell"])[]>
  {
    if (!urlPrefix && !aasPrefix) {
      console.error("At least one of the prefixes must be set to differentiate urls and aas identifiers")
      throw new Error("At least one of the prefixes must be set to differentiate urls and aas identifiers")
    }
    return (await Promise.all(
      aasIdentifiersOrUrl.map((source) => {
        if ((!urlPrefix || source.startsWith(urlPrefix)) && (!aasPrefix || !source.startsWith(aasPrefix))) {
          return Shells.externalShell(atob(source.substring((urlPrefix || "").length)));
        } else if ((!aasPrefix || source.startsWith(aasPrefix)) && (!urlPrefix || !source.startsWith(urlPrefix))) {
          return Shells.shell(atob(source.substring((aasPrefix || "").length)));
        }
        console.warn("No or both prefixes matched.");
        return [];
      })
    )).filter((a) => !Array.isArray(a) || a.length)
  }
}

export default Shells;
