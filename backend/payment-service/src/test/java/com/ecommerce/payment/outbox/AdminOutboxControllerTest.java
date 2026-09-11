package com.ecommerce.payment.outbox;

import com.ecommerce.payment.controller.AdminOutboxController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminOutboxControllerTest {

    @Mock
    private OutboxService outboxService;

    @Mock
    private OutboxRepository outboxRepository;

    private AdminOutboxController adminOutboxController;

    @BeforeEach
    void setUp() {
        adminOutboxController = new AdminOutboxController(outboxService);
    }

    @Test
    void testRetryFailedOutboxMessages_Success() {
        when(outboxService.retryFailedOutboxMessages()).thenReturn(5);

        ResponseEntity<Map<String, Object>> response = adminOutboxController.retryFailedOutboxMessages();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("retriedCount")).isEqualTo(5);
        verify(outboxService, times(1)).retryFailedOutboxMessages();
    }

    @Test
    void testOutboxService_RetryFailedOutboxMessages() {
        OutboxMessage failedMsg = OutboxMessage.builder()
                .id(3L)
                .aggregateType("PAYMENT")
                .aggregateId("303")
                .eventType("PaymentSuccessEvent")
                .topic("payment-success-events")
                .partitionKey("303")
                .payload("{}")
                .status(OutboxStatus.FAILED)
                .retryCount(5)
                .build();

        OutboxService realOutboxService = new OutboxService(outboxRepository, null);
        when(outboxRepository.findByStatus(OutboxStatus.FAILED)).thenReturn(List.of(failedMsg));

        int count = realOutboxService.retryFailedOutboxMessages();

        assertThat(count).isEqualTo(1);
        assertThat(failedMsg.getStatus()).isEqualTo(OutboxStatus.PENDING);
        assertThat(failedMsg.getRetryCount()).isEqualTo(0);
        verify(outboxRepository, times(1)).save(failedMsg);
    }
}
