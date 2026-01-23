/**
 * Body Size Middleware Tests
 *
 * Tests for request body size limit enforcement
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  isBodySizeWithinLimit,
  checkBodySize,
  createPayloadTooLargeResponse,
  applyBodySizeCheck,
  MAX_BODY_SIZE_BYTES,
  DEFAULT_MAX_BODY_SIZE_MB,
} from '../body-size';

describe('Body Size Middleware', () => {
  const originalEnv = process.env.MAX_BODY_SIZE_MB;

  beforeEach(() => {
    // Reset env var before each test
    delete process.env.MAX_BODY_SIZE_MB;
  });

  afterEach(() => {
    // Restore original env var
    if (originalEnv) {
      process.env.MAX_BODY_SIZE_MB = originalEnv;
    } else {
      delete process.env.MAX_BODY_SIZE_MB;
    }
  });

  describe('isBodySizeWithinLimit', () => {
    it('should return true for requests without Content-Length header', () => {
      const request = new NextRequest('http://localhost:3002/api/test', {
        method: 'POST',
      });

      expect(isBodySizeWithinLimit(request)).toBe(true);
    });

    it('should return true for requests within size limit', () => {
      const request = new NextRequest('http://localhost:3002/api/test', {
        method: 'POST',
        headers: {
          'content-length': '500', // 500 bytes (well under 1MB)
        },
      });

      expect(isBodySizeWithinLimit(request)).toBe(true);
    });

    it('should return true for requests exactly at size limit', () => {
      const maxSize = DEFAULT_MAX_BODY_SIZE_MB * 1024 * 1024;
      const request = new NextRequest('http://localhost:3002/api/test', {
        method: 'POST',
        headers: {
          'content-length': String(maxSize),
        },
      });

      expect(isBodySizeWithinLimit(request)).toBe(true);
    });

    it('should return false for requests exceeding size limit', () => {
      const maxSize = DEFAULT_MAX_BODY_SIZE_MB * 1024 * 1024;
      const oversized = maxSize + 1;
      const request = new NextRequest('http://localhost:3002/api/test', {
        method: 'POST',
        headers: {
          'content-length': String(oversized),
        },
      });

      expect(isBodySizeWithinLimit(request)).toBe(false);
    });

    it('should return false for very large requests', () => {
      const request = new NextRequest('http://localhost:3002/api/test', {
        method: 'POST',
        headers: {
          'content-length': String(100 * 1024 * 1024), // 100MB
        },
      });

      expect(isBodySizeWithinLimit(request)).toBe(false);
    });
  });

  describe('createPayloadTooLargeResponse', () => {
    it('should return 413 status code', () => {
      const response = createPayloadTooLargeResponse();
      expect(response.status).toBe(413);
    });

    it('should include error details in response body', async () => {
      const response = createPayloadTooLargeResponse();
      const body = await response.json();

      expect(body).toHaveProperty('error', 'payload_too_large');
      expect(body).toHaveProperty('error_description');
      expect(body).toHaveProperty('max_size_bytes');
      expect(body).toHaveProperty('max_size_mb');
    });

    it('should set Content-Type to application/json', () => {
      const response = createPayloadTooLargeResponse();
      expect(response.headers.get('content-type')).toBe('application/json');
    });

    it('should include correct max size in MB', async () => {
      const response = createPayloadTooLargeResponse();
      const body = await response.json();

      expect(body.max_size_mb).toBe(DEFAULT_MAX_BODY_SIZE_MB);
      expect(body.max_size_bytes).toBe(MAX_BODY_SIZE_BYTES);
    });
  });

  describe('checkBodySize', () => {
    it('should return null for requests within size limit', () => {
      const request = new NextRequest('http://localhost:3002/api/test', {
        method: 'POST',
        headers: {
          'content-length': '500',
        },
      });

      expect(checkBodySize(request)).toBe(null);
    });

    it('should return 413 response for oversized requests', () => {
      const maxSize = DEFAULT_MAX_BODY_SIZE_MB * 1024 * 1024;
      const request = new NextRequest('http://localhost:3002/api/test', {
        method: 'POST',
        headers: {
          'content-length': String(maxSize + 1),
        },
      });

      const response = checkBodySize(request);
      expect(response).not.toBe(null);
      expect(response?.status).toBe(413);
    });
  });

  describe('applyBodySizeCheck', () => {
    it('should return original response for valid requests', () => {
      const request = new NextRequest('http://localhost:3002/api/test', {
        method: 'POST',
        headers: {
          'content-length': '500',
        },
      });

      const originalResponse = NextResponse.next();
      const result = applyBodySizeCheck(request, originalResponse);

      expect(result).toBe(originalResponse);
    });

    it('should return 413 response for oversized requests', () => {
      const maxSize = DEFAULT_MAX_BODY_SIZE_MB * 1024 * 1024;
      const request = new NextRequest('http://localhost:3002/api/test', {
        method: 'POST',
        headers: {
          'content-length': String(maxSize + 1),
        },
      });

      const originalResponse = NextResponse.next();
      const result = applyBodySizeCheck(request, originalResponse);

      expect(result).not.toBe(originalResponse);
      expect(result.status).toBe(413);
    });
  });

  describe('Request method handling', () => {
    it('should check body size for POST requests', () => {
      const maxSize = DEFAULT_MAX_BODY_SIZE_MB * 1024 * 1024;
      const request = new NextRequest('http://localhost:3002/api/test', {
        method: 'POST',
        headers: {
          'content-length': String(maxSize + 1),
        },
      });

      const response = checkBodySize(request);
      expect(response?.status).toBe(413);
    });

    it('should check body size for PUT requests', () => {
      const maxSize = DEFAULT_MAX_BODY_SIZE_MB * 1024 * 1024;
      const request = new NextRequest('http://localhost:3002/api/test', {
        method: 'PUT',
        headers: {
          'content-length': String(maxSize + 1),
        },
      });

      const response = checkBodySize(request);
      expect(response?.status).toBe(413);
    });

    it('should check body size for PATCH requests', () => {
      const maxSize = DEFAULT_MAX_BODY_SIZE_MB * 1024 * 1024;
      const request = new NextRequest('http://localhost:3002/api/test', {
        method: 'PATCH',
        headers: {
          'content-length': String(maxSize + 1),
        },
      });

      const response = checkBodySize(request);
      expect(response?.status).toBe(413);
    });
  });

  describe('Edge cases', () => {
    it('should handle requests with invalid Content-Length', async () => {
      const request = new NextRequest('http://localhost:3002/api/test', {
        method: 'POST',
        headers: {
          'content-length': 'invalid',
        },
      });

      // Invalid Content-Length should return 400 Bad Request
      const response = checkBodySize(request);
      expect(response?.status).toBe(400);
      expect(response).toBeDefined();
      if (response) {
        const body = await response.json();
        expect(body).toMatchObject({
          error: 'invalid_request',
          error_description: expect.stringContaining('invalid'),
        });
      }
    });

    it('should handle requests with negative Content-Length', async () => {
      const request = new NextRequest('http://localhost:3002/api/test', {
        method: 'POST',
        headers: {
          'content-length': '-1',
        },
      });

      // Negative Content-Length should return 400 Bad Request
      const response = checkBodySize(request);
      expect(response?.status).toBe(400);
      expect(response).toBeDefined();
      if (response) {
        const body = await response.json();
        expect(body).toMatchObject({
          error: 'invalid_request',
          error_description: expect.stringContaining('invalid'),
        });
      }
    });

    it('should handle requests with zero Content-Length', () => {
      const request = new NextRequest('http://localhost:3002/api/test', {
        method: 'POST',
        headers: {
          'content-length': '0',
        },
      });

      expect(isBodySizeWithinLimit(request)).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should reject file upload exceeding limit', () => {
      const maxSize = DEFAULT_MAX_BODY_SIZE_MB * 1024 * 1024;
      const largeFile = maxSize + 1024; // 1KB over limit

      const request = new NextRequest('http://localhost:3002/api/upload', {
        method: 'POST',
        headers: {
          'content-length': String(largeFile),
          'content-type': 'multipart/form-data',
        },
      });

      const response = checkBodySize(request);
      expect(response?.status).toBe(413);
    });

    it('should allow JSON payload within limit', () => {
      const jsonSize = 500 * 1024; // 500KB

      const request = new NextRequest('http://localhost:3002/api/data', {
        method: 'POST',
        headers: {
          'content-length': String(jsonSize),
          'content-type': 'application/json',
        },
      });

      expect(checkBodySize(request)).toBe(null);
    });

    it('should allow form data within limit', () => {
      const formSize = 100 * 1024; // 100KB

      const request = new NextRequest('http://localhost:3002/api/form', {
        method: 'POST',
        headers: {
          'content-length': String(formSize),
          'content-type': 'application/x-www-form-urlencoded',
        },
      });

      expect(checkBodySize(request)).toBe(null);
    });
  });
});
