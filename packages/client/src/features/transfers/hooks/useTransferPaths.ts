import { useQuery } from '@tanstack/react-query';
import { transfersApi } from '../../../lib/api.js';

interface Params {
  from: string;
  to: string;
  amount: number;
}

export function useTransferPaths(params: Partial<Params>) {
  const enabled =
    !!params.from && !!params.to && !!params.amount && params.amount > 0;

  return useQuery({
    queryKey: ['transfers', 'paths', params.from, params.to, params.amount],
    queryFn: () =>
      transfersApi.getPaths(params as Required<Params>),
    select: (data) => data.paths,
    enabled,
    staleTime: 1000 * 60 * 15, // award availability: 15 min
  });
}
