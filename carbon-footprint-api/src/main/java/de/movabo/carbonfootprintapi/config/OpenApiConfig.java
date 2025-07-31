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

package de.movabo.carbonfootprintapi.config;

import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.Paths;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import io.swagger.v3.oas.models.servers.Server;
import lombok.Getter;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.media.Schema;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Configuration
public class OpenApiConfig {

    private static final Map<String, Map<String, String>> enumReplacements = Map.of(
            "Extension.valueType", Map.ofEntries(
                    Map.entry("ANY_URI", "xs:anyURI"),
                    Map.entry("BASE64BINARY", "xs:base64Binary"),
                    Map.entry("BOOLEAN", "xs:boolean"),
                    Map.entry("BYTE", "xs:byte"),
                    Map.entry("DATE", "xs:date"),
                    Map.entry("DATE_TIME", "xs:dateTime"),
                    Map.entry("DECIMAL", "xs:decimal"),
                    Map.entry("DOUBLE", "xs:double"),
                    Map.entry("DURATION", "xs:duration"),
                    Map.entry("FLOAT", "xs:float"),
                    Map.entry("GDAY", "xs:gDay"),
                    Map.entry("GMONTH", "xs:gMonth"),
                    Map.entry("GMONTH_DAY", "xs:gMonthDay"),
                    Map.entry("GYEAR", "xs:gYear"),
                    Map.entry("GYEAR_MONTH", "xs:gYearMonth"),
                    Map.entry("HEX_BINARY", "xs:hexBinary"),
                    Map.entry("INT", "xs:int"),
                    Map.entry("INTEGER", "xs:integer"),
                    Map.entry("LONG", "xs:long"),
                    Map.entry("NEGATIVE_INTEGER", "xs:negativeInteger"),
                    Map.entry("NON_NEGATIVE_INTEGER", "xs:nonNegativeInteger"),
                    Map.entry("NON_POSITIVE_INTEGER", "xs:nonPositiveInteger"),
                    Map.entry("POSITIVE_INTEGER", "xs:positiveInteger"),
                    Map.entry("SHORT", "xs:short"),
                    Map.entry("STRING", "xs:string"),
                    Map.entry("TIME", "xs:time"),
                    Map.entry("UNSIGNED_BYTE", "xs:unsignedByte"),
                    Map.entry("UNSIGNED_INT", "xs:unsignedInt"),
                    Map.entry("UNSIGNED_LONG", "xs:unsignedLong"),
                    Map.entry("UNSIGNED_SHORT", "xs:unsignedShort")
            )
    );

    @Getter
    @Value("${api.prefix}")
    private String apiPrefix;

    @Bean
    public OpenApiCustomizer openApiCustomizer() {
        return openApi -> {
            // Add the base path to the server URL
            openApi.setServers(List.of(new Server().url(apiPrefix)));

            // Modify paths to remove the base path
            Paths paths = openApi.getPaths();
            Paths modifiedPaths = new Paths();
            paths.forEach((key, pathItem) -> {
                String modifiedKey = key.replaceFirst(apiPrefix, "");
                modifiedPaths.addPathItem(modifiedKey, pathItem);
            });
            openApi.setPaths(modifiedPaths);

            // Change Enum from UPPER_CASE to CamelCase
            openApi.getComponents().getSchemas().values().forEach(OpenApiConfig::convertEnums);
            // List<Operation> operations = openApi.getPaths().values().stream().map(PathItem::readOperations).flatMap(List::stream).collect(Collectors.toList());
            openApi.getPaths().values().stream()
                    .map(PathItem::readOperations)
                    .flatMap(List::stream)
                    .map(Operation::getResponses)
                    .map(ApiResponses::values)
                    .flatMap(Collection::stream)
                    .map(ApiResponse::getContent)
                    .filter(Objects::nonNull)
                    .map(Content::values)
                    .flatMap(Collection::stream)
                    .map(MediaType::getSchema)
                    .forEach(OpenApiConfig::convertEnums);
        };
    }

    private static void convertEnums(Schema schema) {
        convertEnums("", schema);
    }

    private static void convertEnums(String propertyPath, Schema schema) {
        String currentName = schema.getName() == null ? "" : schema.getName();
        String currentPath = propertyPath.isEmpty() ? currentName : propertyPath + "." + currentName;
        List<?> enumSchema = schema.getEnum();
        if (enumSchema != null) {
            List<String> newEnum;
            Map<String, String> replacements = enumReplacements.getOrDefault(currentPath, null);
            if (replacements != null) {
                newEnum = enumSchema.stream().map(e -> replacements.getOrDefault(e.toString(), convertToCamelCase(e))).collect(Collectors.toList());
            } else {
                newEnum = enumSchema.stream()
                        .map(OpenApiConfig::convertToCamelCase)
                        .collect(Collectors.toList());
            }
            schema.setEnum(newEnum);
        } else {
            Map<String, Schema> subSchemas = schema.getProperties();
            if (subSchemas != null) {
                subSchemas.values().forEach(s -> convertEnums(currentPath, s));
            }
        }
    }

    private static String convertToCamelCase(Object value) {
        return Arrays.stream(value.toString().split("_"))
                .map(word -> word.charAt(0) + word.substring(1).toLowerCase())
                .collect(Collectors.joining());
    }
}