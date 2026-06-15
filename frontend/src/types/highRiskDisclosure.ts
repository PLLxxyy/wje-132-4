import { DisclosureStatus, HighRiskWorkType } from './enums';

export interface Signer {
  name: string;
  role: string;
  signedAt?: string;
}

export interface HighRiskDisclosure {
  id: number;
  title: string;
  workType: HighRiskWorkType;
  workContent: string;
  riskPoints: string;
  site: string;
  area: string;
  scheduledAt: string;
  signers: Signer[];
  photoUrls: string[];
  status: DisclosureStatus;
  safetyMeasures: string | null;
  createdById: number;
  timeline: Array<{ at: string; label: string; actorId?: number; note?: string }> | null;
}

export interface DisclosureQuery {
  workType?: HighRiskWorkType;
  status?: DisclosureStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}
