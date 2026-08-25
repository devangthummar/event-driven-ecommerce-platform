package com.ecommerce.payment.service.impl;

import com.ecommerce.payment.dto.request.CreatePaymentRequest;
import com.ecommerce.payment.dto.request.ProcessPaymentRequest;
import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.entity.Payment;
import com.ecommerce.payment.entity.enums.PaymentStatus;
import com.ecommerce.payment.exception.PaymentNotFoundException;
import com.ecommerce.payment.mapper.PaymentMapper;
import com.ecommerce.payment.repository.PaymentRepository;
import com.ecommerce.payment.service.PaymentService;
import com.ecommerce.payment.service.WalletService;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentMapper paymentMapper;
    private final WalletService walletService;

    @Override
    public PaymentResponse createPayment(CreatePaymentRequest request) {

        String transactionId = "TXN-" + UUID.randomUUID();

        Payment payment = Payment.builder()
                .orderId(request.getOrderId())
                .userId(request.getUserId())
                .amount(request.getAmount())
                .paymentStatus(PaymentStatus.PENDING)
                .paymentMethod(request.getPaymentMethod())
                .transactionId(transactionId)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Payment savedPayment = paymentRepository.save(payment);

        return paymentMapper.toPaymentResponse(savedPayment);
    }

    @Override
    public PaymentResponse getPaymentByTransactionId(String transactionId) {

        Payment payment = paymentRepository
                .findByTransactionId(transactionId)
                .orElseThrow(() ->
                        new PaymentNotFoundException(
                                "Payment not found for transaction ID: "
                                        + transactionId
                        ));

        return paymentMapper.toPaymentResponse(payment);
    }


    @Transactional
    @Override
    public PaymentResponse processPayment(ProcessPaymentRequest request) {

        Payment payment = paymentRepository
                .findByTransactionId(request.getTransactionId())
                .orElseThrow(() ->
                        new PaymentNotFoundException(
                                "Payment not found for transaction ID: "
                                        + request.getTransactionId()
                        ));

        if (payment.getPaymentStatus() == PaymentStatus.SUCCESS) {
            return paymentMapper.toPaymentResponse(payment);
        }

        try {

            walletService.deductBalance(
                    payment.getUserId(),
                    payment.getAmount()
            );

            payment.setPaymentStatus(PaymentStatus.SUCCESS);

        } catch (RuntimeException exception) {


            payment.setPaymentStatus(PaymentStatus.FAILED);
        }

        payment.setUpdatedAt(LocalDateTime.now());

        Payment savedPayment = paymentRepository.save(payment);

        return paymentMapper.toPaymentResponse(savedPayment);
    }
}