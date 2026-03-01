import { useQuery } from '@tanstack/react-query';
import type { ProgramType } from '@flyme/shared';
import { programsApi } from '../../../lib/api.js';

export function usePrograms(type?: ProgramType) {
  return useQuery({
    queryKey: ['programs', type ?? 'all'],
    queryFn: () => programsApi.list(),
    select: (data) =>
      type ? data.programs.filter((p) => p.type === type) : data.programs,
    staleTime: 1000 * 60 * 60 * 24, // programs change rarely — 24 h
  });
}
