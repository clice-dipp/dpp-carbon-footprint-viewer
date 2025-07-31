import lang from '@/lib/i18n'
import type { components as registryComponents } from '@/lib/api/AssetAdministrationShellRegistry'
import type { components as repositoryComponents } from '@/lib/api/AssetAdministrationShellRepository'
import clients from './clients';
import {
  type ShellDescriptionsLoaderInterface,
  type ShellDescriptionSmallInterface,
  type ShellDescriptionsSmallInterface
} from './shellTypes'
import { ErrorClient } from '@/lib/ErrorDataHandler'

type ShellDescriptor = registryComponents["schemas"]["AssetAdministrationShellDescriptor"];
type Shell = repositoryComponents["schemas"]["AssetAdministrationShell"];

export function toDescriptionSmall(info: ShellDescriptor | Shell): ShellDescriptionSmallInterface | undefined {
  if (!(info as ShellDescriptor).globalAssetId && !(info as Shell).assetInformation?.globalAssetId) {
    ErrorClient.add({ message: "Shell not loaded", details: `Shell '${info.idShort}' could not be loaded because it does not provide a globalAssetId which is required to work with this site.`})
    throw new Error("globalAssetId may not be empty");
  }
  const globalAssetId = (info as ShellDescriptor).globalAssetId || (info as Shell).assetInformation.globalAssetId!;
  const specificAssetIds = new Set(
    (info as ShellDescriptor).specificAssetIds?.map(i => i.value)
    || (info as Shell).assetInformation.specificAssetIds?.map(i => i.value))
  return {
    name: lang(info.displayName) || info.id,
    globalAssetId,
    specificAssetIds,
    id: info.id,
    idShort: info.idShort,
    assetKind: (info as ShellDescriptor).assetKind || (info as Shell).assetInformation.assetKind,
    description: lang(info.description)
  }
}

export function toDescriptionsSmall(infoArray: (ShellDescriptor | Shell)[])  {
  return infoArray.map(i => {
    try {
      return toDescriptionSmall(i);
    } catch (e) {
      return undefined;
    }
  }).filter(i => i !== undefined) as ShellDescriptionSmallInterface[];
}

export const descriptionsFromStandardApi: ShellDescriptionsLoaderInterface = (cursor) => {
  const query = cursor ? { cursor } : {};
  return new Promise<ShellDescriptionsSmallInterface>((resolve, reject) => {
    clients.registry.GET("/shell-descriptors", {
      params: { query }
    }).then((p) => {
      if (p.data) {
        // Parse data
        resolve({
          cursor: p.data.paging_metadata?.cursor,
          shells: toDescriptionsSmall(p.data.result || [])
        });
      } else if (p.error) {
        reject(p.error);
      }
    }).catch((reason) => {
      reject(reason);
    })
  });
}

export async function allDescriptionsFromApi(): Promise<ShellDescriptionSmallInterface[]> {
  let newShells = await descriptionsFromStandardApi();
  const allShells = newShells.shells;
  while (newShells) {
    if (!newShells.cursor) {
      break;
    }
    // Wee need the new cursor for the next loop iteration
    // eslint-disable-next-line no-await-in-loop
    newShells = await descriptionsFromStandardApi(newShells.cursor);
    allShells.push(...newShells.shells);
  }
  return allShells;
}
