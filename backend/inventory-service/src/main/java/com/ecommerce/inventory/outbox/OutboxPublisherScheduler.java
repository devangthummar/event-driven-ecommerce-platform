package com.ecommerce.inventory.outbox;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxPublisherScheduler {

    private final OutboxRepository outboxRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Scheduled(fixedDelay = 1000)
    public void publishPendingOutboxMessages() {
        List<OutboxMessage> pendingMessages = outboxRepository.findTop50ByStatusOrderByCreatedAtAsc(OutboxStatus.PENDING);
        if (pendingMessages.isEmpty()) {
            return;
        }

        for (OutboxMessage message : pendingMessages) {
            processMessage(message);
        }
    }

    @Transactional
    public void processMessage(OutboxMessage message) {
        try {
            kafkaTemplate.send(message.getTopic(), message.getPartitionKey(), message.getPayload())
                    .whenComplete((result, ex) -> {
                        if (ex == null) {
                            message.setStatus(OutboxStatus.PUBLISHED);
                            message.setPublishedAt(LocalDateTime.now());
                            outboxRepository.save(message);
                            log.info("Successfully published outbox message id={} to topic={}", message.getId(), message.getTopic());
                        } else {
                            message.setRetryCount(message.getRetryCount() + 1);
                            if (message.getRetryCount() >= 5) {
                                message.setStatus(OutboxStatus.FAILED);
                                log.error("Outbox message id={} reached max retries, marking FAILED: {}", message.getId(), ex.getMessage());
                            } else {
                                log.warn("Kafka publish attempt {} failed for outbox message id={}: {}",
                                        message.getRetryCount(), message.getId(), ex.getMessage());
                            }
                            outboxRepository.save(message);
                        }
                    });
        } catch (Exception e) {
            message.setRetryCount(message.getRetryCount() + 1);
            if (message.getRetryCount() >= 5) {
                message.setStatus(OutboxStatus.FAILED);
            }
            outboxRepository.save(message);
            log.error("Failed to dispatch outbox message id={}: {}", message.getId(), e.getMessage());
        }
    }
}
