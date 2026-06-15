import { apiPaths } from '../constants/apiPaths';
import type { DisclosureQuery, HighRiskDisclosure, PaginatedResult } from '../types';
import { request, unwrap } from '../utils/request';

export const highRiskDisclosureApi = {
  list: (query: DisclosureQuery = {}) =>
    unwrap<PaginatedResult<HighRiskDisclosure>>(request.get(apiPaths.highRiskDisclosures.base, { params: query })),
  detail: (id: number) => unwrap<HighRiskDisclosure>(request.get(apiPaths.highRiskDisclosures.detail(id))),
  create: (payload: Partial<HighRiskDisclosure> | FormData) =>
    unwrap<HighRiskDisclosure>(
      request.post(apiPaths.highRiskDisclosures.base, payload, {
        headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      }),
    ),
  sign: (id: number, name: string, role: string) =>
    unwrap<HighRiskDisclosure>(request.patch(apiPaths.highRiskDisclosures.sign(id), { name, role })),
  close: (id: number, note?: string) =>
    unwrap<HighRiskDisclosure>(request.patch(apiPaths.highRiskDisclosures.close(id), { note })),
};
