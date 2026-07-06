package com.ecommerce.user.config;

import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI userServiceOpenAPI() {

        return new OpenAPI()

                .info(new Info()

                        .title("User Service API")

                        .description(
                                "Authentication and User Management APIs for the Event-Driven E-Commerce Platform.")

                        .version("v1.0")

                        .contact(new Contact()

                                .name("Devang Thummar")

                                .email("devangthummar877@gmail.com"))

                        .license(new License()

                                .name("MIT License")))

                .externalDocs(new ExternalDocumentation()

                        .description("GitHub Repository"));

    }

}