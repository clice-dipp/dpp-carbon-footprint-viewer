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

package de.movabo.carbonfootprintapi;

import de.movabo.carbonfootprintapi.cli.ParsedArguments;
import de.movabo.carbonfootprintapi.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import org.apache.commons.cli.ParseException;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.tomcat.util.buf.EncodedSolidusHandling;
import org.jetbrains.annotations.NotNull;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.config.annotation.*;

import java.util.Collections;

@SpringBootApplication
@OpenAPIDefinition(
    info = @Info(
            contact = @Contact(
                    name = "Moritz Bock",
                    email = "mvb1996@gmail.com"
            ),
            description = "Backend for the generation of Carbon Footprints from AAS- and AASX-files.",
            title = "AAS(X) Carbon Footprint API",
            version = "0.0.1"
    )
)
public class CarbonFootprintApiApplication implements ApplicationRunner {
    private static final Logger logger = LogManager.getLogger(CarbonFootprintApiApplication.class);
    private final ParsedArguments arguments;

    public CarbonFootprintApiApplication(ParsedArguments arguments) {
        this.arguments = arguments;
    }

    /**
     * Start the CarbonFootprintAPI
     * @param args cli arguments
     */
    public static void main(String[] args) throws ParseException {
        ParsedArguments arguments = new ParsedArguments(args);
        SpringApplication app = new SpringApplication(CarbonFootprintApiApplication.class);
        app.setDefaultProperties(Collections
                .singletonMap("server.port", arguments.getPort()));
        app.run(args);
    }

    /**
     * Add following web mvc configurations:
     *  - CORS
     *  - Static files
     *  - / to index.html mapping for static files
     * @return Configurer with above-mentioned settings
     */
    @Bean
    public WebMvcConfigurer configureWebMvc(OpenApiConfig bp) {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(@NotNull CorsRegistry registry) {
                if (arguments.getCors() != null) {
                    logger.info(String.format("Allowing access (cors) to %s/** from %s", bp.getApiPrefix(), arguments.getCors()));
                    registry.addMapping(bp.getApiPrefix() + "/**")
                            .allowedOrigins(arguments.getCors())
                            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                            .allowedHeaders("*")
                            .allowCredentials(true);
                } else {
                    logger.info("CORS access disabled");
                }
            }

            @Override
            public void addResourceHandlers(@NotNull ResourceHandlerRegistry registry) {
                if (arguments.getStaticResources() != null) {
                    registry
                            .addResourceHandler("/**")
                            .addResourceLocations("file:" + arguments.getStaticResources());
                    registry.addResourceHandler("/")
                            .addResourceLocations("file:" + arguments.getStaticResources() + "/index.html");
                }
            }

            @Override
            public void configurePathMatch(@NotNull PathMatchConfigurer configurer) {
                configurer.addPathPrefix(bp.getApiPrefix(), c -> c.isAnnotationPresent(RestController.class));
            }
        };
    }

    /**
     * Allow encoded slashes in API urls of tomcat
     * @return factory to allow slashes in urls
     */
    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatCustomizer() {
        logger.info("Configuring Tomcat to allow encoded slashes.");
        return factory -> factory.addConnectorCustomizers(connector -> connector.setEncodedSolidusHandling(
                EncodedSolidusHandling.DECODE.getValue()));
    }

    /**
     * Run it!
     * @param args application cli arguments
     */
    @Override
    public void run(ApplicationArguments args) {
    }
}
