package com.ecommerce.order.service.impl;

import com.ecommerce.order.dto.request.CreateOrderRequest;
import com.ecommerce.order.dto.request.OrderItemRequest;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.dto.response.ProductResponse;
import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.OrderItem;
import com.ecommerce.order.entity.enums.OrderStatus;
import com.ecommerce.order.exception.InvalidOrderStateTransitionException;
import com.ecommerce.order.exception.OrderException;
import com.ecommerce.order.exception.ProductNotFoundException;
import com.ecommerce.order.exception.ProductServiceUnavailableException;
import com.ecommerce.order.mapper.OrderMapper;
import com.ecommerce.order.producer.OrderEventProducer;
import com.ecommerce.order.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderServiceImplTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderMapper orderMapper;

    @Mock
    private OrderEventProducer orderEventProducer;

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private OrderServiceImpl orderService;

    private static final String PRODUCT_URL = "http://product-service:8081";
    private static final Long PRODUCT_ID = 100L;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(orderService, "productServiceUrl", PRODUCT_URL);
    }

    private CreateOrderRequest requestWithOneItem(int quantity) {
        return CreateOrderRequest.builder()
                .userId(1L)
                .items(List.of(
                        OrderItemRequest.builder()
                                .productId(PRODUCT_ID)
                                .quantity(quantity)
                                .build()
                ))
                .build();
    }

    private void stubSuccessfulPersistence() {
        when(orderRepository.save(any(Order.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(orderMapper.toOrderResponse(any(Order.class)))
                .thenReturn(OrderResponse.builder().build());
    }

    // ─── A. Order creation succeeds with a real price from Product Service ───

    @Test
    void createOrder_withProductPrice_calculatesTotalAndPublishesEvent() {
        ProductResponse productResponse = ProductResponse.builder()
                .id(PRODUCT_ID)
                .price(new BigDecimal("1000.00"))
                .build();
        when(restTemplate.getForObject(
                eq(PRODUCT_URL + "/api/products/" + PRODUCT_ID),
                eq(ProductResponse.class)))
                .thenReturn(productResponse);
        stubSuccessfulPersistence();

        orderService.createOrder(requestWithOneItem(2));

        ArgumentCaptor<Order> orderCaptor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository).save(orderCaptor.capture());
        assertEquals(0, new BigDecimal("2000.00").compareTo(orderCaptor.getValue().getTotalAmount()));
        verify(orderEventProducer, times(1)).publishOrderCreatedEvent(any());
    }

    // ─── B. Product Service 404 → ProductNotFoundException (order creation fails) ───

    @Test
    void createOrder_whenProductNotFound_throwsProductNotFoundException() {
        when(restTemplate.getForObject(
                eq(PRODUCT_URL + "/api/products/" + PRODUCT_ID),
                eq(ProductResponse.class)))
                .thenThrow(HttpClientErrorException.create(
                        HttpStatus.NOT_FOUND, "Not Found", null, null, null));

        assertThrows(ProductNotFoundException.class,
                () -> orderService.createOrder(requestWithOneItem(1)));

        verify(orderRepository, never()).save(any(Order.class));
    }

    // ─── C. Product Service 401 → ProductServiceUnavailableException (never a silent 0 price) ───

    @Test
    void createOrder_whenProductRejectsRequest_throwsProductServiceUnavailable() {
        when(restTemplate.getForObject(
                eq(PRODUCT_URL + "/api/products/" + PRODUCT_ID),
                eq(ProductResponse.class)))
                .thenThrow(HttpClientErrorException.create(
                        HttpStatus.UNAUTHORIZED, "Unauthorized", null, null, null));

        assertThrows(ProductServiceUnavailableException.class,
                () -> orderService.createOrder(requestWithOneItem(1)));

        verify(orderRepository, never()).save(any(Order.class));
    }

    // ─── D. Product Service 5xx → ProductServiceUnavailableException ───

    @Test
    void createOrder_whenProductServiceErrors_throwsProductServiceUnavailable() {
        when(restTemplate.getForObject(
                eq(PRODUCT_URL + "/api/products/" + PRODUCT_ID),
                eq(ProductResponse.class)))
                .thenThrow(new HttpServerErrorException(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThrows(ProductServiceUnavailableException.class,
                () -> orderService.createOrder(requestWithOneItem(1)));

        verify(orderRepository, never()).save(any(Order.class));
    }

    // ─── E. Product Service timeout / unreachable → ProductServiceUnavailableException ───

    @Test
    void createOrder_whenProductServiceTimesOut_throwsProductServiceUnavailable() {
        when(restTemplate.getForObject(
                eq(PRODUCT_URL + "/api/products/" + PRODUCT_ID),
                eq(ProductResponse.class)))
                .thenThrow(new ResourceAccessException("Read timed out"));

        assertThrows(ProductServiceUnavailableException.class,
                () -> orderService.createOrder(requestWithOneItem(1)));

        verify(orderRepository, never()).save(any(Order.class));
    }

    // ─── F. Malformed 200 (null price) → OrderException, order rejected ───

    @Test
    void createOrder_whenProductReturnsNullPrice_throwsOrderException() {
        ProductResponse emptyPrice = ProductResponse.builder()
                .id(PRODUCT_ID)
                .price(null)
                .build();
        when(restTemplate.getForObject(
                eq(PRODUCT_URL + "/api/products/" + PRODUCT_ID),
                eq(ProductResponse.class)))
                .thenReturn(emptyPrice);

        assertThrows(OrderException.class,
                () -> orderService.createOrder(requestWithOneItem(1)));

        verify(orderRepository, never()).save(any(Order.class));
    }

    // ─── G. Non-positive price from Product Service → order rejected ───────

    @Test
    void createOrder_whenProductReturnsZeroPrice_throwsOrderException() {
        ProductResponse zeroPrice = ProductResponse.builder()
                .id(PRODUCT_ID)
                .price(BigDecimal.ZERO)
                .build();
        when(restTemplate.getForObject(
                eq(PRODUCT_URL + "/api/products/" + PRODUCT_ID),
                eq(ProductResponse.class)))
                .thenReturn(zeroPrice);

        assertThrows(OrderException.class,
                () -> orderService.createOrder(requestWithOneItem(1)));

        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void createOrder_whenProductReturnsNegativePrice_throwsOrderException() {
        ProductResponse negativePrice = ProductResponse.builder()
                .id(PRODUCT_ID)
                .price(new BigDecimal("-5.00"))
                .build();
        when(restTemplate.getForObject(
                eq(PRODUCT_URL + "/api/products/" + PRODUCT_ID),
                eq(ProductResponse.class)))
                .thenReturn(negativePrice);

        assertThrows(OrderException.class,
                () -> orderService.createOrder(requestWithOneItem(1)));

        verify(orderRepository, never()).save(any(Order.class));
    }

    // ─── H. Product Service 403 → never a silent order, never a fallback price ──

    @Test
    void createOrder_whenProductForbidsRequest_throwsProductServiceUnavailable() {
        when(restTemplate.getForObject(
                eq(PRODUCT_URL + "/api/products/" + PRODUCT_ID),
                eq(ProductResponse.class)))
                .thenThrow(HttpClientErrorException.create(
                        HttpStatus.FORBIDDEN, "Forbidden", null, null, null));

        assertThrows(ProductServiceUnavailableException.class,
                () -> orderService.createOrder(requestWithOneItem(1)));

        verify(orderRepository, never()).save(any(Order.class));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // I. Order creation idempotency (client-supplied idempotencyKey)
    // ═══════════════════════════════════════════════════════════════════════

    private Order existingOrder(Long id) {
        OrderItem item = OrderItem.builder()
                .id(id)
                .productId(PRODUCT_ID)
                .quantity(1)
                .price(new BigDecimal("10.00"))
                .build();
        Order order = Order.builder()
                .id(id)
                .userId(1L)
                .orderNumber("ORD-EXISTING")
                .status(OrderStatus.PENDING)
                .totalAmount(new BigDecimal("10.00"))
                .createdAt(LocalDateTime.now())
                .build();
        order.setOrderItems(new ArrayList<>(List.of(item)));
        item.setOrder(order);
        return order;
    }

    private CreateOrderRequest requestWithKey(String key) {
        return CreateOrderRequest.builder()
                .userId(1L)
                .idempotencyKey(key)
                .items(List.of(
                        OrderItemRequest.builder()
                                .productId(PRODUCT_ID)
                                .quantity(1)
                                .build()
                ))
                .build();
    }

    @Test
    void createOrder_idempotentReplay_returnsExistingOrderWithoutCreating() {
        Order existing = existingOrder(42L);
        when(orderRepository.findByUserIdAndIdempotencyKey(1L, "key-1"))
                .thenReturn(Optional.of(existing));
        when(orderMapper.toOrderResponse(existing))
                .thenReturn(OrderResponse.builder().orderNumber("ORD-EXISTING").build());

        OrderResponse response = orderService.createOrder(requestWithKey("key-1"));

        assertEquals("ORD-EXISTING", response.getOrderNumber());
        // No second order, no re-fetch of prices, no second OrderCreatedEvent.
        verify(orderRepository, never()).save(any(Order.class));
        verify(orderEventProducer, never()).publishOrderCreatedEvent(any());
    }

    @Test
    void createOrder_sameKeyWithNoPriorOrderForThisUser_createsNewOrder() {
        ProductResponse productResponse = ProductResponse.builder()
                .id(PRODUCT_ID)
                .price(new BigDecimal("1000.00"))
                .build();
        when(restTemplate.getForObject(
                eq(PRODUCT_URL + "/api/products/" + PRODUCT_ID),
                eq(ProductResponse.class)))
                .thenReturn(productResponse);
        when(orderRepository.findByUserIdAndIdempotencyKey(1L, "key-1"))
                .thenReturn(Optional.empty());
        stubSuccessfulPersistence();

        orderService.createOrder(requestWithKey("key-1"));

        // The key was only looked up for THIS user; a different user holding the same
        // key would have its own lookup and its own order (enforced in the DB by the
        // (user_id, idempotency_key) unique constraint).
        verify(orderRepository).findByUserIdAndIdempotencyKey(1L, "key-1");
        verify(orderRepository, times(1)).save(any(Order.class));
        verify(orderEventProducer, times(1)).publishOrderCreatedEvent(any());
    }

    @Test
    void createOrder_concurrentDuplicate_returnsWinnerWithoutDoublePublish() {
        Order winner = existingOrder(43L);
        // First the replay lookup misses (both concurrent requests raced past it)...
        when(orderRepository.findByUserIdAndIdempotencyKey(1L, "key-2"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(winner));
        // ...then this request's INSERT loses the unique (user_id, idempotency_key) race.
        when(orderRepository.save(any(Order.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint"));
        when(orderMapper.toOrderResponse(winner))
                .thenReturn(OrderResponse.builder().orderNumber("ORD-WINNER").build());
        ProductResponse productResponse = ProductResponse.builder()
                .id(PRODUCT_ID)
                .price(new BigDecimal("1000.00"))
                .build();
        when(restTemplate.getForObject(
                eq(PRODUCT_URL + "/api/products/" + PRODUCT_ID),
                eq(ProductResponse.class)))
                .thenReturn(productResponse);

        OrderResponse response = orderService.createOrder(requestWithKey("key-2"));

        assertEquals("ORD-WINNER", response.getOrderNumber());
        // Only one publish happens in total (the winner's request published it).
        verify(orderEventProducer, never()).publishOrderCreatedEvent(any());
    }

    @Test
    void createOrder_concurrentDuplicate_winnerUnresolvable_throwsOrderException() {
        when(orderRepository.findByUserIdAndIdempotencyKey(1L, "key-3"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint"));
        ProductResponse productResponse = ProductResponse.builder()
                .id(PRODUCT_ID)
                .price(new BigDecimal("1000.00"))
                .build();
        when(restTemplate.getForObject(
                eq(PRODUCT_URL + "/api/products/" + PRODUCT_ID),
                eq(ProductResponse.class)))
                .thenReturn(productResponse);

        assertThrows(OrderException.class,
                () -> orderService.createOrder(requestWithKey("key-3")));
    }

    // ═══════════════════════════════════════════════════════════════════════
    // J. Order state machine (updateOrderStatus)
    // ═══════════════════════════════════════════════════════════════════════

    private Order orderInState(OrderStatus status) {
        return Order.builder()
                .id(100L)
                .userId(1L)
                .orderNumber("ORD-" + status)
                .status(status)
                .totalAmount(new BigDecimal("10.00"))
                .createdAt(LocalDateTime.now())
                .build();
    }

    /**
     * Stubs ONLY the locked read; used for transitions that must be REJECTED (the save
     * and mapper stubs would otherwise be reported as unnecessary stubbings).
     */
    private void stubOrderRead(Order order) {
        when(orderRepository.findByIdForUpdate(order.getId()))
                .thenReturn(Optional.of(order));
    }

    private void stubStatusUpdate(Order order) {
        stubOrderRead(order);
        when(orderRepository.save(any(Order.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(orderMapper.toOrderResponse(any(Order.class)))
                .thenReturn(OrderResponse.builder().build());
    }

    @Test
    void updateOrderStatus_pendingToPaid_applies() {
        Order order = orderInState(OrderStatus.PENDING);
        stubStatusUpdate(order);

        orderService.updateOrderStatus(order.getId(), OrderStatus.PAID);

        assertEquals(OrderStatus.PAID, order.getStatus());
        verify(orderRepository, times(1)).save(order);
    }

    @Test
    void updateOrderStatus_sameState_isIdempotentNoOp() {
        Order order = orderInState(OrderStatus.CANCELLED);
        stubStatusUpdate(order);

        // Duplicate cancellation events must not throw.
        assertDoesNotThrow(() ->
                orderService.updateOrderStatus(order.getId(), OrderStatus.CANCELLED));

        Order orderPaid = orderInState(OrderStatus.PAID);
        stubStatusUpdate(orderPaid);
        assertDoesNotThrow(() ->
                orderService.updateOrderStatus(orderPaid.getId(), OrderStatus.PAID));
    }

    @Test
    void updateOrderStatus_cancelledToPaid_rejected() {
        Order order = orderInState(OrderStatus.CANCELLED);
        stubOrderRead(order);

        assertThrows(InvalidOrderStateTransitionException.class,
                () -> orderService.updateOrderStatus(order.getId(), OrderStatus.PAID));
        // The rejected transition must not persist.
        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void updateOrderStatus_cancelledToConfirmedStyle_rejected() {
        // CANCELLED → any non-terminal move is rejected (terminal state can never be left).
        Order order = orderInState(OrderStatus.CANCELLED);
        stubOrderRead(order);

        assertThrows(InvalidOrderStateTransitionException.class,
                () -> orderService.updateOrderStatus(order.getId(), OrderStatus.SHIPPED));
        assertEquals(OrderStatus.CANCELLED, order.getStatus());
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void updateOrderStatus_paidToCancelled_rejected() {
        // A paid order must never be cancelled by a stray late failure event.
        Order order = orderInState(OrderStatus.PAID);
        stubOrderRead(order);

        assertThrows(InvalidOrderStateTransitionException.class,
                () -> orderService.updateOrderStatus(order.getId(), OrderStatus.CANCELLED));
        assertEquals(OrderStatus.PAID, order.getStatus());
        verify(orderRepository, never()).save(any(Order.class));
    }

    @Test
    void updateOrderStatus_forwardFulfilmentTransitions_allowed() {
        Order pending = orderInState(OrderStatus.PENDING);
        stubStatusUpdate(pending);
        assertDoesNotThrow(() ->
                orderService.updateOrderStatus(pending.getId(), OrderStatus.SHIPPED));
        assertEquals(OrderStatus.SHIPPED, pending.getStatus());

        Order paid = orderInState(OrderStatus.PAID);
        stubStatusUpdate(paid);
        assertDoesNotThrow(() ->
                orderService.updateOrderStatus(paid.getId(), OrderStatus.SHIPPED));
        assertEquals(OrderStatus.SHIPPED, paid.getStatus());

        Order shipped = orderInState(OrderStatus.SHIPPED);
        stubStatusUpdate(shipped);
        assertDoesNotThrow(() ->
                orderService.updateOrderStatus(shipped.getId(), OrderStatus.DELIVERED));
        assertEquals(OrderStatus.DELIVERED, shipped.getStatus());

        // DELIVERED is terminal: it can never go backwards.
        Order delivered = orderInState(OrderStatus.DELIVERED);
        stubOrderRead(delivered);
        assertThrows(InvalidOrderStateTransitionException.class,
                () -> orderService.updateOrderStatus(delivered.getId(), OrderStatus.SHIPPED));
    }

    @Test
    void updateOrderStatus_missingOrder_throwsOrderNotFound() {
        when(orderRepository.findByIdForUpdate(404L)).thenReturn(Optional.empty());

        assertThrows(com.ecommerce.order.exception.OrderNotFoundException.class,
                () -> orderService.updateOrderStatus(404L, OrderStatus.PAID));
    }
}
