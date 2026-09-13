package com.ecommerce.order.outbox;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OutboxRepository extends JpaRepository<OutboxMessage, Long> {

    List<OutboxMessage> findTop50ByStatusOrderByCreatedAtAsc(OutboxStatus status);

    List<OutboxMessage> findByAggregateIdAndTopic(String aggregateId, String topic);

    List<OutboxMessage> findByStatus(OutboxStatus status);

    List<OutboxMessage> findTop50ByOrderByIdDesc();
}
