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

export const shellDescriptionsKey = Symbol("Descriptions of the Shell available via the API");
export const darkModeKey = Symbol("Whether dark mode is activated");
export const assetIdMapKey = Symbol("Map of a shells id/idShort/globalAssetId/specificId to its other ids")
export const externalShellsKey = Symbol("External, preloaded shells")
export const draggedShellKey = Symbol("Shell currently being dragged via drag and drop")
export const helpBarKey = Symbol("Help Sidebar (hidden when undefined)")
