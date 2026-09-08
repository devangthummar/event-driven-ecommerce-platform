package com.ecommerce.product.dto;

import com.ecommerce.product.dto.request.ProductRequestDTO;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Malformed product payloads must be rejected at the API boundary (400) instead of
 * reaching the database and failing with a 500: missing name, missing/zero/negative
 * price, and negative stock are all invalid product input.
 */
class ProductRequestDTOValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    private ProductRequestDTO validDto() {
        ProductRequestDTO dto = new ProductRequestDTO();
        dto.setName("iPhone 15");
        dto.setPrice(new BigDecimal("999.99"));
        dto.setCategory("Electronics");
        dto.setStockQuantity(10);
        return dto;
    }

    @Test
    void validProduct_passesValidation() {
        assertTrue(validator.validate(validDto()).isEmpty());
    }

    @Test
    void blankName_failsValidation() {
        ProductRequestDTO dto = validDto();
        dto.setName("   ");
        assertEquals(1, validator.validate(dto).size());
    }

    @Test
    void nullName_failsValidation() {
        ProductRequestDTO dto = validDto();
        dto.setName(null);
        assertEquals(1, validator.validate(dto).size());
    }

    @Test
    void nullPrice_failsValidation() {
        ProductRequestDTO dto = validDto();
        dto.setPrice(null);
        assertEquals(1, validator.validate(dto).size());
    }

    @Test
    void zeroPrice_failsValidation() {
        ProductRequestDTO dto = validDto();
        dto.setPrice(BigDecimal.ZERO);
        assertTrue(validator.validate(dto).stream()
                .anyMatch(v -> v.getMessage().contains("greater than zero")));
    }

    @Test
    void negativePrice_failsValidation() {
        ProductRequestDTO dto = validDto();
        dto.setPrice(new BigDecimal("-1.00"));
        assertTrue(validator.validate(dto).stream()
                .anyMatch(v -> v.getMessage().contains("greater than zero")));
    }

    @Test
    void negativeStock_failsValidation() {
        ProductRequestDTO dto = validDto();
        dto.setStockQuantity(-5);
        assertTrue(validator.validate(dto).stream()
                .anyMatch(v -> v.getMessage().contains("not be negative")));
    }

    @Test
    void multipleViolations_allReported() {
        ProductRequestDTO dto = validDto();
        dto.setName(null);
        dto.setPrice(null);
        dto.setStockQuantity(-1);
        assertEquals(3, validator.validate(dto).size());
    }
}
