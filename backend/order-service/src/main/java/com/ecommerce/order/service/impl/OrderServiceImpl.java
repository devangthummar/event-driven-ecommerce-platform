package com.ecommerce.order.service.impl;

import com.ecommerce.order.dto.request.CreateOrderRequest;
import com.ecommerce.order.dto.request.OrderItemRequest;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.dto.response.ProductResponse;
import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.OrderItem;
import com.ecommerce.order.entity.enums.OrderStatus;
import com.ecommerce.order.event.OrderCreatedEvent;
import com.ecommerce.order.event.OrderEventItem;
import com.ecommerce.order.exception.InvalidOrderStateTransitionException;
import com.ecommerce.order.exception.OrderException;
import com.ecommerce.order.exception.OrderNotFoundException;
import com.ecommerce.order.exception.ProductNotFoundException;
import com.ecommerce.order.exception.ProductServiceUnavailableException;
import com.ecommerce.order.mapper.OrderMapper;
import com.ecommerce.order.producer.OrderEventProducer;
import com.ecommerce.order.repository.OrderRepository;
import com.ecommerce.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderMapper orderMapper;
    private final OrderEventProducer orderEventProducer;
    private final RestTemplate restTemplate;

    @Value("${product.service.url}")
    private String productServiceUrl;


    @Override
    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request) {

        // Idempotency replay: same authenticated-scope user (request.userId is the
        // existing identity contract) + same key -> return the original order, never a
        // second insert, never a second OrderCreatedEvent.
        String idempotencyKey = request.getIdempotencyKey();
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existing = orderRepository
                    .findByUserIdAndIdempotencyKey(request.getUserId(), idempotencyKey);
            if (existing.isPresent()) {
                log.info("Idempotent replay for userId={}, idempotencyKey={}: returning existing order id={}",
                        request.getUserId(), idempotencyKey, existing.get().getId());
                return orderMapper.toOrderResponse(existing.get());
            }
        }

        Order order = new Order();

        order.setUserId(request.getUserId());

        order.setOrderNumber(
                "ORD-" + UUID.randomUUID().toString().substring(0,8)
        );

        order.setIdempotencyKey(
                idempotencyKey != null && !idempotencyKey.isBlank() ? idempotencyKey : null
        );

        order.setStatus(OrderStatus.PENDING);

        order.setCreatedAt(LocalDateTime.now());

        BigDecimal totalAmount = BigDecimal.ZERO;

        for (OrderItemRequest itemRequest : request.getItems()) {

            OrderItem item = new OrderItem();

            item.setProductId(itemRequest.getProductId());

            item.setQuantity(itemRequest.getQuantity());

            // Fetch actual price from Product Service
            BigDecimal price = fetchProductPrice(itemRequest.getProductId());
            item.setPrice(price);

            item.setOrder(order);

            order.getOrderItems().add(item);

            totalAmount = totalAmount.add(
                    item.getPrice().multiply(
                            BigDecimal.valueOf(item.getQuantity())
                    )
            );

        }

        order.setTotalAmount(totalAmount);

        final Order savedOrder;
        try {
            savedOrder = orderRepository.save(order);
        } catch (DataIntegrityViolationException ex) {
            // Concurrent duplicate with the same (userId, idempotencyKey): the other
            // request committed first (the losing INSERT can only violate the unique
            // constraint once the winner's row is committed), so replay the winner.
            if (idempotencyKey != null && !idempotencyKey.isBlank()) {
                log.warn("Concurrent duplicate order creation detected for userId={}, "
                        + "idempotencyKey={}. Returning the winner's order.",
                        request.getUserId(), idempotencyKey);
                var winner = orderRepository
                        .findByUserIdAndIdempotencyKey(request.getUserId(), idempotencyKey)
                        .orElseThrow(() -> new OrderException(
                                "Order creation conflicted with a concurrent duplicate "
                                        + "and the winning order could not be resolved. "
                                        + "Please retry."));
                return orderMapper.toOrderResponse(winner);
            }
            throw ex;
        }

        List<OrderEventItem> eventItems = savedOrder.getOrderItems()
                .stream()
                .map(item -> OrderEventItem.builder()
                        .productId(item.getProductId())
                        .quantity(item.getQuantity())
                        .build()
                )
                .collect(Collectors.toList());

        OrderCreatedEvent event = OrderCreatedEvent.of(
                savedOrder.getId(),
                savedOrder.getUserId(),
                savedOrder.getTotalAmount(),
                savedOrder.getCreatedAt(),
                eventItems
        );
        orderEventProducer.publishOrderCreatedEvent(event);

        return orderMapper.toOrderResponse(savedOrder);

    }

    @Override
    public OrderResponse getOrderById(Long id) {

        Order order = orderRepository.findById(id)
                .orElseThrow(() ->
                        new OrderNotFoundException(
                                "Order not found with id: " + id
                        ));

        return orderMapper.toOrderResponse(order);

    }

    @Override
    public List<OrderResponse> getOrdersByUserId(Long userId) {

        List<Order> orders = orderRepository.findByUserId(userId);

        return orders.stream()
                .map(orderMapper::toOrderResponse)
                .toList();

    }

    /**
     * Applies a state transition under a pessimistic row lock so the transition check
     * and the persisted status change are atomic. Kafka saga events (StockReserved,
     * PaymentSuccess, PaymentFailed, cancellation) and REST admin updates all serialize
     * through this single method.
     */
    @Override
    @Transactional
    public OrderResponse updateOrderStatus(Long id, OrderStatus status) {

        Order order = orderRepository.findByIdForUpdate(id)
                .orElseThrow(() ->
                        new OrderNotFoundException(
                                "Order not found with id: " + id
                        ));

        validateTransition(order.getStatus(), status);

        order.setStatus(status);
        order.setUpdatedAt(LocalDateTime.now());

        Order updatedOrder = orderRepository.save(order);

        return orderMapper.toOrderResponse(updatedOrder);

    }

    @Override
    public void deleteOrder(Long id) {

        Order order = orderRepository.findById(id)
                .orElseThrow(() ->
                        new OrderNotFoundException(
                                "Order not found with id: " + id
                        ));

        orderRepository.delete(order);

    }

    /**
     * Order state machine. Same-state transitions are allowed (idempotent no-ops for
     * duplicate Kafka events). Terminal states (CANCELLED, DELIVERED) can never be left,
     * and a PAID order can never be cancelled by a stray failure event.
     */
    private void validateTransition(OrderStatus current, OrderStatus target) {
        if (current == target) {
            return; // duplicate event / idempotent replay
        }

        boolean allowed = switch (current) {
            case PENDING -> target == OrderStatus.PAID
                    || target == OrderStatus.CANCELLED
                    || target == OrderStatus.SHIPPED
                    || target == OrderStatus.DELIVERED;
            case PAID -> target == OrderStatus.SHIPPED
                    || target == OrderStatus.DELIVERED;
            case SHIPPED -> target == OrderStatus.DELIVERED;
            case CANCELLED, DELIVERED -> false;
        };

        if (!allowed) {
            throw new InvalidOrderStateTransitionException(
                    "Invalid order state transition from " + current + " to " + target
                            + " for order."
            );
        }
    }

    private BigDecimal fetchProductPrice(Long productId) {
        String url = productServiceUrl + "/api/products/" + productId;
        log.info("Fetching product price from Product Service: url={}", url);

        try {
            ProductResponse productResponse = restTemplate.getForObject(url, ProductResponse.class);

            if (productResponse == null || productResponse.getPrice() == null) {
                log.warn("Product Service returned null/empty price for productId={}; rejecting order", productId);
                throw new OrderException("Unable to resolve product price for productId=" + productId);
            }

            if (productResponse.getPrice().compareTo(BigDecimal.ZERO) <= 0) {
                // A zero/negative price is invalid product data: never silently fall back
                // to a hardcoded or zero price, and never create an order from it.
                log.warn("Product Service returned non-positive price {} for productId={}; rejecting order",
                        productResponse.getPrice(), productId);
                throw new OrderException(
                        "Unable to resolve a valid product price for productId=" + productId);
            }

            log.info("Fetched product price: productId={}, price={}", productId, productResponse.getPrice());
            return productResponse.getPrice();

        } catch (ProductNotFoundException | OrderException e) {
            // Already translated into a domain exception — propagate as-is.
            throw e;
        } catch (HttpClientErrorException e) {
            // 4xx from Product Service. 404 means the product does not exist; any
            // other client error (e.g. 401/403) is a service-level problem.
            if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                log.warn("Product not found in Product Service: productId={}", productId);
                throw new ProductNotFoundException("Product not found with id: " + productId);
            }
            log.error("Product Service rejected request for productId={}: HTTP {}",
                    productId, e.getStatusCode().value());
            throw new ProductServiceUnavailableException(
                    "Unable to fetch product price for productId=" + productId, e);
        } catch (HttpServerErrorException e) {
            log.error("Product Service returned server error for productId={}: HTTP {}",
                    productId, e.getStatusCode().value());
            throw new ProductServiceUnavailableException(
                    "Unable to fetch product price for productId=" + productId, e);
        } catch (ResourceAccessException e) {
            // Connect failure or timeout — Product Service is unreachable.
            log.error("Product Service unreachable or timed out for productId={}: {}",
                    productId, e.getMessage());
            throw new ProductServiceUnavailableException(
                    "Unable to fetch product price for productId=" + productId, e);
        } catch (Exception e) {
            log.error("Unexpected failure while fetching product price for productId={}: {}",
                    productId, e.getMessage());
            throw new ProductServiceUnavailableException(
                    "Unable to fetch product price for productId=" + productId, e);
        }
    }

}
