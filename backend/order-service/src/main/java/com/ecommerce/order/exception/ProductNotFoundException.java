package com.ecommerce.order.exception;

/**
 * Thrown when Order Service cannot create an order because a referenced product
 * does not exist in Product Service (HTTP 404 upstream).
 */
public class ProductNotFoundException extends RuntimeException {

    public ProductNotFoundException(String message) {
        super(message);
    }
}
