package com.ecommerce.order.exception;

/**
 * Thrown when a status transition is not permitted by the order state machine (e.g. an
 * event tries to move a terminal CANCELLED/DELIVERED order, or a payment success tries
 * to overwrite a CANCELLED order). Mapped to HTTP 409 CONFLICT by the exception handler.
 */
public class InvalidOrderStateTransitionException extends RuntimeException {

    public InvalidOrderStateTransitionException(String message) {
        super(message);
    }
}
