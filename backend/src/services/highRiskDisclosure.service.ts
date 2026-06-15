import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { HighRiskDisclosure } from '../models/highRiskDisclosure.entity';
import { DisclosureStatus, HighRiskWorkType } from '../types/enums';

@Injectable()
export class HighRiskDisclosureService {
  constructor(
    @InjectRepository(HighRiskDisclosure)
    private readonly disclosureRepository: Repository<HighRiskDisclosure>,
  ) {}

  async list(query: {
    workType?: HighRiskWorkType;
    status?: DisclosureStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const where: FindOptionsWhere<HighRiskDisclosure> = {};

    if (query.workType) where.workType = query.workType;
    if (query.status) where.status = query.status;
    if (query.startDate && query.endDate) {
      where.scheduledAt = Between(new Date(query.startDate), new Date(query.endDate));
    }

    const [items, total] = await this.disclosureRepository.findAndCount({
      where,
      order: { scheduledAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize };
  }

  async getById(id: number) {
    const disclosure = await this.disclosureRepository.findOne({ where: { id } });
    if (!disclosure) throw new NotFoundException('高危作业交底不存在');
    return disclosure;
  }

  async create(payload: Partial<HighRiskDisclosure>) {
    const disclosure = this.disclosureRepository.create({
      ...payload,
      scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : new Date(),
      signers: payload.signers ?? [],
      photoUrls: payload.photoUrls ?? [],
      status: DisclosureStatus.Draft,
      createdById: payload.createdById ?? 1,
      timeline: [
        {
          at: new Date().toISOString(),
          label: '交底单已创建',
          actorId: payload.createdById ?? 1,
          note: payload.workContent,
        },
      ],
    });
    return this.disclosureRepository.save(disclosure);
  }

  async sign(id: number, signer: { name: string; role: string }, actorId: number) {
    const disclosure = await this.getById(id);
    const newSigner = { ...signer, signedAt: new Date().toISOString() };
    disclosure.signers = [...disclosure.signers, newSigner];
    disclosure.status = DisclosureStatus.Signed;
    disclosure.timeline = [
      ...(disclosure.timeline ?? []),
      {
        at: new Date().toISOString(),
        label: `${signer.role} ${signer.name} 已签字确认`,
        actorId,
      },
    ];
    return this.disclosureRepository.save(disclosure);
  }

  async close(id: number, actorId: number, note?: string) {
    const disclosure = await this.getById(id);
    disclosure.status = DisclosureStatus.Closed;
    disclosure.timeline = [
      ...(disclosure.timeline ?? []),
      {
        at: new Date().toISOString(),
        label: '交底已关闭',
        actorId,
        note,
      },
    ];
    return this.disclosureRepository.save(disclosure);
  }
}
