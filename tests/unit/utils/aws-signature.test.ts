/**
 * Unit tests for AWS Signature V4
 */

import { signRequest } from '../../../src/utils/aws-signature';
import { AWSCredentials } from '../../../src/types/sp-api';

describe('AWS Signature V4', () => {
  const mockCredentials: AWSCredentials = {
    accessKeyId: 'test_access_key',
    secretAccessKey: 'test_secret_key',
    region: 'us-east-1',
  };

  describe('signRequest', () => {
    it('should sign a GET request', () => {
      const options = {
        method: 'GET',
        url: 'https://sellingpartnerapi-na.amazon.com/orders/v0/orders',
      };

      const headers = signRequest(options, mockCredentials);

      expect(headers).toHaveProperty('Authorization');
      expect(headers).toHaveProperty('X-Amz-Date');
      expect(headers).toHaveProperty('host');
      expect(headers.host).toBe('sellingpartnerapi-na.amazon.com');
    });

    it('should sign a POST request with body', () => {
      const options = {
        method: 'POST',
        url: 'https://sellingpartnerapi-na.amazon.com/reports/2021-06-30/reports',
        body: JSON.stringify({ reportType: 'GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL' }),
      };

      const headers = signRequest(options, mockCredentials);

      expect(headers).toHaveProperty('Authorization');
      expect(headers).toHaveProperty('X-Amz-Date');
      expect(headers.Authorization).toContain('AWS4-HMAC-SHA256');
    });

    it('should include custom headers in signature', () => {
      const options = {
        method: 'GET',
        url: 'https://sellingpartnerapi-na.amazon.com/orders/v0/orders',
        headers: {
          'x-amz-access-token': 'test_access_token',
          'Content-Type': 'application/json',
        },
      };

      const headers = signRequest(options, mockCredentials);

      expect(headers).toHaveProperty('x-amz-access-token', 'test_access_token');
      expect(headers).toHaveProperty('Content-Type', 'application/json');
      expect(headers).toHaveProperty('Authorization');
    });

    it('should handle URL with query parameters', () => {
      const options = {
        method: 'GET',
        url: 'https://sellingpartnerapi-na.amazon.com/orders/v0/orders?MarketplaceIds=ATVPDKIKX0DER&CreatedAfter=2024-01-01',
      };

      const headers = signRequest(options, mockCredentials);

      expect(headers).toHaveProperty('Authorization');
      expect(headers).toHaveProperty('X-Amz-Date');
    });

    it('should use correct service name', () => {
      const options = {
        method: 'GET',
        url: 'https://sellingpartnerapi-na.amazon.com/orders/v0/orders',
      };

      const headers = signRequest(options, mockCredentials);

      // The Authorization header should contain the service name 'execute-api'
      expect(headers.Authorization).toContain('execute-api');
    });

    it('should use correct region', () => {
      const customCredentials: AWSCredentials = {
        accessKeyId: 'test_key',
        secretAccessKey: 'test_secret',
        region: 'eu-west-1',
      };

      const options = {
        method: 'GET',
        url: 'https://sellingpartnerapi-eu.amazon.com/orders/v0/orders',
      };

      const headers = signRequest(options, customCredentials);

      // The Authorization header should contain the region
      expect(headers.Authorization).toContain('eu-west-1');
    });

    it('should set host header from URL', () => {
      const options = {
        method: 'GET',
        url: 'https://sellingpartnerapi-fe.amazon.com/orders/v0/orders',
      };

      const headers = signRequest(options, mockCredentials);

      expect(headers.host).toBe('sellingpartnerapi-fe.amazon.com');
    });

    it('should handle different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      methods.forEach((method) => {
        const options = {
          method,
          url: 'https://sellingpartnerapi-na.amazon.com/test',
        };

        const headers = signRequest(options, mockCredentials);
        expect(headers).toHaveProperty('Authorization');
      });
    });
  });
});
