import {
  DeliveryError,
  type IntegrationReceipt,
  type InteractionEnvelope,
} from './contracts';

export class InteractionKernelHttpBridge {
  constructor(
    private readonly url?: string,
    private readonly token?: string,
    private readonly transport: typeof fetch = fetch,
  ) {}

  async execute(envelope: InteractionEnvelope): Promise<IntegrationReceipt> {
    if (!this.url) throw new DeliveryError('PROVIDER_UNCONFIGURED', false);
    let response: Response;
    try {
      response = await this.transport(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          'Idempotency-Key': envelope.idempotency_key ?? envelope.id,
          'X-Correlation-ID': envelope.correlation_id ?? envelope.id,
          ...(envelope.source.organization
            ? { 'X-Organization-ID': envelope.source.organization }
            : {}),
        },
        body: JSON.stringify(envelope),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new DeliveryError('PROVIDER_UNAVAILABLE');
    }
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new DeliveryError('INVALID_RECEIPT', false);
    }
    const rawRecord = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
    const candidate =
      rawRecord && typeof rawRecord.status === 'string'
        ? rawRecord
        : rawRecord && 'data' in rawRecord
          ? rawRecord.data
          : raw;
    if (!response.ok || !candidate || typeof candidate !== 'object')
      throw new DeliveryError(
        response.status >= 500 || response.status === 429
          ? 'PROVIDER_UNAVAILABLE'
          : 'PROVIDER_REJECTED',
        response.status >= 500 || response.status === 429,
      );
    const receipt = candidate as Record<string, unknown>;
    const status = receipt.status;
    if (status === 'accepted' || status === 'succeeded')
      return {
        status,
        external_reference:
          typeof receipt.external_reference === 'string'
            ? receipt.external_reference
            : undefined,
        data:
          receipt.data && typeof receipt.data === 'object' && !Array.isArray(receipt.data)
            ? (receipt.data as Record<string, unknown>)
            : {},
      };
    if (status === 'blocked' || status === 'rejected' || status === 'failed')
      throw new DeliveryError(
        typeof receipt.code === 'string' ? receipt.code : 'PROVIDER_REJECTED',
        receipt.retryable === true,
      );
    throw new DeliveryError('INVALID_RECEIPT', false);
  }
}
