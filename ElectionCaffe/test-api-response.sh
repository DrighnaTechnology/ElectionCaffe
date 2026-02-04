#!/bin/bash

echo "Testing /organization/my-features API endpoint..."
echo ""
echo "First, let's get a user's auth token."
echo ""

# You need to replace these with actual values from your database
TENANT_SLUG="tn-bjp"
USER_EMAIL="admin@example.com"  # Replace with actual user email
USER_PASSWORD="password"         # Replace with actual password

echo "Attempting login for tenant: $TENANT_SLUG"
echo ""

# Login to get token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$USER_EMAIL\",
    \"password\": \"$USER_PASSWORD\",
    \"tenantSlug\": \"$TENANT_SLUG\"
  }")

echo "Login Response:"
echo "$LOGIN_RESPONSE" | jq '.'
echo ""

# Extract access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token. Please check:"
  echo "   1. Auth service is running on port 3000"
  echo "   2. User credentials are correct"
  echo "   3. Tenant slug is correct"
  echo ""
  echo "You can get user info from database:"
  echo "   SELECT email, tenantId FROM \"User\" LIMIT 1;"
  exit 1
fi

echo "✅ Got access token!"
echo ""
echo "Now testing /organization/my-features endpoint..."
echo ""

# Test my-features endpoint
FEATURES_RESPONSE=$(curl -s -X GET http://localhost:3000/api/organization/my-features \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo "My Features Response:"
echo "$FEATURES_RESPONSE" | jq '.'
echo ""

# Check for fund_management and inventory_management
FUND_ENABLED=$(echo "$FEATURES_RESPONSE" | jq -r '.data.features[] | select(.featureKey == "fund_management") | .isEnabled')
INVENTORY_ENABLED=$(echo "$FEATURES_RESPONSE" | jq -r '.data.features[] | select(.featureKey == "inventory_management") | .isEnabled')

echo "Feature Status:"
echo "  fund_management: $FUND_ENABLED"
echo "  inventory_management: $INVENTORY_ENABLED"
