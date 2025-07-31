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

import de.movabo.carbonfootprintapi.cli.ParsedArguments;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Redirect error pages to notFoundResource for 404-errors (useful for single page applications)
 */
@Controller
public class NotFoundRedirectController {
    /**
     * Whether to suppress a not found 404 error code and instead return ok 200 code
     */
    private final boolean suppress404;
    private final String notFoundResource;

    public NotFoundRedirectController(ParsedArguments args) {
        suppress404 = args.isSuppress404();
        notFoundResource = args.getNotFoundResource();
    }

    @RequestMapping("/error")
    public Object handleError(HttpServletRequest request, HttpServletResponse response) {
        Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);

        if (status != null) {
            HttpStatus httpStatus = HttpStatus.valueOf(Integer.parseInt(status.toString()));
            if(notFoundResource != null && httpStatus == HttpStatus.NOT_FOUND) {
                response.setStatus(suppress404 ? HttpStatus.OK.value() : httpStatus.value());
                return notFoundResource;
            }
            // Not 404 - return generic response.
            return new ResponseEntity<>("Error " + httpStatus.value() + " - " + httpStatus.getReasonPhrase(), httpStatus);
        }

        // No status?!
        return new ResponseEntity<>("Error 500 - Internal Server Error", HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
