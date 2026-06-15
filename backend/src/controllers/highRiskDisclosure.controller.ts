import { Body, Controller, Get, Param, Patch, Post, Query, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { highRiskDisclosureRoutes } from '../routes/highRiskDisclosure.routes';
import { HighRiskDisclosureService } from '../services/highRiskDisclosure.service';
import { DisclosureStatus, HighRiskWorkType, UserRole } from '../types/enums';
import { RequestWithUser } from '../types/interfaces';
import { toPublicUploadUrl } from '../utils/fileUpload';
import { page, ok } from '../utils/response';
import { uploadMulterOptions } from '../middlewares/upload.middleware';
import { assertRole } from '../middlewares/rbac.middleware';

@Controller(highRiskDisclosureRoutes.base)
export class HighRiskDisclosureController {
  constructor(private readonly disclosureService: HighRiskDisclosureService) {}

  @Get()
  async list(
    @Query('workType') workType?: HighRiskWorkType,
    @Query('status') status?: DisclosureStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') currentPage?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const result = await this.disclosureService.list({
      workType,
      status,
      startDate,
      endDate,
      page: Number(currentPage ?? 1),
      pageSize: Number(pageSize ?? 20),
    });
    return page(result.items, result.total, result.page, result.pageSize);
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return ok(await this.disclosureService.getById(Number(id)));
  }

  @Post()
  @UseInterceptors(FilesInterceptor('photos', 6, uploadMulterOptions))
  async create(
    @Body() body: Record<string, unknown>,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Req() req: RequestWithUser,
  ) {
    req.auditAction = '高危作业交底创建';
    const photoUrls = [
      ...this.readJsonArray<string>(body.photoUrls),
      ...files.map((file) => toPublicUploadUrl(file.filename)),
    ];
    return ok(
      await this.disclosureService.create({
        ...body,
        signers: this.readJsonArray<{ name: string; role: string }>(body.signers),
        photoUrls,
        createdById: req.user?.id ?? Number(body.createdById ?? 1),
      }),
      '交底单已创建',
    );
  }

  @Patch(highRiskDisclosureRoutes.sign)
  async sign(
    @Param('id') id: string,
    @Body() body: { name: string; role: string },
    @Req() req: RequestWithUser,
  ) {
    req.auditAction = '高危作业交底签字';
    return ok(
      await this.disclosureService.sign(
        Number(id),
        { name: body.name, role: body.role },
        req.user?.id ?? 1,
      ),
    );
  }

  @Patch(highRiskDisclosureRoutes.close)
  async close(@Param('id') id: string, @Body() body: { note?: string }, @Req() req: RequestWithUser) {
    assertRole(req, UserRole.Admin, UserRole.SafetyManager);
    req.auditAction = '高危作业交底关闭';
    return ok(await this.disclosureService.close(Number(id), req.user?.id ?? 1, body.note));
  }

  private readJsonArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    if (typeof value !== 'string' || value.length === 0) return [];
    try {
      return JSON.parse(value) as T[];
    } catch {
      return [];
    }
  }
}
