import { Module } from '@nestjs/common';
import { InteractionKernelController } from '../../adapters/inbound/http/interaction-kernel.controller';
import { InteractionKernelService } from './interaction-kernel.service';

@Module({
  controllers: [InteractionKernelController],
  providers: [InteractionKernelService],
  exports: [InteractionKernelService],
})
export class InteractionKernelModule {}
