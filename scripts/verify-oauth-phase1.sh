#!/usr/bin/env bash
#
# verify-oauth-phase1.sh
#
# Verification script for OAuth Phase 1 configuration
# Usage: ./scripts/verify-oauth-phase1.sh
#
# This script verifies:
# 1. Supabase OAuth 2.1 server is enabled
# 2. OIDC discovery endpoint returns valid metadata
# 3. JWKS endpoint is accessible
# 4. Required environment variables are set
#
# Exit codes:
# 0 - All checks passed
# 1 - One or more checks failed

set -e  # Exit on error

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_check() {
    echo -e "${YELLOW}Checking:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((CHECKS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_header "Checking Dependencies"

    if ! command -v curl &> /dev/null; then
        print_error "curl is not installed. Please install curl."
        exit 1
    fi
    print_success "curl is installed"

    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Please install jq."
        exit 1
    fi
    print_success "jq is installed"
}

# Load environment variables from .env.local
load_env() {
    print_header "Loading Environment Variables"

    # Try to find .env.local in platform-hub
    ENV_FILE="apps/platform-hub/.env.local"

    if [ ! -f "$ENV_FILE" ]; then
        print_error ".env.local not found at $ENV_FILE"
        print_warning "Please create .env.local from .env.example"
        exit 1
    fi

    # Source the file to get NEXT_PUBLIC_SUPABASE_URL
    set -a
    source "$ENV_FILE"
    set +a

    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        print_error "NEXT_PUBLIC_SUPABASE_URL not set in $ENV_FILE"
        exit 1
    fi

    print_success "Environment variables loaded from $ENV_FILE"
    echo "   NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
}

# Verify OIDC discovery endpoint
verify_oidc_discovery() {
    print_header "Verifying OIDC Discovery Endpoint"

    DISCOVERY_URL="${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/openid-configuration"
    print_check "Fetching $DISCOVERY_URL"

    RESPONSE=$(curl -s -w "\n%{http_code}" "$DISCOVERY_URL")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" != "200" ]; then
        print_error "OIDC discovery endpoint returned HTTP $HTTP_CODE"
        print_warning "OAuth 2.1 server may not be enabled in Supabase Dashboard"
        return 1
    fi

    print_success "OIDC discovery endpoint accessible (HTTP 200)"

    # Validate JSON structure
    print_check "Validating OIDC metadata structure"

    ISSUER=$(echo "$BODY" | jq -r '.issuer' 2>/dev/null)
    AUTH_ENDPOINT=$(echo "$BODY" | jq -r '.authorization_endpoint' 2>/dev/null)
    TOKEN_ENDPOINT=$(echo "$BODY" | jq -r '.token_endpoint' 2>/dev/null)
    JWKS_URI=$(echo "$BODY" | jq -r '.jwks_uri' 2>/dev/null)
    PKCE_METHODS=$(echo "$BODY" | jq -r '.code_challenge_methods_supported[]' 2>/dev/null)

    if [ -z "$ISSUER" ] || [ "$ISSUER" = "null" ]; then
        print_error "Missing or invalid 'issuer' in OIDC metadata"
        return 1
    fi
    print_success "Issuer: $ISSUER"

    if [ -z "$AUTH_ENDPOINT" ] || [ "$AUTH_ENDPOINT" = "null" ]; then
        print_error "Missing or invalid 'authorization_endpoint'"
        return 1
    fi
    print_success "Authorization endpoint: $AUTH_ENDPOINT"

    if [ -z "$TOKEN_ENDPOINT" ] || [ "$TOKEN_ENDPOINT" = "null" ]; then
        print_error "Missing or invalid 'token_endpoint'"
        return 1
    fi
    print_success "Token endpoint: $TOKEN_ENDPOINT"

    if [ -z "$JWKS_URI" ] || [ "$JWKS_URI" = "null" ]; then
        print_error "Missing or invalid 'jwks_uri'"
        return 1
    fi
    print_success "JWKS URI: $JWKS_URI"

    if ! echo "$PKCE_METHODS" | grep -q "S256"; then
        print_error "PKCE S256 method not supported"
        print_warning "S256 is required for secure OAuth flows"
        return 1
    fi
    print_success "PKCE methods supported: $PKCE_METHODS"
}

# Verify JWKS endpoint
verify_jwks() {
    print_header "Verifying JWKS Endpoint"

    JWKS_URL="${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    print_check "Fetching $JWKS_URL"

    RESPONSE=$(curl -s -w "\n%{http_code}" "$JWKS_URL")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" != "200" ]; then
        print_error "JWKS endpoint returned HTTP $HTTP_CODE"
        return 1
    fi

    print_success "JWKS endpoint accessible (HTTP 200)"

    # Validate JSON structure
    print_check "Validating JWKS structure"

    KEY_COUNT=$(echo "$BODY" | jq '.keys | length' 2>/dev/null)

    if [ -z "$KEY_COUNT" ] || [ "$KEY_COUNT" = "null" ] || [ "$KEY_COUNT" -eq 0 ]; then
        print_error "No keys found in JWKS"
        return 1
    fi

    print_success "JWKS contains $KEY_COUNT key(s)"

    # Show key details
    echo "$BODY" | jq -r '.keys[] | "   - Algorithm: \(.alg), Key ID: \(.kid), Key Type: \(.kty)"'
}

# Verify environment variables in all apps
verify_env_vars() {
    print_header "Verifying App Environment Variables"

    # Check Bingo
    print_check "Checking apps/bingo/.env.example"
    if grep -q "NEXT_PUBLIC_OAUTH_CLIENT_ID" apps/bingo/.env.example; then
        print_success "Bingo .env.example has OAuth configuration"
    else
        print_error "Bingo .env.example missing OAuth configuration"
    fi

    # Check Trivia
    print_check "Checking apps/trivia/.env.example"
    if grep -q "NEXT_PUBLIC_OAUTH_CLIENT_ID" apps/trivia/.env.example; then
        print_success "Trivia .env.example has OAuth configuration"
    else
        print_error "Trivia .env.example missing OAuth configuration"
    fi
}

# Print summary
print_summary() {
    print_header "Verification Summary"

    TOTAL_CHECKS=$((CHECKS_PASSED + CHECKS_FAILED))

    if [ $CHECKS_FAILED -eq 0 ]; then
        echo -e "${GREEN}All checks passed!${NC} ($CHECKS_PASSED/$TOTAL_CHECKS)"
        echo ""
        echo "✓ OAuth 2.1 server is enabled and configured correctly"
        echo "✓ Ready to proceed with Phase 1 configuration"
        echo ""
        echo "Next steps:"
        echo "1. Register OAuth clients in Supabase Dashboard"
        echo "2. Update .env.local files with client IDs"
        echo "3. Proceed with BEA-260"
        return 0
    else
        echo -e "${RED}Some checks failed.${NC} ($CHECKS_PASSED passed, $CHECKS_FAILED failed out of $TOTAL_CHECKS)"
        echo ""
        echo "Please fix the errors above before proceeding with Phase 1."
        echo ""
        echo "Common fixes:"
        echo "1. Enable OAuth 2.1 server in Supabase Dashboard"
        echo "2. Check Supabase plan (Pro plan required)"
        echo "3. Verify NEXT_PUBLIC_SUPABASE_URL is correct"
        return 1
    fi
}

# Main execution
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║          OAuth Phase 1 Verification Script                   ║"
    echo "║          Beak Gaming Platform                                ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""

    check_dependencies
    load_env
    verify_oidc_discovery
    verify_jwks
    verify_env_vars

    echo ""
    print_summary

    if [ $CHECKS_FAILED -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main
