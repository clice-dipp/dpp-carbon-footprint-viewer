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

import org.apache.commons.lang3.tuple.ImmutablePair;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.eclipse.digitaltwin.aas4j.v3.model.*;
import org.eclipse.digitaltwin.aas4j.v3.model.impl.*;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import static java.lang.System.getLogger;

/**
 * Utility methods for handling asset administration shells
 */
public class AasUtil {
    private static final Logger logger = LogManager.getLogger(AasUtil.class);

    /**
     * Check if a submodel represents a CarbonFootprint
     * @param submodel Submodel to check
     * @return whether it is a CarbonFootprint
     */
    public static boolean isCarbonFootprint(Submodel submodel) {
        return submodel.getIdShort().equals("CarbonFootprint");
    }

    /**
     * Get the semantic ID of a submodel
     * @param submodel submodel to get the semantic ID of
     * @return semantic ID of the submodel
     */
    public static String getSemanticId(Submodel submodel) {
        Reference semanticRef = submodel.getSemanticId();
        return getOnlyKeyValue(semanticRef, KeyTypes.GLOBAL_REFERENCE);
    }

    /**
     * Get the value of the only key in existence in the reference
     * @param reference Reference to get the keys value from
     * @param checkKeyType Of which type the key must be. Any if null.
     * @throws IllegalStateException when multiple keys exist or the key is not of checkKeyType
     * @return the value of the key
     */
    public static String getOnlyKeyValue(Reference reference, KeyTypes checkKeyType) {
        List<Key> key = reference.getKeys();
        if (key.size() != 1 || checkKeyType != null && key.get(0).getType() != checkKeyType) {
            throw new IllegalStateException("Wrong key: Expected exactly one key of type " + checkKeyType + ".");
        }
        return key.get(0).getValue();
    }

    /**
     * Get the submodel ID of a reference referencing a submodel
     * @param submodelRef reference referencing a submodel
     * @return submodel ID it is referencing to
     */
    public static String getSubmodelId(Reference submodelRef) {
        return getOnlyKeyValue(submodelRef, KeyTypes.SUBMODEL);
    }

    /**
     * Get all global asset IDs of assets being referenced in a submodel
     * @param submodel submodel to get the asset IDs from
     * @return global asset IDs being referenced in the submodel
     */
    public static Set<String> getGlobalAssetIds(Submodel submodel) {
        HashSet<String> set = new HashSet<>();
        for (SubmodelElement element: submodel.getSubmodelElements()) {
            logger.info("Element: " + element.getIdShort());
            AasUtil.addGlobalAssetIdsFromSubmodelElement(set, element);
        }
        return set;
    }

    /**
     * Get all global asset IDs and a reference chain of assets being referenced in a submodel
     * @param submodel Submodel to get the global asset IDs and reference chains from
     * @return global asset IDs (0th index) and reference chain (1st index)
     */
    public static ArrayList<Pair<String, String[]>> getGlobalAssetIdChains(Submodel submodel) {
        ArrayList<Pair<String, String[]>> idChains = new ArrayList<>();
        for (SubmodelElement element: submodel.getSubmodelElements()) {
            AasUtil.addGlobalAssetIdChainsFromSubmodelElement(idChains, element, new String[]{ element.getIdShort() });
        }
        return idChains;
    }

    /**
     * Create a new array and extend it by one value
     * @param oldArray Old array to extend
     * @param newValue Value to append
     * @return New array with the value added
     */
    private static <T> T[] createExtendedArray(T[] oldArray, T newValue) {
        T[] newArray = Arrays.copyOf(oldArray, oldArray.length+1);
        newArray[oldArray.length] = newValue;
        return newArray;
    }

    /**
     * Add global asset IDs and its reference chains from submodel elements and its children
     * @param list List to add the global asset IDs and its reference chains to
     * @param element Element to search through
     * @param currentChain Current base chain (for recursion)
     */
    private static void addGlobalAssetIdChainsFromSubmodelElement(
            List<Pair<String, String[]>> list,
            SubmodelElement element,
            String[] currentChain
    ) {
        // logger.info(String.format("SubmodelElement (%s): %s", Arrays.toString(currentChain), element.getIdShort()));
        if (element instanceof DefaultEntity entity) {
            if (entity.getEntityType() == EntityType.CO_MANAGED_ENTITY || entity.getEntityType() == EntityType.SELF_MANAGED_ENTITY) {
                // Recursively check sub-elements for global asset ids
                for (SubmodelElement subElement: entity.getStatements()) {
                    addGlobalAssetIdChainsFromSubmodelElement(list, subElement, createExtendedArray(currentChain, subElement.getIdShort()));
                }
                // Add global asset id of this entity
                String id = entity.getGlobalAssetId();
                if (id != null) {
                    list.add(new ImmutablePair<>(id, currentChain));
                } else if (entity.getEntityType() == EntityType.SELF_MANAGED_ENTITY) {
                    logger.warn(String.format("SELF_MANAGED_ENTITY %s does not have a global asset ID.", entity.getIdShort()));
                }
            }
        }
        if (element instanceof DefaultReferenceElement) {
            // Recurse through reference
            Reference reference = ((DefaultReferenceElement) element).getValue();
            addGlobalReferenceValues(list, reference.getKeys(), currentChain);
        }
        if (element instanceof DefaultSubmodelElementCollection || element instanceof DefaultSubmodelElementList) {
            // Recurse through elements
            for (SubmodelElement subElement: getValue(element)) {
                addGlobalAssetIdChainsFromSubmodelElement(list, subElement, createExtendedArray(currentChain, subElement.getIdShort()));
            }
        }
        if (element instanceof DefaultRelationshipElement relationship) {
            // Recurse through relationships
            addGlobalReferenceValues(list, relationship.getFirst().getKeys(), currentChain);
            addGlobalReferenceValues(list, relationship.getSecond().getKeys(), currentChain);
        }
    }


    /**
     * Add global asset IDs from submodel elements and its children
     * @param set Set to add the global asset IDs to
     * @param element Element to search through
     */
    private static void addGlobalAssetIdsFromSubmodelElement(Set<String> set, SubmodelElement element) {
        ArrayList<Pair<String, String[]>> list = new ArrayList<>();
        AasUtil.addGlobalAssetIdChainsFromSubmodelElement(list, element, new String[0]);
        set.addAll(list.stream().map(Pair::getLeft).collect(Collectors.toSet()));
    }

    /**
     * Get the value of a submodel element
     * @param element Element to get the value from
     * @return The submodel elements which represent the value of this submodel element
     * @throws IllegalArgumentException if the element is not of a known type
     */
    private static List<SubmodelElement> getValue(SubmodelElement element) {
        if (element instanceof DefaultSubmodelElementCollection) {
            return ((DefaultSubmodelElementCollection) element).getValue();
        }
        if (element instanceof DefaultSubmodelElementList) {
            return ((DefaultSubmodelElementList) element).getValue();
        }
        throw new IllegalArgumentException("element not of known type");
    }

    /**
     * Add the values of a key to a collection
     * @param collection Collection to add the values to
     * @param keys Keys of the values to add
     * @param chain Reference chain of this key/value
     */
    private static void addGlobalReferenceValues(
            Collection<Pair<String, String[]>> collection,
            Collection<Key> keys,
            String[] chain
    ) {
        addGlobalReferenceValues(collection, keys, id -> new ImmutablePair<>(id, chain));
    }

    /**
     * Add the values of a key to a collection
     * @param collection Collection to add the values to
     * @param keys Keys of the values to add
     */
    private static void addGlobalReferenceValues(
            Collection<String> collection,
            Collection<Key> keys
    ) {
        addGlobalReferenceValues(collection, keys, id -> id);
    }

    /**
     * Add the values of a key to a collection
     * @param collection Collection to add the values to
     * @param keys Keys of the values to add
     * @param parseValue Parser to transform the keys value to the correct type
     */
    private static <X> void addGlobalReferenceValues(
            Collection<X> collection,
            Collection<Key> keys,
            Function<String, X> parseValue
    ) {
        for (Key key: keys) {
            if (key.getType() == KeyTypes.GLOBAL_REFERENCE) {
                collection.add(parseValue.apply(key.getValue()));
            }
        }
    }
}
