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

import de.movabo.carbonfootprintapi.cli.ParsedArguments;
import org.apache.commons.lang3.tuple.ImmutablePair;
import org.apache.commons.lang3.tuple.ImmutableTriple;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.commons.lang3.tuple.Triple;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.eclipse.digitaltwin.aas4j.v3.dataformat.aasx.AASXDeserializer;
import org.eclipse.digitaltwin.aas4j.v3.dataformat.core.DeserializationException;
import org.eclipse.digitaltwin.aas4j.v3.dataformat.xml.XmlDeserializer;
import org.eclipse.digitaltwin.aas4j.v3.dataformat.json.JsonDeserializer;
import org.eclipse.digitaltwin.aas4j.v3.model.*;
import org.eclipse.digitaltwin.aas4j.v3.model.impl.DefaultAssetAdministrationShellDescriptor;
import org.eclipse.digitaltwin.aas4j.v3.model.impl.DefaultEnvironment;
import org.jetbrains.annotations.NotNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.*;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipException;
import java.util.zip.ZipFile;

/**
 * Preload and provide assets (.aas- and .aasx-files) from the hard drive
 * This provider handles submodels as not globally unique (even though they should be!)
 */
@Service
public class InMemoryAssetProvider implements AssetsProvider {
    private static final Logger logger = LogManager.getLogger(InMemoryAssetProvider.class);
    /**
     * Mapping of globalAssetIds to its corresponding AssetAdministrationShell and its source file
     * e.g. {@code assetShells.get(globalAssetId)}
     */
    private final HashMap<String, Triple<AssetAdministrationShell, Boolean, File>> assetShells;
    /**
     * Mapping of GlobalAssetIds to mappings of contained SubmodelIds to the submodel
     * e.g. {@code assetSubmodels.get(globalAssetId).get(submodelId)}
     */
    private final HashMap<String, HashMap<String, Submodel>> assetSubmodels;

    /**
     * Mappings of an assets ID to its idShort
     * (short ids may not be unique across different shells, so a reverse mapping is not feasible)
     */
    private final HashMap<String, String> idToIdShort;

    /**
     * Create an empty asset provider
     */
    public InMemoryAssetProvider() {
        assetShells = new HashMap<>();
        assetSubmodels = new HashMap<>();
        idToIdShort = new HashMap<>();
    }

    /**
     * Load assets from the arguments ({@code arguments.getAasFiles()} and {@code arguments.getAasxFiles})
     * @param arguments Parse cli arguments containing the aas(x) files to load
     * @see InMemoryAssetProvider#addAssets(File, AssetType)
     */
    @Autowired
    public InMemoryAssetProvider(ParsedArguments arguments) throws IOException, InvalidFormatException, DeserializationException {
        this();
        for (File aas: arguments.getAasFiles()) {
            logger.info("Loading " + aas.getAbsolutePath());
            try {
                addAssetAdministrationShell(aas);
            } catch (Exception e) {
                logger.error(String.format("An error occurred when loading an aas file %s, stack trace:", aas.getAbsolutePath()), e);
            }
            addAssetAdministrationShell(aas);
        }
        for (File aasx: arguments.getAasxFiles()) {
            logger.info("Loading " + aasx.getAbsolutePath());
            try {
                addAssets(aasx, InMemoryAssetProvider.AssetType.AASX);
            } catch (Exception e) {
                logger.error(String.format("An error occurred when loading an aasx file %s, stack trace:", aasx.getAbsolutePath()), e);
            }
        }
    }

    @Override
    public boolean hasAssetAdministrationShell(String globalAssetId) {
        return getAssetAdministrationShell(globalAssetId) != null;
    }

    @Override
    public AssetAdministrationShell getAssetAdministrationShell(String globalAssetId) {
        var shell = assetShells.get(globalAssetId);
        if (shell == null) {
            return null;
        }
        return shell.getLeft();
    }

    /**
     * Make an administration shell available to further provide it
     * @param shell Shell to add to the provider
     */
    public void addAssetAdministrationShell(AssetAdministrationShell shell, File file, boolean hide) {
        String globalId = shell.getAssetInformation().getGlobalAssetId();
        String id = shell.getId();
        String idShort = shell.getIdShort();
        if (globalId == null) {
            globalId = "autogenerated_" + id + "_" + idShort + "_" + UUID.randomUUID();
            shell.getAssetInformation().setGlobalAssetId(globalId);
        }
        this.idToIdShort.put(id, idShort);
        logger.info("Adding asset with ID " + id + " / global ID " + globalId);
        assert !assetShells.containsKey(id);
        assert !assetShells.containsKey(globalId);
        ImmutableTriple<AssetAdministrationShell, Boolean, File> shellData = new ImmutableTriple<>(shell, hide, file);
        assetShells.put(globalId, shellData);
        assetShells.put(id, shellData);
    }

    /**
     * Make multiple administration shells available to further provide them
     * @param shells Shells to add to the provider
     */
    public void addAssetAdministrationShells(Iterable<AssetAdministrationShell> shells, File file, boolean hide) {
        for (AssetAdministrationShell shell: shells) {
            addAssetAdministrationShell(shell, file, hide);
        }
    }

    public boolean canAddAssets() {
        return true;
    }

    public Collection<String> addAssets(InputStream asset, AssetType type, File file, boolean hide) throws DeserializationException, IOException, InvalidFormatException {
        Environment env = null;
        String suffix = ".aasx";
        byte[] bytes = asset.readAllBytes();
        if (type == AssetType.JSON || type == AssetType.AUTO) {
            try {
                logger.info("Parsing as JSON");
                env = new JsonDeserializer().read(new ByteArrayInputStream(bytes), DefaultEnvironment.class);  // TODO: untested, does it work?
                suffix = ".json";
            } catch (DeserializationException e) {
                if (type == AssetType.JSON) {
                    throw e;
                } else {
                    logger.info("Could not auto-parse AAS as JSON", e);
                }
            }
        }
        if (env == null && (type == AssetType.XML || type == AssetType.AUTO)) {
            try {
                logger.info("Parsing as XML");
                env = new XmlDeserializer().read(new ByteArrayInputStream(bytes));
                suffix = ".xml";
            } catch (DeserializationException e) {
                if (type == AssetType.XML) {
                    throw e;
                } else {
                    logger.info("Could not auto-parse AAS as XML", e);
                }
            }
        }
        if (env == null && (type == AssetType.AASX || type == AssetType.AUTO)) {
            try {
                logger.info("Parsing as AASX");
                env = new AASXDeserializer(new ByteArrayInputStream(bytes)).read();
            } catch (Exception e) {
                if (type == AssetType.AASX) {
                    throw e;
                } else {
                    logger.info("Could not auto-parse AAS as AASX", e);
                    throw new DeserializationException("InputStream could not be deserialized to a valid asset.");
                }
            }
        }
        if (file == null) {
            Path path = Files.createTempFile("aas", suffix);
            Files.write(path, bytes);
            file = path.toFile();
        }
        if (env == null) {
            throw new DeserializationException("Error deserializing environment");
        }
        addEnvironment(env, file, hide);
        return env.getAssetAdministrationShells().stream().map(Identifiable::getId).collect(Collectors.toSet());
    }

    /**
     * Add the assets from an .aas or .aasx-file to the provider
     * @param file .aas or .aasx-files to provide the assets from
     * @param type as which type this files should be handled, AssetType.AUTO for auto-detection.
     * @throws IOException Errors while loading the .aas or .aasx file
     * @throws DeserializationException Error while parsing the .aas file (in case of .aasx, the contained .aas file)
     * @throws InvalidFormatException Error when parsing the .aas-file as .xml
     */
    public void addAssets(File file, AssetType type) throws IOException, InvalidFormatException, DeserializationException {
        logger.info("Adding file " + file.getAbsolutePath());
        addAssets(new FileInputStream(file), type, file);
    }

    /**
     * Add all shells contained in an aas-environment.
     * @param env AAS-environment to add the shells from
     */
    public void addEnvironment(Environment env, File file, boolean hide) {
        this.addAssetAdministrationShells(env.getAssetAdministrationShells(), file, hide);
        this.addSubmodels(env.getAssetAdministrationShells(), env.getSubmodels());
    }

    /**
     * Add all shells from an .aas or .aasx-file.
     * @see InMemoryAssetProvider#addAssets(File, AssetType)
     */
    public void addAssetAdministrationShell(File file) throws IOException, InvalidFormatException, DeserializationException {
        addAssets(file, AssetType.AUTO);
    }

    @Override
    public Map<String, String> availableAssetAdministrationShellIds() {
        return this.idToIdShort.entrySet().stream().filter(e -> !this.assetShells.get(e.getKey()).getMiddle()).collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    @Override
    public Iterable<AssetAdministrationShellDescriptor> getAssetAdministrationShellDescriptors() {
        Set<AssetAdministrationShellDescriptor> descriptors = new HashSet<>();
        for (var shellData: this.assetShells.values()) {
            if (shellData.getMiddle()) {
                // Shell is hidden!
                continue;
            }
            AssetAdministrationShell shell = shellData.getLeft();
            DefaultAssetAdministrationShellDescriptor descriptor = new DefaultAssetAdministrationShellDescriptor();

            descriptor.setAdministration(shell.getAdministration());
            descriptor.setDescription(shell.getDescription());
            descriptor.setIdShort(shell.getIdShort());
            descriptor.setId(shell.getId());
            descriptor.setDisplayName(shell.getDisplayName());

            AssetInformation shellInfo = shell.getAssetInformation();
            descriptor.setAssetKind(shellInfo.getAssetKind());
            descriptor.setAssetType(shellInfo.getAssetType());
            descriptor.setGlobalAssetId(shellInfo.getGlobalAssetId());
            descriptor.setSpecificAssetIds(shellInfo.getSpecificAssetIds());
            descriptors.add(descriptor);
        }
        return descriptors;
    }

    @Override
    public Iterable<Reference> getAssetAdministrationShellSubmodelReferences(@NotNull String globalAssetId) {
        AssetAdministrationShell asset = this.getAssetAdministrationShell(globalAssetId);
        if (asset == null) {
            return null;
        }
        return asset.getSubmodels();
    }

    @Override
    public ImmutablePair<byte[], String> getSubmodelElementAttachment(@NotNull String globalAssetId, @NotNull String submodelId, @NotNull String idShortPath) {
        SubmodelElement element = this.getSubmodelElement(globalAssetId, submodelId, idShortPath);
        byte[] data;
        String contentType;
        switch (element) {
            case org.eclipse.digitaltwin.aas4j.v3.model.File file -> {
                data = this.getAttachment(globalAssetId, file.getValue());
                contentType = file.getContentType();
            }
            case Resource resource -> {
                data = this.getAttachment(globalAssetId, resource.getPath());
                contentType = resource.getContentType();
            }
            case Blob blob -> {
                data = blob.getValue();
                contentType = blob.getContentType();
            }
            case null, default -> {
                return null;
            }
        }
        return new ImmutablePair<>(data, contentType);
    }

    @Override
    public SubmodelElement getSubmodelElement(@NotNull String globalAssetId, @NotNull String submodelId, @NotNull String idShortPath) {
        Submodel submodel = this.assetSubmodels.get(globalAssetId).get(submodelId);
        // Split at every "." and "[<number>]", but keep the "[<number>]" in the array as own entry.
        // e.g. "this.is[5]a.test => {"this", "is", "[5]", "a", "test"}
        String[] names = idShortPath.split("(\\.|(?<=\\[[0-9]+\\])|(?=\\[[0-9]+\\]))");
        if (names.length == 0) {
            return null;
        }
        SubmodelElement element = submodel.getSubmodelElements().stream().filter(e -> e.getIdShort().equals(names[0])).findFirst().orElse(null);

        for (int i = 1; i < names.length; i++) {
            String current = names[i];
            if (element == null) {
                return null;
            }
            if (current.isEmpty()) {
                logger.warn(String.format("idShortPath %s has empty element, returning null", idShortPath));
                return null;
            }
            if (current.startsWith("[")) {
                if (element instanceof SubmodelElementList) {
                    int index = Integer.parseInt(current.substring(1, current.length()-1));
                    try {
                        element = ((SubmodelElementList) element).getValue().get(index);
                    } catch (IndexOutOfBoundsException e) {
                        return null;
                    }
                } else {
                    logger.warn(String.format("Expected %s (from %s) to be an SubmodelElementList, not %s, returning null", current, idShortPath, element.getClass()));
                    return null;
                }
            } else if (element instanceof SubmodelElementCollection) {
                element = ((SubmodelElementCollection) element).getValue().stream().filter(e -> e.getIdShort().equals(current)).findFirst().orElse(null);
            } else {
                logger.warn(String.format("Expected %s (from %s) to be an SubmodelElementCollection, not %s, returning null", current, idShortPath, element.getClass()));
                return null;
            }
        }
        return element;
    }

    //public byte[] getAttachment(@NotNull String globalAssetId, @NotNull String idShortPath) {
    //    AssetAdministrationShell shell = this.assetShells.get(globalAssetId).getLeft();
    //    Submodel model = getSubmodel(globalAssetId, "a");
    //    model.
    //}

    public byte[] getAttachment(@NotNull String globalAssetId, @NotNull String path) {
        File file = this.assetShells.get(globalAssetId).getRight();
        if (!file.exists() || !file.isFile()) {
            logger.error("File does not exist or is not a valid file.");
            return null;
        }

        try (ZipFile zipFile = new ZipFile(file)) {
            if (path.startsWith("/")) {
                path = path.substring(1);
            }
            ZipEntry zipEntry = zipFile.getEntry(path);

            if (zipEntry == null) {
                logger.error("File not found in the zip archive.");
                return null;
            }

            try (InputStream inputStream = zipFile.getInputStream(zipEntry)) {
                return inputStream.readAllBytes();
            }
        } catch (IOException e) {
            logger.error("An error occurred while processing the zip file: " + e.getMessage());
        }
        return null;
    }

    public byte[] getAttachment(@NotNull String globalAssetId, @NotNull Resource resource) {
        return this.getAttachment(globalAssetId, resource.getPath());
    }

    public Pair<byte[], String> getThumbnail(@NotNull String globalAssetId) {
        var shell = this.assetShells.get(globalAssetId);
        if (shell == null) {
            return null;
        }
        Resource thumbnailData = shell.getLeft().getAssetInformation().getDefaultThumbnail();
        if (thumbnailData == null) {
            return null;
        }

        byte[] thumbnail = this.getAttachment(globalAssetId, thumbnailData);
        if (thumbnail == null) {
            return null;
        }
        return new ImmutablePair<>(thumbnail, thumbnailData.getContentType());
    }

    /**
     * Add submodels and bind them to specific assets
     * @param assets assets to bind the submodels to (i.e. which contain these submodels)
     * @param submodels submodels to add
     */
    public void addSubmodels(@NotNull List<AssetAdministrationShell> assets, @NotNull List<Submodel> submodels) {
        for (AssetAdministrationShell asset: assets) {
            addSubmodels(asset, submodels);
        }
    }

    /**
     * Add submodels and bind them to a specific asset
     * @param asset asset to bind them to (i.e. which contains these submodels)
     * @param submodels submodels to add
     */
    public void addSubmodels(@NotNull AssetAdministrationShell asset, @NotNull List<Submodel> submodels) {
        for (Submodel submodel: submodels) {
            addSubmodel(asset, submodel);
        }
    }

    /**
     * Add a submodel and bind it to a specific asset
     * @param asset asset to bind it to (i.e. which contains this submodel)
     * @param submodel submodel to add
     */
    public void addSubmodel(@NotNull AssetAdministrationShell asset, @NotNull Submodel submodel) {
        String id = asset.getId();
        String globalId = asset.getAssetInformation().getGlobalAssetId();
        addSubmodel(id, submodel);
        if (!id.equals(globalId)) {
            addSubmodel(globalId, submodel);
        }
    }

    /**
     * Add a submodel and bind it to an asset with a specific globalAssetId
     * @param globalAssetId globalAssetId to bind it to (i.e. whose corresponding asset contains this submodel)
     * @param submodel submodel to add
     */
    public void addSubmodel(@NotNull String globalAssetId, @NotNull Submodel submodel) {
        String id = submodel.getId();
        HashMap<String, Submodel> submodels = assetSubmodels.computeIfAbsent(globalAssetId, k -> new HashMap<>());
        if (submodels.containsKey(id)) {
            String assetId = this.getAssetAdministrationShell(globalAssetId).getId();
            if (submodel.getKind() == ModellingKind.TEMPLATE) {
                logger.warn("The submodel TEMPLATE with ID %s is already registered for asset %s (id=%s). Skipping and assuming that the registered template is the same.");
                return;
            } else {
                throw new IllegalStateException(String.format("The submodel INSTANCE with ID %s is already registered for asset %s (id=%s).", id, globalAssetId, assetId));
            }
        }
        submodels.put(id, submodel);
    }

    @Override
    public boolean hasSubmodel(@NotNull String globalAssetId, @NotNull String submodelId) {
        HashMap<String, Submodel> assetSubmodels = this.assetSubmodels.get(globalAssetId);
        if (assetSubmodels == null) {
            return false;
        }
        return assetSubmodels.containsKey(submodelId);
    }

    @Override
    public Submodel getSubmodel(@NotNull String globalAssetId, @NotNull String submodelId) {
        return assetSubmodels.get(globalAssetId).get(submodelId);
    }

    @Override
    public Set<String> availableSubmodelIds(@NotNull String globalAssetId) {
        return assetSubmodels.get(globalAssetId).keySet();
    }
}
