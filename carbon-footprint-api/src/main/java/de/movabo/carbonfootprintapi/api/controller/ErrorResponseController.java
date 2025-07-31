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
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponseException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.NoSuchElementException;

/**
 * Pass through for exceptions coming from other controllers (so NotFoundRedirectController does not catch them)
 */
@ControllerAdvice
public class ErrorResponseController implements ErrorController {

    @ExceptionHandler(ErrorResponseException.class)
    public final ResponseEntity<ApiError> handleException(ErrorResponseException exception) throws ErrorResponseException {
        return new ResponseEntity<>(ApiError.fromErrorResponseException(exception), exception.getHeaders(), exception.getStatusCode());
    }
}