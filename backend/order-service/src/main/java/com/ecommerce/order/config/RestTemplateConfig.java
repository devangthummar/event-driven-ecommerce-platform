package com.ecommerce.order.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Configuration
public class RestTemplateConfig {

    @Value("${product.service.connect-timeout-ms:2000}")
    private int connectTimeoutMs;

    @Value("${product.service.read-timeout-ms:5000}")
    private int readTimeoutMs;

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        // Fail fast when Product Service is unreachable instead of waiting forever.
        requestFactory.setConnectTimeout(connectTimeoutMs);
        // Bound how long a single Product Service response may take.
        requestFactory.setReadTimeout(readTimeoutMs);

        RestTemplate restTemplate = new RestTemplate(requestFactory);
        restTemplate.setInterceptors(
                List.of(new AuthorizationPropagationInterceptor())
        );
        return restTemplate;
    }
}
