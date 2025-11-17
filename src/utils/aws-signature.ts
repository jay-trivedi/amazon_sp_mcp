/**
 * AWS Signature V4 for SP-API requests
 */

import * as aws4 from 'aws4';
import { AWSCredentials } from '../types/sp-api.js';

export interface SignRequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * Sign an HTTP request using AWS Signature Version 4
 */
export function signRequest(
  options: SignRequestOptions,
  credentials: AWSCredentials
): Record<string, string> {
  const url = new URL(options.url);

  const requestOptions = {
    host: url.host,
    path: url.pathname + url.search,
    method: options.method,
    headers: {
      ...options.headers,
      host: url.host,
    },
    body: options.body,
    service: 'execute-api',
    region: credentials.region,
  };

  // Sign the request
  const signed = aws4.sign(requestOptions, {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
  });

  // Return only the headers
  return signed.headers as Record<string, string>;
}
