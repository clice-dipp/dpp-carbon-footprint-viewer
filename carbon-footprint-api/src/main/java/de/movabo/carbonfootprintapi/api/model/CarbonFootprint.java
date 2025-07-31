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

package de.movabo.carbonfootprintapi.api.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.apache.commons.lang3.tuple.Pair;
import org.eclipse.digitaltwin.aas4j.v3.model.Submodel;

import java.util.ArrayList;

@Data
@AllArgsConstructor
public class CarbonFootprint {
    /**
     * The footprint for the asset with assetId
     */
    private Submodel footprint;
    /**
     * assetId of the referenced asset
     */
    private String assetId;
    /**
     * List of other assetIds (0th item) contained in this asset and more information about their connection (1st item)
     */
    private ArrayList<Pair<String, String[]>> contains;
}
