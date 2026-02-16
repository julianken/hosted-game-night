# Initiative 1: Platform Hub - Core Infrastructure

## Purpose

Build Platform Hub as the central authentication, authorization, and administration system for Joolie Boolie. Implements OAuth 2.1 authorization server, RBAC, multi-tenancy, and facility management tools.

## Scope

### OAuth Authorization Server
- OAuth 2.1 endpoints (authorize, token, introspect)
- PKCE validation and security controls
- Client registration and management
- Session management with Redis
- Supabase auth integration

### Client Integration
- Bingo OAuth client integration
- Trivia OAuth client integration
- Protected routes and API authentication

### Access Control
- Role-Based Access Control (RBAC)
- 5-tier role system: super_admin → facility_admin → host → player → viewer
- Permission inheritance
- Facility-scoped multi-tenancy

### Admin & Management
- User management interface
- Staff scheduling system
- Activity logs and audit trails
- Facility settings and configuration
- Analytics dashboard

## Architecture

**OAuth Flow:** Client apps → Platform Hub authorization → User consent → Token exchange → Protected API access

**Security:** OAuth 2.1 + PKCE, JWT access tokens, refresh token rotation, httpOnly cookies, rate limiting, comprehensive audit logging

## Definition of Done

- OAuth server operational with all security controls
- Bingo and Trivia authenticate via Platform Hub
- RBAC enforced across all applications
- Admin UI functional for facility management
- Security audit passed
- Production deployed with monitoring
