import { Body, Controller, Get, Headers, Inject, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { InteractionKernelService } from '../../../modules/interaction-kernel/interaction-kernel.service';
import {
  contextFromHeaders,
  type HeaderBag,
} from '../../../modules/worlds/worlds.service';

const artifactQuery = z
  .object({
    subject_type: z.enum(['case', 'task']),
    subject_id: z.string().uuid(),
  })
  .strict();
const recordId = z.string().min(1).max(500);

@Controller('ik')
export class InteractionKernelController {
  constructor(
    @Inject(InteractionKernelService)
    private readonly ik: InteractionKernelService,
  ) {}

  @Post('interactions')
  receive(@Headers() headers: HeaderBag, @Body() body: unknown) {
    return this.ik.receive(contextFromHeaders(headers), body);
  }

  @Post('exports')
  exportManifest(@Headers() headers: HeaderBag, @Body() body: unknown) {
    return this.ik.exportManifest(contextFromHeaders(headers), body);
  }

  @Post('artifact-links')
  linkArtifact(@Headers() headers: HeaderBag, @Body() body: unknown) {
    return this.ik.linkArtifact(contextFromHeaders(headers), body);
  }

  @Get('artifact-links')
  listArtifactLinks(@Headers() headers: HeaderBag, @Query() query: unknown) {
    return this.ik.listArtifactLinks(contextFromHeaders(headers), artifactQuery.parse(query));
  }

  @Post('build-records')
  createBuild(@Headers() headers: HeaderBag, @Body() body: unknown) {
    return this.ik.createBuildRecord(contextFromHeaders(headers), body);
  }

  @Get('build-records/:id')
  getBuild(@Headers() headers: HeaderBag, @Param('id') id: string) {
    return this.ik.getBuildRecord(contextFromHeaders(headers), recordId.parse(id));
  }

  @Post('release-records')
  createRelease(@Headers() headers: HeaderBag, @Body() body: unknown) {
    return this.ik.appendReleaseRecord(contextFromHeaders(headers), body);
  }

  @Get('release-records/:id')
  getRelease(@Headers() headers: HeaderBag, @Param('id') id: string) {
    return this.ik.getReleaseRecord(contextFromHeaders(headers), recordId.parse(id));
  }
}
