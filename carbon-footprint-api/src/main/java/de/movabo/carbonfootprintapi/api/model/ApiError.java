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

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.web.ErrorResponseException;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.Instant;
import java.time.LocalTime;


/**
 * Stub for correct typing of ErrorResponseException or parsing it into such ApiError
 * @see org.springframework.web.ErrorResponseException
 */
@Data
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ApiError {
    private String timestamp;
    private int status;
    private String error;
    private String trace;
    private String message;
    private String path;

    /**
     * Parse an ErrorResponseException to an API error
     * @param ex exception to parse
     * @return Error filled with the contents of the exception
     */
    public static ApiError fromErrorResponseException(ErrorResponseException ex) {
        StringWriter text = new StringWriter();
        ex.printStackTrace(new PrintWriter(text));
        return new ApiError(
                Instant.ofEpochMilli(ex.getHeaders().getDate()).toString(),
                ex.getStatusCode().value(),
                ex.getBody().getTitle(),
                text.toString(),
                ex.getMessage(),
                ex.getStackTrace()[0].toString()
        );
    }
}
