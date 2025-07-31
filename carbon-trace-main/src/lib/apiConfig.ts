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

const apiConfig = {
  // Required AAS API specification endpoints
  assetAdministrationShellRegistryUrl: import.meta.env.VITE_API_ASSET_ADMINISTRATION_SHELL_REGISTRY_URL,
  assetAdministrationShellRepositoryUrl: import.meta.env.VITE_API_ASSET_ADMINISTRATION_SHELL_REPOSITORY_URL,
  assetAdministrationShellSubmodelRepositoryUrl: import.meta.env.VITE_API_SUBMODEL_REPOSITORY_URL,

  // Can also be empty but removes some functionality (e.g. loading from url)
  assetAdministrationShellAdditionalsUrl: import.meta.env.VITE_API_ASSET_ADDITIONALS_URL,

  // Whether to use /submodels/{submodelIdentifier} or /shells/{aasIdentifier}/submodels/{submodelIdentifier}
  preferSubmodelRepository: import.meta.env.VITE_API_PREFER_SUBMODELS_REPOSITORY === "1",
};
export function update(newConfig: Partial<typeof apiConfig>) {
  for (const key of Object.keys(newConfig)) {
    if (newConfig[key] !== undefined) {
      apiConfig[key] = newConfig[key];
    }
  }
  if (typeof apiConfig.preferSubmodelRepository === "string") {
    apiConfig.preferSubmodelRepository = apiConfig.preferSubmodelRepository === "1";
  }
}
export default apiConfig;
