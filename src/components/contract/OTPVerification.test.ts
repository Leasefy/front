import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SendOtpResponse } from '@/lib/api/contracts.types';

// Mock the contract transport so we can assert the exact args the DEFAULT
// (no-adapter) branch of resolveOtpAdapter forwards to contractsApi.
vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: {
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
  },
}));

import { contractsApi } from '@/lib/api/contracts.service';
import { resolveOtpAdapter, type OtpAdapter } from './OTPVerification';

const mockedSendOtp = vi.mocked(contractsApi.sendOtp);
const mockedVerifyOtp = vi.mocked(contractsApi.verifyOtp);

beforeEach(() => {
  vi.clearAllMocks();
  mockedSendOtp.mockResolvedValue({
    sentTo: 'a***@b.com',
    expiresAt: '2026-07-20T00:10:00.000Z',
    cooldownSeconds: 90,
  });
  mockedVerifyOtp.mockResolvedValue({
    verificationToken: 'tok-1',
    expiresAt: '2026-07-20T00:05:00.000Z',
  });
});

describe('resolveOtpAdapter — default contract transport (ACUE-02 enabler)', () => {
  it('send() calls contractsApi.sendOtp(contractId, { role }) and returns { sentTo, cooldownSeconds }', async () => {
    const adapter = resolveOtpAdapter({ contractId: 'c1', role: 'tenant' });

    const res = await adapter.send();

    expect(mockedSendOtp).toHaveBeenCalledTimes(1);
    expect(mockedSendOtp).toHaveBeenCalledWith('c1', { role: 'tenant' });
    expect(res).toEqual({ sentTo: 'a***@b.com', cooldownSeconds: 90 });
  });

  it('send() defaults cooldownSeconds to 60 when the API omits it', async () => {
    // API response without cooldownSeconds — proves the `?? 60` fallback.
    mockedSendOtp.mockResolvedValueOnce({
      sentTo: 'a***@b.com',
      expiresAt: '2026-07-20T00:10:00.000Z',
    } as unknown as SendOtpResponse);

    const res = await resolveOtpAdapter({ contractId: 'c1', role: 'landlord' }).send();

    expect(res.cooldownSeconds).toBe(60);
    expect(res.sentTo).toBe('a***@b.com');
  });

  it('verify(code) calls contractsApi.verifyOtp(contractId, { role, code }) and returns { verificationToken }', async () => {
    const adapter = resolveOtpAdapter({ contractId: 'c1', role: 'tenant' });

    const res = await adapter.verify('123456');

    expect(mockedVerifyOtp).toHaveBeenCalledTimes(1);
    expect(mockedVerifyOtp).toHaveBeenCalledWith('c1', { role: 'tenant', code: '123456' });
    expect(res).toEqual({ verificationToken: 'tok-1' });
  });
});

describe('resolveOtpAdapter — injected adapter', () => {
  it('returns the injected adapter verbatim (identity) and never touches contractsApi', () => {
    const stub: OtpAdapter = {
      send: vi.fn(async () => ({ sentTo: 's***@x.com', cooldownSeconds: 30 })),
      verify: vi.fn(async () => ({ verificationToken: 'stub-tok' })),
    };

    const resolved = resolveOtpAdapter({ adapter: stub });

    expect(resolved).toBe(stub);
    expect(mockedSendOtp).not.toHaveBeenCalled();
    expect(mockedVerifyOtp).not.toHaveBeenCalled();
  });

  it('prefers the injected adapter even when contractId + role are also present', () => {
    const stub: OtpAdapter = {
      send: vi.fn(async () => ({ sentTo: 's***@x.com', cooldownSeconds: 30 })),
      verify: vi.fn(async () => ({ verificationToken: 'stub-tok' })),
    };

    expect(resolveOtpAdapter({ adapter: stub, contractId: 'c1', role: 'tenant' })).toBe(stub);
  });
});

describe('resolveOtpAdapter — total function (never a silent no-op)', () => {
  it('throws when neither an adapter nor contractId + role are provided', () => {
    expect(() => resolveOtpAdapter({})).toThrow();
  });

  it('throws when contractId is present but role is missing', () => {
    expect(() => resolveOtpAdapter({ contractId: 'c1' })).toThrow();
  });
});
