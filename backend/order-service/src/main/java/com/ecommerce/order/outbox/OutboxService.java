package com.ecommerce.order.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class OutboxService {

    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public OutboxMessage saveToOutbox(String aggregateType, String aggregateId, String eventType,
                                     String topic, String partitionKey, Object event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            OutboxMessage message = OutboxMessage.builder()
                    .aggregateType(aggregateType)
                    .aggregateId(aggregateId)
                    .eventType(eventType)
                    .topic(topic)
                    .partitionKey(partitionKey)
                    .payload(payload)
                    .status(OutboxStatus.PENDING)
                    .retryCount(0)
                    .createdAt(LocalDateTime.now())
                    .build();
            OutboxMessage saved = outboxRepository.save(message);
            log.info("Saved OutboxMessage [{}]: id={}, aggregateType={}, aggregateId={}, topic={}",
                    eventType, saved.getId(), aggregateType, aggregateId, topic);
            return saved;
        } catch (Exception e) {
            log.error("Failed to serialize and save outbox message for aggregateId={}: {}",
                    aggregateId, e.getMessage(), e);
            throw new RuntimeException("Outbox serialization failure", e);
        }
    }
}
