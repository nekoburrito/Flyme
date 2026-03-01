import ky from 'ky';
import type { SearchParams, SearchResult, LoyaltyProgram, TransferPath } from '@flyme/shared';

const api = ky.create({
  prefixUrl: '/api',
  timeout: 30_000,
  hooks: {
    beforeError: [
      async error => {
        const { response } = error;
        if (response && response.body) {
          const body = await response.json().catch(() => null);
          if (body && typeof body === 'object' && 'error' in body) {
            const appError = body as { error: { code: string; message: string } };
            error.message = `[${appError.error.code}] ${appError.error.message}`;
          }
        }
        return error;
      },
    ],
  },
});

export const flightApi = {
  search: (params: SearchParams): Promise<SearchResult> =>
    api.post('search', { json: params }).json(),
};

export const programsApi = {
  list: (): Promise<{ programs: LoyaltyProgram[] }> => api.get('programs').json(),

  get: (slug: string): Promise<LoyaltyProgram> => api.get(`programs/${slug}`).json(),
};

export const transfersApi = {
  getPaths: (params: {
    from: string;
    to: string;
    amount: number;
  }): Promise<{ paths: TransferPath[] }> =>
    api.get('transfers', { searchParams: params as Record<string, string | number> }).json(),
};
