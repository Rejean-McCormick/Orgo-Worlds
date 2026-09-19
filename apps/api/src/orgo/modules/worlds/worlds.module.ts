import { Module } from '@nestjs/common';
import { WorldsService } from './worlds.service';

@Module({
  providers: [WorldsService],
  exports: [WorldsService],
})
export class WorldsModule {}
