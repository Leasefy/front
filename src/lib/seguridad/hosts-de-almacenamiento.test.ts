import { describe, expect, it } from 'vitest';
import { esHostDeS3Privado, hostDeAssets, esHostDeAlmacenamientoNuevo } from './hosts-de-almacenamiento';

describe('esHostDeS3Privado', () => {
  it.each([
    'leasefy-prod-files.s3.us-east-2.amazonaws.com',
    'leasefy-prod-avaluo.s3.us-east-2.amazonaws.com',
  ])('accepts %s', (h) => expect(esHostDeS3Privado(h)).toBe(true));

  it.each([
    'leasefy-prod-evil.s3.us-east-2.amazonaws.com',
    'leasefy-prod-files2.s3.us-east-2.amazonaws.com',
    'leasefy-prod-a.b.s3.us-east-2.amazonaws.com',
    'leasefy-prod-public.s3.us-east-2.amazonaws.com',
    'other-bucket.s3.us-east-2.amazonaws.com',
    'leasefy-prod-files.s3.us-east-1.amazonaws.com',
    's3.us-east-2.amazonaws.com',
    'leasefy-prod-files.s3.us-east-2.amazonaws.com.evil.com',
    'evil.com/leasefy-prod-files.s3.us-east-2.amazonaws.com',
    'xleasefy-prod-files.s3.us-east-2.amazonaws.com',
    'a.leasefy-prod-files.s3.us-east-2.amazonaws.com',
    'leasefy-prod-.s3.us-east-2.amazonaws.com',
    'LEASEFY-PROD-FILES.s3.us-east-2.amazonaws.com.',
    '',
  ])('rejects %s', (h) => expect(esHostDeS3Privado(h)).toBe(false));
});

describe('hostDeAssets', () => {
  it('returns null when unset or blank', () => {
    expect(hostDeAssets(undefined)).toBeNull();
    expect(hostDeAssets('   ')).toBeNull();
  });
  it('normalizes a bare hostname', () => {
    expect(hostDeAssets(' D111.CloudFront.net ')).toBe('d111.cloudfront.net');
  });
  it('tolerates a pasted URL and keeps only the host', () => {
    expect(hostDeAssets('https://files.leasefy.co/')).toBe('files.leasefy.co');
  });
  it('rejects wildcards and garbage', () => {
    expect(hostDeAssets('*.cloudfront.net')).toBeNull();
    expect(hostDeAssets('a b')).toBeNull();
    expect(hostDeAssets('x.com/path')).toBeNull();
  });
});

describe('esHostDeAlmacenamientoNuevo', () => {
  it('accepts the exact CloudFront host and the S3 pattern only', () => {
    expect(esHostDeAlmacenamientoNuevo('d111.cloudfront.net', 'd111.cloudfront.net')).toBe(true);
    expect(esHostDeAlmacenamientoNuevo('e222.cloudfront.net', 'd111.cloudfront.net')).toBe(false);
    expect(esHostDeAlmacenamientoNuevo('d111.cloudfront.net', undefined)).toBe(false);
    expect(esHostDeAlmacenamientoNuevo('leasefy-prod-files.s3.us-east-2.amazonaws.com', undefined)).toBe(true);
  });
});

import { BUCKETS_S3 } from './politica-de-contenido';
import { HOSTS_S3_DATA } from './buckets-s3.data.mjs';

describe('one shared bucket list', () => {
  it('CSP origins are derived from the shared list', () => {
    expect([...BUCKETS_S3]).toEqual(HOSTS_S3_DATA.map((h) => `https://${h}`));
  });
});
