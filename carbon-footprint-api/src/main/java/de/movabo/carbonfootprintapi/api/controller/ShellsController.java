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

package de.movabo.carbonfootprintapi.api.controller;

import de.movabo.carbonfootprintapi.api.model.ApiError;
import de.movabo.carbonfootprintapi.api.model.PagingResult;
import de.movabo.carbonfootprintapi.assets.AssetsProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.apache.commons.lang3.tuple.ImmutablePair;
import org.apache.commons.lang3.tuple.Pair;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.eclipse.digitaltwin.aas4j.v3.dataformat.core.DeserializationException;
import org.eclipse.digitaltwin.aas4j.v3.model.*;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.*;

import javax.net.ssl.SSLException;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@Tag(
        name = "Asset Controller",
        description = "Get various contents of assets"
)
public class ShellsController {
    private static final Logger logger = LogManager.getLogger(ShellsController.class);

    /**
     * Provider to access asset shells from
     */
    private final AssetsProvider provider;

    private Map<String, Collection<String>> urlToAssetId;

    public ShellsController(AssetsProvider assetProvider) {
        this.provider = assetProvider;
        this.urlToAssetId = new HashMap<>();
    }

    @GetMapping("/external-shells/{url}")
    @Operation(
            description = "Returns a all Asset Administration Shells contained in an environment from a url",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Success: AssetAdministrationShells"
                    ),
                    @ApiResponse(
                            responseCode = "422",
                            description = "File is cannot be parsed (is most likely invalid or no AAS(X)/JSON)",
                            content = @Content(
                                    schema = @Schema(
                                            implementation = ApiError.class
                                    )
                            )
                    ),
                    @ApiResponse(
                            responseCode = "404",
                            description = "File was not found or empty",
                            content = @Content(
                                    schema = @Schema(
                                            implementation = ApiError.class
                                    )
                            )
                    )
            }
    )
    public Collection<AssetAdministrationShell> getExternalShell(
            @Parameter(description = "url where the shell can be downloaded (UTF8-BASE64-URL-encoded)") @PathVariable String url
    ) throws IOException, InterruptedException, InvalidFormatException, DeserializationException {
        String urlDecoded = new String(Base64.getUrlDecoder().decode(url));
        if (this.urlToAssetId.containsKey(urlDecoded)) {
            return this.urlToAssetId.get(urlDecoded).stream().map(provider::getAssetAdministrationShell).collect(Collectors.toSet());
        }
        HttpClient client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.ALWAYS).build();
        HttpRequest request;
        try {
            URI uri = URI.create(urlDecoded);
            request = HttpRequest.newBuilder().uri(uri).build();
        } catch (IllegalArgumentException e) {
            throw new ErrorResponseException(HttpStatus.UNPROCESSABLE_ENTITY);
        }
        HttpResponse<InputStream> response;
        try {
            response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
        } catch (SSLException e) {
            throw new ErrorResponseException(HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (response.statusCode() != 200) {
            throw new ErrorResponseException(HttpStatus.NO_CONTENT);
        }

        InputStream body = response.body();
        Collection<String> ids;
        try {
            ids = provider.addAssets(body, AssetsProvider.AssetType.AUTO, null, true);
        } catch (DeserializationException e) {
            throw new ErrorResponseException(HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if (ids.isEmpty()) {
            throw new ErrorResponseException(HttpStatus.NOT_FOUND);
        }
        this.urlToAssetId.put(urlDecoded, ids);
        return ids.stream().map(provider::getAssetAdministrationShell).filter(Objects::nonNull).collect(Collectors.toSet());
    }

    @GetMapping("/shells/{aasIdentifier}")
    @Operation(
            description = "Returns a specific Asset Administration Shell",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Success: AssetAdministrationShell"
                    ),
                    @ApiResponse(
                            responseCode = "404",
                            description = "Asset Administration Shell with this ID not found",
                            content = @Content(
                                    schema = @Schema(
                                            implementation = ApiError.class
                                    )
                            )
                    )
            }
    )
    public AssetAdministrationShell getShell(
            @Parameter(description = "The Asset Administration Shell’s unique id (UTF8-BASE64-URL-encoded)") @PathVariable String aasIdentifier
    ) {
        String aasDecoded = new String(Base64.getUrlDecoder().decode(aasIdentifier));
        AssetAdministrationShell asset = provider.getAssetAdministrationShell(aasDecoded);
        if (asset == null) {
            throw new ErrorResponseException(HttpStatus.NOT_FOUND);
        }
        return asset;
    }

    // @GetMapping("/shells/{aasIdentifier}/asset-information/thumbnail")
    // @Operation("")

    @GetMapping("/shells/{aasIdentifier}/submodels/{submodelIdentifier}")
    @Operation(
            description = "Returns the Submodel.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Success: Submodel"
                    ),
                    @ApiResponse(
                            responseCode = "404",
                            description = "Submodel with this ID not found.",
                            content = @Content(
                                    schema = @Schema(
                                            implementation = ApiError.class
                                    )
                            )
                    )
            }
    ) // See https://app.swaggerhub.com/apis/Plattform_i40/AssetAdministrationShellRepositoryServiceSpecification/V3.0_SSP-001#/Asset%20Administration%20Shell%20Repository%20API/GetSubmodelById_AasRepository
    public Submodel getShellSubmodel(
            @Parameter(description = "The Asset Administration Shell’s unique id (UTF8-BASE64-URL-encoded)") @PathVariable String aasIdentifier,
            @Parameter(description = "The Submodel’s unique id (UTF8-BASE64-URL-encoded)") @PathVariable String submodelIdentifier
    ) {
        String aasDecoded = new String(Base64.getUrlDecoder().decode(aasIdentifier));
        String submodelDecoded = new String(Base64.getUrlDecoder().decode(submodelIdentifier));
        Submodel submodel = provider.getSubmodel(aasDecoded, submodelDecoded);
        if (submodel == null) {
            throw new ErrorResponseException(HttpStatus.NOT_FOUND);
        }
        return submodel;
    }



    @GetMapping("/shells/{aasIdentifier}/submodels/{submodelIdentifier}/submodel-elements/{idShortPath}")
    @Operation(
            description = "Get the a Submodel Element of a specific idShortPath.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Success: Submodel element."
                    ),
                    @ApiResponse(
                            responseCode = "404",
                            description = "Something along the search was not found.",
                            content = @Content(
                                    schema = @Schema(
                                            implementation = ApiError.class
                                    )
                            )
                    )
            }
    )
    public SubmodelElement getShellSubmodelElement(
            @Parameter(description = "The Asset Administration Shell’s unique id (UTF8-BASE64-URL-encoded)") @PathVariable String aasIdentifier,
            @Parameter(description = "The Submodel’s unique id (UTF8-BASE64-URL-encoded)") @PathVariable String submodelIdentifier,
            @Parameter(description = "idShortPath with ./[]-notation") @PathVariable String idShortPath
    ) {
        String aasDecoded = new String(Base64.getUrlDecoder().decode(aasIdentifier));
        String submodelDecoded = new String(Base64.getUrlDecoder().decode(submodelIdentifier));
        return provider.getSubmodelElement(aasDecoded, submodelDecoded, idShortPath);
    }
    // @GetMapping("/shells/{aasIdentifier}/submodels/{submodelIdentifier}/{idShortPath}/attachment")

    @GetMapping("/shells/{aasIdentifier}/submodel-refs")
    @Operation(
            description = "Returns the Submodel refs of a shell",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Successful: Submodel Refs"
                    ),
                    @ApiResponse(
                            responseCode = "404",
                            description = "AAS not found"
                    )
            }
    )
    public PagingResult<Reference> getSubmodelRefs(
            @Parameter(description = "The Asset Administration Shell’s unique id (UTF8-BASE64-URL-encoded)") @PathVariable String aasIdentifier
    ) {
        String aasDecoded = new String(Base64.getUrlDecoder().decode(aasIdentifier));
        return new PagingResult<>(provider.getAssetAdministrationShellSubmodelReferences(aasDecoded));
    }

    @GetMapping("/shell-descriptors")
    @Operation(
            description = "Returns all Asset Administration Shell Descriptors",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "List of Asset Administration Shell Descriptors"
                    )
            }
    )
    public PagingResult<AssetAdministrationShellDescriptor> getAllAssetAdministrationShellDescriptors() {
        Iterable<AssetAdministrationShellDescriptor> descriptors = provider.getAssetAdministrationShellDescriptors();
        return new PagingResult<>(descriptors);
    }

    @GetMapping("/asset/all")
    @Operation(
            description = "Get the IDs of all available assets"
    )
    public Map<String, String> availableAssets() {
        return provider.availableAssetAdministrationShellIds();
    }

    @GetMapping("/asset/{aasIdentifier}/submodel/all")
    @Operation(
            description = "Get the IDs of all submodels of an asset"
    )
    public Set<String> availableSubmodels(
            @Parameter(description = "The Asset Administration Shell’s unique id (NOT UTF8-BASE64-URL-encoded)") @PathVariable String aasIdentifier
    ) {
        return provider.availableSubmodelIds(aasIdentifier);
    }

    @GetMapping("/asset/{aasIdentifier}/submodel/{submodelId}")
    @Operation(
            description = "Get the submodel of an AssetAdministrationShell by the shells global ID and the submodels ID.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Success: Submodel"
                    ),
                    @ApiResponse(
                            responseCode = "404",
                            description = "Something along the way was not found.",
                            content = @Content(
                                    schema = @Schema(
                                            implementation = ApiError.class
                                    )
                            )
                    )
            }
    )
    public Submodel getSubmodel(
            @Parameter(description = "The Asset Administration Shell’s unique id (UTF8-BASE64-URL-encoded)") @PathVariable String aasIdentifier,
            @PathVariable String submodelId) {
        Submodel submodel = provider.getSubmodel(aasIdentifier, submodelId);
        if (submodel == null) {
            throw new ErrorResponseException(HttpStatus.NOT_FOUND);
        }
        return submodel;
    }

    @GetMapping("/shells/{aasIdentifier}/submodels/{submodelIdentifier}/submodel-elements/{idShortPath}/attachment")
    @Operation(
            description = "Get the Submodel Element Attachment of a specific idShortPath.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Success: Submodel element."
                    ),
                    @ApiResponse(
                            responseCode = "404",
                            description = "Something along the search was not found.",
                            content = @Content(
                                    schema = @Schema(
                                            implementation = ApiError.class
                                    )
                            )
                    )
            }
    )
    public ResponseEntity<Resource> getShellSubmodelElementAttachment(
            @Parameter(description = "The Asset Administration Shell’s unique id (UTF8-BASE64-URL-encoded)") @PathVariable String aasIdentifier,
            @Parameter(description = "The Submodel’s unique id (UTF8-BASE64-URL-encoded)") @PathVariable String submodelIdentifier,
            @Parameter(description = "idShortPath with ./[]-notation") @PathVariable String idShortPath
    ) {
        String aasDecoded = new String(Base64.getUrlDecoder().decode(aasIdentifier));
        String submodelDecoded = new String(Base64.getUrlDecoder().decode(submodelIdentifier));

        ImmutablePair<byte[], String> attachment = provider.getSubmodelElementAttachment(aasDecoded, submodelDecoded, idShortPath);
        byte[] data = attachment.getLeft();
        ByteArrayResource resource = new ByteArrayResource(data);

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_TYPE, attachment.getRight());
        return ResponseEntity.ok().headers(headers).contentLength(data.length).body(resource);
    }

    @GetMapping("/shells/{aasIdentifier}/asset-information/thumbnail")
    @Operation(
            description = "Returns the thumbnail file",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Success: Thumbnail File"
                    ),
                    @ApiResponse(
                            responseCode = "404",
                            description = "Thumbnail does not exist"
                    )
            }
    )
    public ResponseEntity<Resource> getThumbnail(
            @Parameter(description = "The Asset Administration Shell’s unique id (UTF8-BASE64-URL-encoded)") @PathVariable String aasIdentifier
    ) {
        String aasDecoded = new String(Base64.getUrlDecoder().decode(aasIdentifier));
        Pair<byte[], String> thumbnail = provider.getThumbnail(aasDecoded);
        if (thumbnail == null) {
            throw new ErrorResponseException(HttpStatus.NOT_FOUND);
        }
        byte[] image = thumbnail.getLeft();
        ByteArrayResource resource = new ByteArrayResource(image);

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_TYPE, thumbnail.getRight());
        return ResponseEntity.ok().headers(headers).contentLength(image.length).body(resource);
    }
}
