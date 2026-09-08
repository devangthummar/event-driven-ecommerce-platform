package com.ecommerce.order.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthorizationPropagationInterceptorTest {

    private final AuthorizationPropagationInterceptor interceptor =
            new AuthorizationPropagationInterceptor();

    @AfterEach
    void tearDown() {
        RequestContextHolder.resetRequestAttributes();
    }

    private static class StubHttpRequest implements HttpRequest {
        private final HttpHeaders headers = new HttpHeaders();

        StubHttpRequest() {
            headers.add(HttpHeaders.ACCEPT, "application/json");
        }

        @Override
        public HttpHeaders getHeaders() {
            return headers;
        }

        @Override
        @Deprecated
        public HttpMethod getMethod() {
            return HttpMethod.GET;
        }

        @Override
        public URI getURI() {
            return URI.create("http://product-service:8081/api/products/1");
        }
    }

    // ─── A. Propagates the inbound user's Bearer token ───

    @Test
    void intercept_propagatesInboundAuthorizationHeader() throws Exception {
        MockHttpServletRequest inbound = new MockHttpServletRequest();
        inbound.addHeader("Authorization", "Bearer abc.def.ghi");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(inbound));

        StubHttpRequest outgoing = new StubHttpRequest();
        ClientHttpRequestExecution execution = mock(ClientHttpRequestExecution.class);
        when(execution.execute(outgoing, new byte[0])).thenReturn(mock(ClientHttpResponse.class));

        interceptor.intercept(outgoing, new byte[0], execution);

        assertEquals("Bearer abc.def.ghi", outgoing.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
        verify(execution, times(1)).execute(outgoing, new byte[0]);
    }

    // ─── B. Does not overwrite an explicit Authorization header on the outbound call ───

    @Test
    void intercept_doesNotOverwriteExistingOutboundAuthorization() throws Exception {
        MockHttpServletRequest inbound = new MockHttpServletRequest();
        inbound.addHeader("Authorization", "Bearer abc.def.ghi");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(inbound));

        StubHttpRequest outgoing = new StubHttpRequest();
        outgoing.getHeaders().add(HttpHeaders.AUTHORIZATION, "Bearer explicit.token");
        ClientHttpRequestExecution execution = mock(ClientHttpRequestExecution.class);
        when(execution.execute(outgoing, new byte[0])).thenReturn(mock(ClientHttpResponse.class));

        interceptor.intercept(outgoing, new byte[0], execution);

        assertEquals("Bearer explicit.token", outgoing.getHeaders().getFirst(HttpHeaders.AUTHORIZATION));
    }

    // ─── C. Adds nothing when there is no inbound HTTP request context ───

    @Test
    void intercept_withoutRequestContext_addsNoHeader() throws Exception {
        RequestContextHolder.resetRequestAttributes();

        StubHttpRequest outgoing = new StubHttpRequest();
        ClientHttpRequestExecution execution = mock(ClientHttpRequestExecution.class);
        when(execution.execute(outgoing, new byte[0])).thenReturn(mock(ClientHttpResponse.class));

        interceptor.intercept(outgoing, new byte[0], execution);

        assertFalse(outgoing.getHeaders().containsKey(HttpHeaders.AUTHORIZATION));
        verify(execution, times(1)).execute(outgoing, new byte[0]);
    }

    // ─── D. Only propagates Bearer tokens (never rewrites other auth schemes) ───

    @Test
    void intercept_withNonBearerInboundHeader_addsNothing() throws Exception {
        MockHttpServletRequest inbound = new MockHttpServletRequest();
        inbound.addHeader("Authorization", "Basic dXNlcjpwYXNz");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(inbound));

        StubHttpRequest outgoing = new StubHttpRequest();
        ClientHttpRequestExecution execution = mock(ClientHttpRequestExecution.class);
        when(execution.execute(outgoing, new byte[0])).thenReturn(mock(ClientHttpResponse.class));

        interceptor.intercept(outgoing, new byte[0], execution);

        assertFalse(outgoing.getHeaders().containsKey(HttpHeaders.AUTHORIZATION));
    }
}
