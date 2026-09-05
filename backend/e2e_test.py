#!/usr/bin/env python3
"""
E2E Saga Flow Test Script for Event-Driven E-Commerce Platform
Tests all 6 microservices in sequence, captures responses, and reports results.
"""

import requests
import json
import time
import subprocess
import sys
import os
from datetime import datetime

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# ============================================
# Configuration
# ============================================
BASE_URLS = {
    "user": "http://localhost:8006",
    "product": "http://localhost:8081",
    "order": "http://localhost:8082",
    "inventory": "http://localhost:8084",
    "payment": "http://localhost:8085",
    "notification": "http://localhost:8086",
}

# Test data with unique timestamp to avoid collisions
TEST_TIMESTAMP = int(time.time())
TEST_PHONE = f"9{str(TEST_TIMESTAMP)[-9:]}"  # 10-digit phone starting with 9
# Ensure exactly 10 digits
TEST_PHONE = TEST_PHONE[:10].ljust(10, '0')

TEST_USER = {
    "firstName": "Test",
    "lastName": "User",
    "email": f"testuser{TEST_TIMESTAMP}@example.com",
    "password": "Password123!",
    "phoneNumber": TEST_PHONE
}

# Storage for test state
jwt_token = None
user_id = None
product_id = None
order_id = None

# Results tracking
results = []


def log_result(step, name, status_code, response_body, passed, error_msg=None):
    """Log a test result."""
    result = {
        "step": step,
        "name": name,
        "status_code": status_code,
        "response_body": response_body,
        "passed": passed,
        "error_msg": error_msg
    }
    results.append(result)
    status = "PASS" if passed else "FAIL"
    print(f"\n{'='*60}")
    print(f"Step {step}: {name}")
    print(f"  Status Code: {status_code}")
    print(f"  Result: {status}")
    if response_body:
        body_str = json.dumps(response_body, indent=2, default=str)
        if len(body_str) > 500:
            body_str = body_str[:500] + "... (truncated)"
        print(f"  Response: {body_str}")
    if error_msg:
        print(f"  Error: {error_msg}")
    print(f"{'='*60}")


def safe_request(method, url, headers=None, json_data=None, params=None, timeout=30):
    """Make an HTTP request and return (status_code, response_body, error_msg)."""
    try:
        if method.upper() == "POST":
            resp = requests.post(url, json=json_data, headers=headers, params=params, timeout=timeout)
        elif method.upper() == "GET":
            resp = requests.get(url, headers=headers, timeout=timeout)
        elif method.upper() == "PUT":
            resp = requests.put(url, json=json_data, headers=headers, timeout=timeout)
        elif method.upper() == "PATCH":
            resp = requests.patch(url, headers=headers, params=params, timeout=timeout)
        elif method.upper() == "DELETE":
            resp = requests.delete(url, headers=headers, timeout=timeout)
        else:
            return 0, None, f"Unsupported method: {method}"

        body = None
        try:
            body = resp.json()
        except Exception:
            body = {"raw_text": resp.text[:1000] if resp.text else "", "content_type": resp.headers.get("Content-Type", "unknown")}

        return resp.status_code, body, None
    except requests.exceptions.ConnectionError as e:
        return 0, None, f"Connection error: {str(e)[:200]}"
    except requests.exceptions.Timeout as e:
        return 0, None, f"Timeout: {str(e)[:200]}"
    except Exception as e:
        return 0, None, f"Unexpected error: {str(e)[:200]}"


# ============================================
# STEP 1: Register a new user
# ============================================
def test_register():
    global user_id
    print(f"\n>>> STEP 1: Registering new user ({TEST_USER['email']})...")

    status, body, err = safe_request(
        "POST",
        f"{BASE_URLS['user']}/api/users/register",
        json_data=TEST_USER,
        headers={"Content-Type": "application/json"}
    )

    passed = status in [200, 201]
    if passed and body:
        user_id = body.get("id")

    log_result(
        step=1,
        name="User Registration",
        status_code=status,
        response_body=body,
        passed=passed,
        error_msg=err
    )
    return passed


# ============================================
# STEP 2: Login and extract JWT
# ============================================
def test_login():
    global jwt_token, user_id
    print("\n>>> STEP 2: Logging in to get JWT...")

    login_data = {
        "email": TEST_USER["email"],
        "password": TEST_USER["password"]
    }

    status, body, err = safe_request(
        "POST",
        f"{BASE_URLS['user']}/api/users/login",
        json_data=login_data,
        headers={"Content-Type": "application/json"}
    )

    passed = status == 200
    jwt_extracted = False
    if passed and body:
        jwt_token = body.get("accessToken")
        if jwt_token:
            jwt_extracted = True

    log_result(
        step=2,
        name="User Login (JWT Extraction)",
        status_code=status,
        response_body={**body, "accessToken": f"{jwt_token[:20]}..." if jwt_token else None} if body and jwt_token else body,
        passed=passed,
        error_msg=err if not passed else (None if jwt_extracted else "JWT token not found in response")
    )
    return passed


def get_auth_headers():
    """Return authorization headers with JWT token."""
    h = {"Content-Type": "application/json"}
    if jwt_token:
        h["Authorization"] = f"Bearer {jwt_token}"
    return h


# ============================================
# STEP 3: Create wallet and add balance
# ============================================
def test_wallet():
    global user_id
    print("\n>>> STEP 3: Creating wallet and adding balance...")

    if not user_id:
        # Try to get user info via login
        log_result(step=3, name="Wallet Setup", status_code=0, response_body=None, passed=False, error_msg="No user_id available from Step 1")
        return False

    # 3a: Create wallet
    status, body, err = safe_request(
        "POST",
        f"{BASE_URLS['payment']}/api/wallets/{user_id}",
        headers=get_auth_headers()
    )

    create_passed = status in [200, 201]
    print(f"  3a: Create wallet - Status: {status}")
    if not create_passed:
        # Wallet might already exist, try to get it
        status_get, body_get, _ = safe_request("GET", f"{BASE_URLS['payment']}/api/wallets/{user_id}", headers=get_auth_headers())
        if status_get == 200:
            print(f"  Wallet already exists for userId={user_id}")
            create_passed = True
        else:
            log_result(step=3, name="Create Wallet", status_code=status, response_body=body, passed=False, error_msg=err)
            return False

    # 3b: Add 5000 to wallet
    status2, body2, err2 = safe_request(
        "PATCH",
        f"{BASE_URLS['payment']}/api/wallets/{user_id}/balance",
        headers=get_auth_headers(),
        params={"amount": 5000}
    )

    passed = status2 in [200, 201]
    log_result(
        step=3,
        name="Add 5000 to Wallet",
        status_code=status2,
        response_body=body2,
        passed=passed,
        error_msg=err2 if not passed else None
    )
    return passed


# ============================================
# STEP 4: Create a product
# ============================================
def test_create_product():
    global product_id
    print("\n>>> STEP 4: Creating a test product...")

    product_data = {
        "name": "iPhone 15",
        "description": "Apple iPhone 15 128GB - Space Black",
        "price": 1000.00,
        "category": "Electronics",
        "stockQuantity": 10,
        "imageUrl": "https://example.com/iphone15.jpg"
    }

    status, body, err = safe_request(
        "POST",
        f"{BASE_URLS['product']}/api/products",
        headers={"Content-Type": "application/json"},
        json_data=product_data
    )

    passed = status in [200, 201]
    if passed and body:
        product_id = body.get("id")

    log_result(
        step=4,
        name="Create Product (iPhone 15, 1000)",
        status_code=status,
        response_body=body,
        passed=passed,
        error_msg=err
    )
    return passed


# ============================================
# STEP 5: Add inventory stock
# ============================================
def test_add_inventory():
    print("\n>>> STEP 5: Adding inventory stock...")

    if not product_id:
        log_result(step=5, name="Add Inventory", status_code=0, response_body=None, passed=False, error_msg="No product_id available from Step 4")
        return False

    stock_data = {
        "productId": product_id,
        "quantity": 10
    }

    status, body, err = safe_request(
        "POST",
        f"{BASE_URLS['inventory']}/api/inventory",
        headers=get_auth_headers(),
        json_data=stock_data
    )

    passed = status in [200, 201]
    log_result(
        step=5,
        name="Add Inventory (10 units)",
        status_code=status,
        response_body=body,
        passed=passed,
        error_msg=err
    )
    return passed


# ============================================
# STEP 6: Place an order
# ============================================
def test_place_order():
    global order_id
    print("\n>>> STEP 6: Placing an order...")

    if not product_id:
        log_result(step=6, name="Place Order", status_code=0, response_body=None, passed=False, error_msg="No product_id available from Step 4")
        return False

    order_data = {
        "userId": user_id,
        "items": [
            {
                "productId": product_id,
                "quantity": 1
            }
        ]
    }

    status, body, err = safe_request(
        "POST",
        f"{BASE_URLS['order']}/api/v1/orders",
        headers=get_auth_headers(),
        json_data=order_data
    )

    passed = status in [200, 201]
    if passed and body:
        order_id = body.get("id")

    log_result(
        step=6,
        name="Place Order (1x iPhone 15)",
        status_code=status,
        response_body=body,
        passed=passed,
        error_msg=err
    )
    return passed


# ============================================
# Additional: Get created entities for verification
# ============================================
def verify_entities():
    """Fetch created entities to verify they exist."""
    print("\n>>> VERIFY: Fetching created entities...")

    if product_id:
        status, body, err = safe_request("GET", f"{BASE_URLS['product']}/api/products/{product_id}")
        print(f"  GET Product (id={product_id}): {status}")
        if status == 200 and body:
            print(f"    Name: {body.get('name')}, Price: {body.get('price')}")

    if product_id:
        status, body, err = safe_request("GET", f"{BASE_URLS['inventory']}/api/inventory/{product_id}", headers=get_auth_headers())
        print(f"  GET Inventory (productId={product_id}): {status}")
        if status == 200 and body:
            print(f"    Quantity: {body.get('quantity')}, Reserved: {body.get('reservedQuantity')}")

    if user_id:
        status, body, err = safe_request("GET", f"{BASE_URLS['payment']}/api/wallets/{user_id}", headers=get_auth_headers())
        print(f"  GET Wallet (userId={user_id}): {status}")
        if status == 200 and body:
            print(f"    Balance: {body.get('balance')}")

    if order_id:
        status, body, err = safe_request("GET", f"{BASE_URLS['order']}/api/v1/orders/{order_id}", headers=get_auth_headers())
        print(f"  GET Order (id={order_id}): {status}")
        if status == 200 and body:
            print(f"    Status: {body.get('status')}, Total: {body.get('totalAmount')}")


# ============================================
# STEP 7: Collect Docker Logs
# ============================================
def collect_docker_logs():
    """Collect Docker logs for Kafka event propagation analysis."""
    print("\n>>> STEP 7: Collecting Docker logs...")

    services = {
        "order-service": "ecommerce-order-service",
        "inventory-service": "ecommerce-inventory-service",
        "payment-service": "ecommerce-payment-service",
        "notification-service": "ecommerce-notification-service",
    }

    logs = {}
    for svc_name, container_name in services.items():
        print(f"\n--- {svc_name} logs (last 100 lines) ---")
        try:
            result = subprocess.run(
                ["docker", "logs", "--tail=100", container_name],
                capture_output=True, text=True, timeout=30
            )
            output = result.stdout + result.stderr
            logs[svc_name] = output
            # Print last 40 lines to keep output manageable
            lines = output.strip().split('\n')
            for line in lines[-40:]:
                print(f"  {line}")
        except subprocess.TimeoutExpired:
            logs[svc_name] = "TIMEOUT: Could not retrieve logs"
            print(f"  TIMEOUT: Could not retrieve logs for {container_name}")
        except Exception as e:
            logs[svc_name] = f"ERROR: {str(e)}"
            print(f"  ERROR: {str(e)}")

    return logs


# ============================================
# STEP 8: Check PostgreSQL databases
# ============================================
def check_databases():
    """Check PostgreSQL tables for populated data."""
    print("\n>>> STEP 8: Checking PostgreSQL databases...")

    checks = [
        ("payment_db", "SELECT COUNT(*) as wallet_count FROM wallets;"),
        ("payment_db", "SELECT * FROM wallets LIMIT 5;"),
        ("order_service_db", "SELECT COUNT(*) as order_count FROM orders;"),
        ("order_service_db", "SELECT * FROM orders LIMIT 5;"),
        ("inventory_db", "SELECT COUNT(*) as inventory_count FROM inventory;"),
        ("inventory_db", "SELECT * FROM inventory LIMIT 5;"),
        ("product_service_db", "SELECT COUNT(*) as product_count FROM products;"),
        ("product_service_db", "SELECT * FROM products LIMIT 5;"),
    ]

    db_results = {}
    for db, query in checks:
        print(f"\n  DB: {db} | Query: {query.strip()}")
        try:
            result = subprocess.run(
                [
                    "docker", "exec", "ecommerce-postgres",
                    "psql", "-U", "postgres", "-d", db,
                    "-c", query
                ],
                capture_output=True, text=True, timeout=15
            )
            output = result.stdout + result.stderr
            db_results[f"{db}:{query.strip()}"] = output
            for line in output.strip().split('\n'):
                print(f"    {line}")
        except subprocess.TimeoutExpired:
            print(f"    TIMEOUT")
        except Exception as e:
            print(f"    ERROR: {str(e)}")

    return db_results


# ============================================
# Main Execution
# ============================================
def main():
    print("=" * 70)
    print("E2E SAGA FLOW TEST - Event-Driven E-Commerce Platform")
    print(f"Started at: {datetime.now().isoformat()}")
    print(f"Test user: {TEST_USER['email']} | Phone: {TEST_USER['phoneNumber']}")
    print("=" * 70)

    # Execute the 6 test steps sequentially
    step1 = test_register()
    step2 = test_login() if step1 else False
    step3 = test_wallet() if step2 else False
    step4 = test_create_product()  # Independent of auth
    step5 = test_add_inventory() if step4 else False
    step6 = test_place_order()  # Depends on product_id

    # Wait for Kafka event propagation
    print("\n>>> Waiting 5 seconds for Kafka event propagation...")
    time.sleep(5)

    # Verify entities
    verify_entities()

    # Collect Docker logs
    logs = collect_docker_logs()

    # Check databases
    db_results = check_databases()

    # ============================================
    # FINAL REPORT
    # ============================================
    print("\n" + "=" * 70)
    print("FINAL E2E TEST REPORT")
    print(f"Completed at: {datetime.now().isoformat()}")
    print("=" * 70)

    print("\n=== 1. API EXECUTION SUMMARY ===")
    for r in results:
        status = "PASS" if r["passed"] else "FAIL"
        error_info = ""
        if not r["passed"]:
            if r["error_msg"]:
                error_info = f" - {r['error_msg']}"
            elif r["response_body"]:
                body = r["response_body"]
                if isinstance(body, dict):
                    error_info = f" - {body.get('error', body.get('message', json.dumps(body, default=str)[:200]))}"
                else:
                    error_info = f" - {str(body)[:200]}"

        print(f"  Step {r['step']} ({r['name']}): [{status}] - Status Code: {r['status_code']}{error_info}")

    print(f"\n  Test Data Used:")
    print(f"    Email: {TEST_USER['email']}")
    print(f"    Phone: {TEST_USER['phoneNumber']}")
    print(f"    User ID: {user_id}")
    print(f"    JWT Token: {'Yes (' + jwt_token[:30] + '...)' if jwt_token else 'No'}")
    print(f"    Product ID: {product_id}")
    print(f"    Order ID: {order_id}")

    print("\n=== 2. SECURITY BLOCKERS IDENTIFIED ===")
    security_blocked = False
    for r in results:
        if r["status_code"] in [401, 403]:
            security_blocked = True
            print(f"  - Step {r['step']} ({r['name']}): HTTP {r['status_code']}")
            if r["response_body"]:
                print(f"    Response: {json.dumps(r['response_body'], default=str)[:300]}")
    if not security_blocked:
        print("  No 401/403 security blockers detected on API endpoints.")

    print("\n=== 3. KAFKA EVENT PROPAGATION LOG ===")
    kafka_keywords = {
        "order-service": [
            ("Published OrderCreatedEvent", False),
            ("Received StockReservedEvent", False),
            ("Published PaymentRequestEvent", False),
            ("Received PaymentSuccessEvent", False),
            ("Order status updated to PENDING", False),
            ("Order status updated to PAID", False),
        ],
        "inventory-service": [
            ("Received OrderCreatedEvent", False),
            ("Stock reserved successfully", False),
            ("Published StockReservedEvent", False),
            ("Finished processing OrderCreatedEvent", False),
        ],
        "payment-service": [
            ("Received PaymentRequestEvent", False),
            ("Payment processing completed", False),
            ("Published PaymentSuccessEvent", False),
        ],
        "notification-service": [
            ("Received OrderCreatedEvent", False),
            ("Sending order confirmation email", False),
            ("Finished processing OrderCreatedEvent", False),
        ],
    }

    for svc_name, log_output in logs.items():
        print(f"\n  --- {svc_name} ---")
        for keyword, _ in kafka_keywords.get(svc_name, []):
            found = keyword.lower() in log_output.lower()
            # Update the keyword status
            kafka_keywords[svc_name] = [(k, found) if k == keyword else (k, f) for k, f in kafka_keywords.get(svc_name, [])]
            marker = "YES" if found else "NO"
            print(f"    [{marker}] '{keyword}'")

        # Check for errors
        error_lines = [line for line in log_output.split('\n') if 'error' in line.lower() or 'exception' in line.lower() or 'serialization' in line.lower()]
        if error_lines:
            print(f"    Errors found ({len(error_lines)}):")
            for line in error_lines[:5]:
                print(f"      {line.strip()[:200]}")

    print("\n=== 4. DATABASE & HIBERNATE STATE ===")
    for key, output in db_results.items():
        db, query = key.split(":", 1)
        print(f"\n  DB: {db}")
        print(f"  Query: {query.strip()}")
        if "error" in output.lower() or "does not exist" in output.lower():
            print(f"  Status: ERROR - Table may not exist or query failed")
            for line in output.strip().split('\n'):
                if 'error' in line.lower() or 'does not exist' in line.lower():
                    print(f"    {line.strip()}")
        else:
            print(f"  Status: OK")
            for line in output.strip().split('\n'):
                print(f"    {line.strip()}")

    print("\n=== 5. CRITICAL ERRORS & EXCEPTIONS ===")
    all_errors = []
    for svc_name, log_output in logs.items():
        lines = log_output.split('\n')
        for i, line in enumerate(lines):
            lower = line.lower()
            if any(x in lower for x in ['exception', 'error', 'nullpointer', 'beancreation', 'serialization']):
                context = lines[max(0,i):min(len(lines),i+3)]
                all_errors.append((svc_name, context))

    if all_errors:
        print(f"  Found {len(all_errors)} error-related log entries:")
        for svc, ctx in all_errors[:15]:
            print(f"\n  [{svc}]")
            for line in ctx:
                print(f"    {line.strip()[:200]}")
    else:
        print("  No critical errors or exceptions detected in logs.")

    print("\n" + "=" * 70)
    print("END OF REPORT")
    print("=" * 70)


if __name__ == "__main__":
    main()
