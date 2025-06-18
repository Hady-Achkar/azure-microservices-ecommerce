#!/bin/bash

set -e

# Configuration
PRODUCTS_SERVICE_URL=${PRODUCTS_SERVICE_URL:-"http://localhost:3001"}
ORDERS_SERVICE_URL=${ORDERS_SERVICE_URL:-"http://localhost:3002"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Test functions
test_health_check() {
    local service_name=$1
    local url=$2
    
    log_info "Testing health check for $service_name"
    
    if curl -s -f "$url/health" > /dev/null; then
        log_success "$service_name health check passed"
        return 0
    else
        log_error "$service_name health check failed"
        return 1
    fi
}

test_products_service() {
    log_info "Testing Products Service..."
    
    # Test GET all products
    log_info "GET /api/products"
    if ! curl -s -X GET "$PRODUCTS_SERVICE_URL/api/products" | jq '.' > /dev/null; then
        log_error "Failed to get products"
        return 1
    fi
    
    # Test CREATE product
    log_info "POST /api/products"
    PRODUCT_DATA='{
        "name": "Test Product",
        "description": "A test product",
        "price": "29.99",
        "stock": 100,
        "category": "Electronics",
        "imageUrl": "https://example.com/test.jpg"
    }'
    
    CREATED_PRODUCT=$(curl -s -X POST "$PRODUCTS_SERVICE_URL/api/products" \
        -H "Content-Type: application/json" \
        -d "$PRODUCT_DATA" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$CREATED_PRODUCT" ]; then
        log_success "Product created successfully"
        PRODUCT_ID=$(echo "$CREATED_PRODUCT" | jq -r '.id' 2>/dev/null)
        
        if [ -n "$PRODUCT_ID" ] && [ "$PRODUCT_ID" != "null" ]; then
            echo "Created product ID: $PRODUCT_ID"
            
            # Test GET product by ID
            log_info "GET /api/products/$PRODUCT_ID"
            if curl -s -X GET "$PRODUCTS_SERVICE_URL/api/products/$PRODUCT_ID" | jq '.' > /dev/null; then
                log_success "Retrieved product by ID"
            else
                log_error "Failed to retrieve product by ID"
            fi
            
            # Test UPDATE product
            log_info "PUT /api/products/$PRODUCT_ID"
            UPDATE_DATA='{"name": "Updated Test Product", "price": "39.99"}'
            if curl -s -X PUT "$PRODUCTS_SERVICE_URL/api/products/$PRODUCT_ID" \
                -H "Content-Type: application/json" \
                -d "$UPDATE_DATA" | jq '.' > /dev/null; then
                log_success "Product updated successfully"
            else
                log_error "Failed to update product"
            fi
            
            echo "$PRODUCT_ID"
        else
            log_error "Failed to extract product ID from response"
            return 1
        fi
    else
        log_error "Failed to create product"
        return 1
    fi
}

test_orders_service() {
    local product_id=$1
    
    if [ -z "$product_id" ]; then
        log_warning "No product ID provided, skipping orders test"
        return 0
    fi
    
    log_info "Testing Orders Service..."
    
    # Test GET all orders
    log_info "GET /api/orders"
    if ! curl -s -X GET "$ORDERS_SERVICE_URL/api/orders" | jq '.' > /dev/null; then
        log_error "Failed to get orders"
        return 1
    fi
    
    # Test CREATE order
    log_info "POST /api/orders"
    ORDER_DATA=$(cat <<EOF
{
    "userId": "test-user-$(date +%s)",
    "items": [
        {
            "productId": "$product_id",
            "quantity": 2,
            "price": "39.99"
        }
    ]
}
EOF
)
    
    CREATED_ORDER=$(curl -s -X POST "$ORDERS_SERVICE_URL/api/orders" \
        -H "Content-Type: application/json" \
        -d "$ORDER_DATA" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$CREATED_ORDER" ]; then
        log_success "Order created successfully"
        ORDER_ID=$(echo "$CREATED_ORDER" | jq -r '.id' 2>/dev/null)
        
        if [ -n "$ORDER_ID" ] && [ "$ORDER_ID" != "null" ]; then
            echo "Created order ID: $ORDER_ID"
            
            # Test GET order by ID
            log_info "GET /api/orders/$ORDER_ID"
            if curl -s -X GET "$ORDERS_SERVICE_URL/api/orders/$ORDER_ID" | jq '.' > /dev/null; then
                log_success "Retrieved order by ID"
            else
                log_error "Failed to retrieve order by ID"
            fi
            
            # Test UPDATE order status
            log_info "PUT /api/orders/$ORDER_ID/status"
            if curl -s -X PUT "$ORDERS_SERVICE_URL/api/orders/$ORDER_ID/status" \
                -H "Content-Type: application/json" \
                -d '{"status": "CONFIRMED"}' | jq '.' > /dev/null; then
                log_success "Order status updated successfully"
            else
                log_error "Failed to update order status"
            fi
            
            echo "$ORDER_ID"
        else
            log_error "Failed to extract order ID from response"
            return 1
        fi
    else
        log_error "Failed to create order"
        return 1
    fi
}

cleanup() {
    local product_id=$1
    
    if [ -n "$product_id" ]; then
        log_info "Cleaning up test product: $product_id"
        if curl -s -X DELETE "$PRODUCTS_SERVICE_URL/api/products/$product_id" > /dev/null 2>&1; then
            log_success "Cleanup completed"
        else
            log_warning "Cleanup may have failed"
        fi
    fi
}

# Main test execution
main() {
    log_info "Starting Azure Microservices API Tests"
    log_info "Products Service: $PRODUCTS_SERVICE_URL"
    log_info "Orders Service: $ORDERS_SERVICE_URL"
    
    # Check if required tools are installed
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed"
        exit 1
    fi
    
    # Test health checks
    if ! test_health_check "Products Service" "$PRODUCTS_SERVICE_URL"; then
        log_error "Products service health check failed, exiting"
        exit 1
    fi
    
    if ! test_health_check "Orders Service" "$ORDERS_SERVICE_URL"; then
        log_error "Orders service health check failed, exiting"  
        exit 1
    fi
    
    # Test services
    set +e # Disable exit on error for service tests
    
    PRODUCT_ID=$(test_products_service)
    PRODUCT_TEST_SUCCESS=$?
    
    ORDER_ID=""
    if [ $PRODUCT_TEST_SUCCESS -eq 0 ] && [ -n "$PRODUCT_ID" ]; then
        ORDER_ID=$(test_orders_service "$PRODUCT_ID")
        ORDER_TEST_SUCCESS=$?
    else
        log_warning "Skipping orders tests due to product test failure"
        ORDER_TEST_SUCCESS=1
    fi
    
    # Wait for Service Bus messages to propagate
    if [ $PRODUCT_TEST_SUCCESS -eq 0 ] && [ $ORDER_TEST_SUCCESS -eq 0 ] && [ -n "$PRODUCT_ID" ] && [ -n "$ORDER_ID" ]; then
        log_info "Waiting for Service Bus messages to propagate..."
        sleep 5
        
        # Check if product stock was updated
        log_info "Checking if product stock was updated by Service Bus..."
        UPDATED_STOCK=$(curl -s -X GET "$PRODUCTS_SERVICE_URL/api/products/$PRODUCT_ID" | jq -r '.stock' 2>/dev/null)
        if [ -n "$UPDATED_STOCK" ] && [ "$UPDATED_STOCK" != "null" ]; then
            log_info "Current product stock: $UPDATED_STOCK"
        else
            log_warning "Could not retrieve updated stock information"
        fi
    fi
    
    # Cleanup
    if [ -n "$PRODUCT_ID" ]; then
        cleanup "$PRODUCT_ID"
    fi
    
    # Report final status
    if [ $PRODUCT_TEST_SUCCESS -eq 0 ] && [ $ORDER_TEST_SUCCESS -eq 0 ]; then
        log_success "All tests completed successfully!"
        exit 0
    else
        log_error "Some tests failed!"
        exit 1
    fi
}

# Run main function
main "$@"