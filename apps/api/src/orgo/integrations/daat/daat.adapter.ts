import type { IntegrationPort, IntegrationRequest } from '../interaction-kernel/contracts';
import { InteractionKernelHttpBridge } from '../interaction-kernel/http-bridge';
import { daatEnvelope } from '../interaction-kernel/outbound';

export class DaatAdapter implements IntegrationPort {
  private readonly bridge = new InteractionKernelHttpBridge(
    process.env.DAAT_IK_URL ?? process.env.DAAT_BRIDGE_URL,
    process.env.DAAT_IK_TOKEN ?? process.env.DAAT_BRIDGE_TOKEN,
  );
  execute(request: IntegrationRequest) {
    return this.bridge.execute(daatEnvelope(request));
  }
}
