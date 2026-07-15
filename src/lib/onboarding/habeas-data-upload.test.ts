import { describe, it, expect, vi, afterEach } from 'vitest'
import { sha256Hex, uploadPdfToPresignedUrl, HabeasDataUploadError } from './habeas-data-upload'

function toArrayBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sha256Hex', () => {
  it('returns 64-char lowercase hex', async () => {
    const result = await sha256Hex(toArrayBuffer('hello'))
    expect(result).toMatch(/^[a-f0-9]{64}$/)
  })

  // Known vector — Pre-computed: printf '' | sha256sum
  it('returns the known SHA-256 for an empty ArrayBuffer', async () => {
    const result = await sha256Hex(new ArrayBuffer(0))
    expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  // Known vector — Pre-computed: printf 'hello' | sha256sum
  it('returns the known SHA-256 for "hello"', async () => {
    const result = await sha256Hex(toArrayBuffer('hello'))
    expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })

  it('accepts a Blob and hashes its contents (via arrayBuffer())', async () => {
    const blob = new Blob(['hello'], { type: 'application/pdf' })
    const result = await sha256Hex(blob)
    expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })

  it('is deterministic — same input produces the same output', async () => {
    const first = await sha256Hex(toArrayBuffer('leasify'))
    const second = await sha256Hex(toArrayBuffer('leasify'))
    expect(first).toBe(second)
  })

  it('produces different hashes for different inputs', async () => {
    const a = await sha256Hex(toArrayBuffer('leasify-a'))
    const b = await sha256Hex(toArrayBuffer('leasify-b'))
    expect(a).not.toBe(b)
  })
})

describe('uploadPdfToPresignedUrl', () => {
  function mockFile(): File {
    return new File(['%PDF-1.4 fake content'], 'habeas-data.pdf', { type: 'application/pdf' })
  }

  it('PUTs to the presigned URL with Content-Type: application/pdf and x-amz-server-side-encryption: AES256', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response)
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
    const file = mockFile()

    await uploadPdfToPresignedUrl('https://s3.example.com/bucket/key?sig=abc', file)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://s3.example.com/bucket/key?sig=abc')
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(file)
    const headers = init.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/pdf')
    expect(headers['x-amz-server-side-encryption']).toBe('AES256')
  })

  it('sends no Authorization header (S3 direct upload, not agent traffic)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response)
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    await uploadPdfToPresignedUrl('https://s3.example.com/bucket/key', mockFile())

    const [, init] = fetchMock.mock.calls[0]
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
    expect(headers.authorization).toBeUndefined()
  })

  it('throws HabeasDataUploadError when S3 responds with a non-ok status', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 } as Response)
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    await expect(uploadPdfToPresignedUrl('https://s3.example.com/bucket/key', mockFile())).rejects.toBeInstanceOf(
      HabeasDataUploadError,
    )
  })

  it('throws HabeasDataUploadError when fetch itself rejects (network failure)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('network error'))
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    await expect(uploadPdfToPresignedUrl('https://s3.example.com/bucket/key', mockFile())).rejects.toBeInstanceOf(
      HabeasDataUploadError,
    )
  })
})
