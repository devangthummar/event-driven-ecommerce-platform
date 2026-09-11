package com.ecommerce.order.config;

import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;

import java.util.Map;

/**
 * Test-only KafkaTemplate: provides an in-memory KafkaTemplate that accepts
 * messages without actually sending them to a broker.
 */
@TestConfiguration
public class TestKafkaConfig {

    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        // Use a producer factory with dummy config — messages will fail to send
        // but the bean exists so autowiring succeeds in tests.
        ProducerFactory<String, Object> pf = new DefaultKafkaProducerFactory<>(
                Map.of(
                        ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:1",
                        ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class,
                        ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class
                )
        );
        return new KafkaTemplate<>(pf);
    }
}
