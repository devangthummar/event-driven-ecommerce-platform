package com.ecommerce.order.service.impl;

import com.ecommerce.order.dto.request.CreateOrderRequest;
import com.ecommerce.order.dto.request.OrderItemRequest;
import com.ecommerce.order.dto.request.UpdateOrderStatusRequest;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.dto.response.ProductResponse;
import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.OrderItem;
import com.ecommerce.order.entity.enums.OrderStatus;
import com.ecommerce.order.event.OrderCreatedEvent;
import com.ecommerce.order.event.OrderEventItem;
import com.ecommerce.order.exception.OrderException;
import com.ecommerce.order.exception.OrderNotFoundException;
import com.ecommerce.order.mapper.OrderMapper;
import com.ecommerce.order.producer.OrderEventProducer;
import com.ecommerce.order.repository.OrderRepository;
import com.ecommerce.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
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
    public OrderResponse createOrder(CreateOrderRequest request) {

        Order order = new Order();

        order.setUserId(request.getUserId());

        order.setOrderNumber(
                "ORD-" + UUID.randomUUID().toString().substring(0,8)
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

        Order savedOrder = orderRepository.save(order);

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

    @Override
    public OrderResponse updateOrderStatus(Long id, OrderStatus status) {

        Order order = orderRepository.findById(id)
                .orElseThrow(() ->
                        new OrderNotFoundException(
                                "Order not found with id: " + id
                        ));

        order.setStatus(status);

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

    private BigDecimal fetchProductPrice(Long productId) {
        try {
            String url = productServiceUrl + "/api/products/" + productId;
            log.info("Fetching product price from Product Service: url={}", url);
            ProductResponse productResponse = restTemplate.getForObject(url, ProductResponse.class);
            if (productResponse != null && productResponse.getPrice() != null) {
                log.info("Fetched product price: productId={}, price={}", productId, productResponse.getPrice());
                return productResponse.getPrice();
            } else {
                log.warn("Product Service returned null/empty price for productId={}; rejecting order", productId);
                throw new OrderException("Unable to resolve product price for productId=" + productId);
            }
        } catch (OrderException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to fetch product price from Product Service for productId={}: {}", productId, e.getMessage());
            throw new OrderException("Unable to fetch product price for productId=" + productId, e);
        }
    }

}
