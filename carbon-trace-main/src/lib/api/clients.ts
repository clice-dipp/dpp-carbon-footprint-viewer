import createClient from 'openapi-fetch'
import apiConfig from '@/lib/apiConfig'
import { type paths as registryPaths } from '@/lib/api/AssetAdministrationShellRegistry.d'
import { type paths as repositoryPaths } from '@/lib/api/AssetAdministrationShellRepository.d'
import { type paths as submodelPaths } from '@/lib/api/SubmodelRepository.d'
import { type paths as additionalsPath } from '@/lib/api/AssetAdditionals.d'

function newClients() {
  const hasAssetAdditionals = (apiConfig.assetAdministrationShellAdditionalsUrl.trim() || null) !== null;
  return {
    registry: createClient<registryPaths>({ baseUrl: apiConfig.assetAdministrationShellRegistryUrl }),
    repository: createClient<repositoryPaths>({ baseUrl: apiConfig.assetAdministrationShellRepositoryUrl }),
    submodel: createClient<submodelPaths>({ baseUrl: apiConfig.assetAdministrationShellSubmodelRepositoryUrl }),
    hasAssetAdditionals,
    assetAdditionals: hasAssetAdditionals ? createClient<additionalsPath>({ baseUrl: apiConfig.assetAdministrationShellAdditionalsUrl }) : null,
  }
}
const clients = newClients();

export default clients;
export function updateClients() {
  const newer = newClients();
  for (const [name, client] of Object.entries(newer)) {
    clients[name] = client;
  }
}
