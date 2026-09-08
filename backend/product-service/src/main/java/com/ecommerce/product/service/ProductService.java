package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.ProductRequestDTO;
import com.ecommerce.product.dto.response.ProductResponseDTO;
import com.ecommerce.product.exception.ProductNotFoundException;
import com.ecommerce.product.model.Product;
import com.ecommerce.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;

    private ProductResponseDTO convertToResponse(Product product) {
        return ProductResponseDTO.builder()
                .id(product.getId())
                .name(product.getName())
                .description(product.getDescription())
                .price(product.getPrice())
                .category(product.getCategory())
                .stockQuantity(product.getStockQuantity())
                .imageUrl(product.getImageUrl())
                .averageRating(product.getAverageRating())
                .createdAt(product.getCreatedAt())
                .build();
    }

    private Product convertToEntity(ProductRequestDTO dto) {
        return Product.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .price(dto.getPrice())
                .category(dto.getCategory())
                .stockQuantity(dto.getStockQuantity())
                .imageUrl(dto.getImageUrl())
                .build();
    }

    // CREATE
    @Transactional
    public ProductResponseDTO createProduct(ProductRequestDTO dto) {
        Product product = convertToEntity(dto);
        Product saved = productRepository.save(product);
        return convertToResponse(saved);
    }

    // GET ALL
    public List<ProductResponseDTO> getAllProducts() {
        return productRepository.findAll()
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // GET BY ID
    @Transactional(readOnly = true)
    public ProductResponseDTO getProductById(Long id) {
        // First try to get from cache
        ProductResponseDTO cached = getFromCache(id, ProductResponseDTO.class);
        if (cached != null) {
            return cached;
        }
        // Cache miss or wrong type - fetch from DB
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException("Product not found with id: " + id));
        ProductResponseDTO response = convertToResponse(product);
        // Store in cache for next time
        putInCache(id, response);
        return response;
    }

    @SuppressWarnings("unchecked")
    private <T> T getFromCache(Long id, Class<T> type) {
        org.springframework.cache.Cache cache = cacheManager.getCache("products");
        if (cache != null) {
            // Use cache.get() with the target type - Spring will try to convert
            // But LinkedHashMap from Redis deserialization won't convert to ProductResponseDTO
            // So we catch that and return null
            try {
                Object value = cache.get(id, Object.class);  // Get as raw Object
                if (value instanceof ProductResponseDTO) {
                    return (T) value;
                }
                // If it's a LinkedHashMap, we can't use it directly
                // Fall through to DB fetch
            } catch (Exception e) {
                // Cache read failed, fall through to DB
            }
        }
        return null;
    }

    private void putInCache(Long id, ProductResponseDTO response) {
        org.springframework.cache.Cache cache = cacheManager.getCache("products");
        if (cache != null) {
            cache.put(id, response);
        }
    }

    @Autowired
    private org.springframework.cache.CacheManager cacheManager;

    // UPDATE
    @Transactional
    @CacheEvict(value = "products", key = "#id")
    public ProductResponseDTO updateProduct(Long id, ProductRequestDTO dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException("Product not found with id: " + id));
        product.setName(dto.getName());
        product.setDescription(dto.getDescription());
        product.setPrice(dto.getPrice());
        product.setCategory(dto.getCategory());
        product.setStockQuantity(dto.getStockQuantity());
        product.setImageUrl(dto.getImageUrl());
        Product updated = productRepository.save(product);
        return convertToResponse(updated);
    }

    // DELETE
    @Transactional
    @CacheEvict(value = "products", key = "#id")
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ProductNotFoundException("Product not found with id: " + id));
        productRepository.delete(product);
    }

    // SEARCH
    public List<ProductResponseDTO> searchProducts(String keyword) {
        return productRepository.findByNameContainingIgnoreCase(keyword)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    // GET BY CATEGORY
    public List<ProductResponseDTO> getProductsByCategory(String category) {
        return productRepository.findByCategory(category)
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

}