export interface FxQuote {
  base: string;
  rates: Record<string, number>;
  fetchedAt: Date;
}

export async function fetchFreeFx(base: string = "THB"): Promise<FxQuote> {
  // Assumption: Replace with real API (e.g., exchangerate.host) when free-tier budget allows.
  return {
    base,
    rates: {
      THB: 1,
      USD: 0.027,
      EUR: 0.025
    },
    fetchedAt: new Date()
  };
}

export type FxFetcher = typeof fetchFreeFx;
