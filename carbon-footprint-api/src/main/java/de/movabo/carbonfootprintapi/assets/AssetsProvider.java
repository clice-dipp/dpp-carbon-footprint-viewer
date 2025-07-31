/**
*    Copyright 2025 Moritz Bock and Software GmbH (previously Software AG)
*    
*    Licensed under the Apache License, Version 2.0 (the "License");
*    you may not use this file except in compliance with the License.
*    You may obtain a copy of the License at
*    
*      http://www.apache.org/licenses/LICENSE-2.0
*    
*    Unless required by applicable law or agreed to in writing, software
*    distributed under the License is distributed on an "AS IS" BASIS,
*    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*    See the License for the specific language governing permissions and
*    limitations under the License.
*/

package de.movabo.carbonfootprintapi.assets;

import org.apache.commons.lang3.NotImplementedException;
import org.apache.commons.lang3.tuple.ImmutablePair;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.eclipse.digitaltwin.aas4j.v3.dataformat.core.DeserializationException;
import org.eclipse.digitaltwin.aas4j.v3.model.*;
import org.jetbrains.annotations.NotNull;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collection;
import java.util.Map;
import java.io.File;
import java.util.Set;

/**
 *
 */
public interface AssetsProvider {

    /**
     * Filetypes of Assets
     */
    enum AssetType {
        JSON, AASX, XML, AUTO
    }
    /**
     * Check if the provider is able to provide a submodel
     * @param submodelId ID of the model
     * @return whether the model is registered in this provider.
     */
    boolean hasSubmodel(String globalAssetId, String submodelId);

    /**
     * Get the Submodel with the specific model ID.
     * @param submodelId ID of the model
     * @return the model with the specified ID
     */
    Submodel getSubmodel(String globalAssetId, String submodelId);


    /**
     * Get the IDs of all available submodels.
     * @return IDs of all available submodels
     */
    Set<String> availableSubmodelIds(String globalAssetId);

    /**
     * Check if the provider is able to provide an asset
     * @param globalAssetId Asset to check if providable
     * @return Whether the provider is able to provide the asset.
     */
    boolean hasAssetAdministrationShell(String globalAssetId);

    /**
     * Get the AssetAdministrationShell with the specific Asset ID.
     * @param globalAssetId ID of the Asset to get
     * @return AdministrationShell of the requested asset.
     */
    AssetAdministrationShell getAssetAdministrationShell(String globalAssetId);

    /**
     * Get the IDs (key) and a description (value; e.g. the shortId) of all available assets.
     * The description shall not be used in any other way then to show the user a human-readable
     * description or name of the asset
     *
     * @return IDs and description of all available assets which are not hidden
     */
    Map<String, String> availableAssetAdministrationShellIds();


    /**
     * Get Shell Descriptors of all available AssetAdministrationShells.
     *
     * @return Shell Descriptors as per the API Specification https://industrialdigitaltwin.org/wp-content/uploads/2023/04/IDTA-01002-3-0_SpecificationAssetAdministrationShell_Part2_API.pdf
     *         of all assets which are not hidden
     */
    Iterable<AssetAdministrationShellDescriptor> getAssetAdministrationShellDescriptors();

    /**
     * Get the submodel references of an asset.
     *
     * @param globalAssetId ID of the asset to get the refs from
     * @return Submodel references to the submodels of the asset
     */
    Iterable<Reference> getAssetAdministrationShellSubmodelReferences(@NotNull String globalAssetId);


    /**
     * Get a submodel element by its id short path
     * @param globalAssetId ID of the asset which provides the submodel
     * @param submodelId ID of the model containing the idShortPaths data
     * @param idShortPath Path to the desired element
     * @return Submodel element with the specified path
     */
    SubmodelElement getSubmodelElement(@NotNull String globalAssetId, @NotNull String submodelId, @NotNull String idShortPath);

    /**
     * Get the attachment of a submodel element by its id short path
     * @param globalAssetId ID of the asset which provides the submodel
     * @param submodelId ID of the model containing the idShortPaths data
     * @param idShortPath Path to the desired attachment
     * @return Attachment of the specified submodel element and content type
     */
    ImmutablePair<byte[], String> getSubmodelElementAttachment(@NotNull String globalAssetId, @NotNull String submodelId, @NotNull String idShortPath);

    /**
     * Get the thumbnail of the asset
     * @param globalAssetId ID of the asset to get the thumbnail from
     * @return Thumbnail data and content type
     */
    Pair<byte[], String> getThumbnail(@NotNull String globalAssetId);

    /**
     * Whether this provider offers the possibility to add Shells via the addShell method
     * @return whether this provider offers the possibility to add Shells via the addShell method
     */
    default boolean canAddAssets() {
        return false;
    }

    /**
     * Add assets from an input stream
     * @param asset InputStream which contains the asset
     * @param type as which type this files should be handled, AssetType.AUTO for auto-detection.
     * @param file file which belongs to the asset. If null, a temp file will be created
     * @param hide Whether this is a private asset and should only be shown when IDs of it or its submodel are
     *             explicitly stated.
     *             (I.e. not listed in results of AssetsProvider#availableAssetAdministrationShellIds or
     *             `AssetsProvider#getAssetAdministrationShellDescriptors)
     * @throws IOException Errors while loading the .aas or .aasx file
     * @throws DeserializationException Error while parsing the .aas file (in case of .aasx, the contained .aas file)
     * @throws InvalidFormatException Error when parsing the .aas-file as .xml
     * @return Ids of the assets contained in the file (usually one)
     */
    default Collection<String> addAssets(InputStream asset, AssetType type, File file, boolean hide) throws DeserializationException, IOException, InvalidFormatException {
        throw new NotImplementedException("addAsset is not implemented.");
    }

    /**
     * Add public assets from an input stream
     * (hide is false)
     * @see AssetsProvider#addAssets(InputStream, AssetType, File, boolean)
     */
    default Collection<String> addAssets(InputStream asset, AssetType type, File file) throws DeserializationException, IOException, InvalidFormatException {
        return this.addAssets(asset, type, file, false);
    }
}
