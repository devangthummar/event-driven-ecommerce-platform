package com.ecommerce.order.exception;

/**
 * Thrown when Order Service cannot resolve product data because Product Service
 * is unreachable, timed out, or returned an error status (5xx/4xx). Order creation
 * must fail instead of silently defaulting to an incorrect price.
 */
public class ProductServiceUnavailableException extends RuntimeException {

    public ProductServiceUnavailableException(String message) {
        super(message);
    }

    public ProductServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
