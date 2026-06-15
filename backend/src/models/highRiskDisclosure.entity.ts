import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DisclosureStatus, HighRiskWorkType } from '../types/enums';

@Entity('high_risk_disclosure')
export class HighRiskDisclosure {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'enum', enum: HighRiskWorkType })
  workType!: HighRiskWorkType;

  @Column({ type: 'text' })
  workContent!: string;

  @Column({ type: 'text' })
  riskPoints!: string;

  @Column({ type: 'varchar', length: 120 })
  site!: string;

  @Column({ type: 'varchar', length: 120 })
  area!: string;

  @Column({ type: 'datetime' })
  scheduledAt!: Date;

  @Column({ type: 'json' })
  signers!: Array<{ name: string; role: string; signedAt?: string }>;

  @Column({ type: 'json' })
  photoUrls!: string[];

  @Column({ type: 'enum', enum: DisclosureStatus, default: DisclosureStatus.Draft })
  status!: DisclosureStatus;

  @Column({ type: 'text', nullable: true })
  safetyMeasures!: string | null;

  @Column({ type: 'int' })
  createdById!: number;

  @Column({ type: 'json', nullable: true })
  timeline!: Array<{ at: string; label: string; actorId?: number; note?: string }> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
