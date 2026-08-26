package com.ecommerce.payment.service;

import com.ecommerce.payment.dto.request.CreatePaymentRequest;
import com.ecommerce.payment.dto.request.ProcessPaymentRequest;
import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.event.PaymentRequestEvent;

public interface PaymentService {

    PaymentResponse createPayment(CreatePaymentRequest request);

    PaymentResponse getPaymentByTransactionId(String transactionId);

    PaymentResponse processPayment(ProcessPaymentRequest request);

    PaymentResponse processPaymentIdempotent(PaymentRequestEvent event);
}