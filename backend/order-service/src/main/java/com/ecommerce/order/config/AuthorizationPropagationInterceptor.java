package com.ecommerce.order.config;

import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.io.IOException;

/**
 * Propagates the authenticated caller's JWT (Authorization: Bearer ...) and the
 * correlation ID from the inbound HTTP request to outbound service-to-service HTTP
 * calls (Order -> Product).
 *
 * <p>Design notes:
 * <ul>
 *   <li>Headers are copied verbatim — never rewritten, never logged.</li>
 *   <li>If the outbound call already carries an Authorization header it is left untouched
 *       (so callers can override propagation explicitly).</li>
 *   <li>If there is no inbound HTTP request context (scheduled task, Kafka consumer,
 *       unit test), no header is added and the call proceeds as-is.</li>
 * </ul>
 */
public class AuthorizationPropagationInterceptor implements ClientHttpRequestInterceptor {

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body,
                                        ClientHttpRequestExecution execution) throws IOException {
        if (!request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
            String authHeader = currentRequestHeader(HttpHeaders.AUTHORIZATION);
            if (authHeader != null) {
                request.getHeaders().set(HttpHeaders.AUTHORIZATION, authHeader);
            }
        }
        // Propagate correlation ID to downstream services so logs can be linked.
        String correlationId = MDC.get(CorrelationIdFilter.CORRELATION_ID_MDC_KEY);
        if (correlationId != null && !request.getHeaders().containsKey(CorrelationIdFilter.CORRELATION_ID_HEADER)) {
            request.getHeaders().set(CorrelationIdFilter.CORRELATION_ID_HEADER, correlationId);
        }
        return execution.execute(request, body);
    }

    private String currentRequestHeader(String headerName) {
        try {
            RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
            if (attributes instanceof ServletRequestAttributes servletAttributes) {
                String value = servletAttributes.getRequest().getHeader(headerName);
                if (headerName.equals(HttpHeaders.AUTHORIZATION)) {
                    if (value != null && value.startsWith("Bearer ")) {
                        return value;
                    }
                    return null;
                }
                return value;
            }
        } catch (IllegalStateException e) {
            // No request bound to the current thread — nothing to propagate.
        }
        return null;
    }
}
