import type { Business, BusinessExpense, Campaign } from '@/lib/db/types';

export interface BusinessPnl {
  business: Business;
  adSpend: number;
  revenue: number;
  orders: number;
  roas: number | null;
  cpa: number | null;
  operatingExpense: number;
  profit: number;
  margin: number | null;
  campaigns: Campaign[];
}

export function campaignRoas(campaign: Campaign): number | null {
  if (Number(campaign.spend) <= 0) return null;
  return Number(campaign.revenue) / Number(campaign.spend);
}

export function businessPnl(
  business: Business,
  campaigns: Campaign[],
  expenses: BusinessExpense[],
): BusinessPnl {
  const own = campaigns.filter((c) => c.business_id === business.id);
  const adSpend = own.reduce((sum, c) => sum + Number(c.spend), 0);
  const revenue = own.reduce((sum, c) => sum + Number(c.revenue), 0);
  const orders = own.reduce((sum, c) => sum + (c.orders ?? 0), 0);
  const operatingExpense = expenses
    .filter((e) => e.business_id === business.id)
    .reduce((sum, e) => sum + Math.abs(Number(e.amount)), 0);

  const profit = revenue - adSpend - operatingExpense;

  return {
    business,
    adSpend,
    revenue,
    orders,
    roas: adSpend > 0 ? revenue / adSpend : null,
    cpa: orders > 0 && adSpend > 0 ? adSpend / orders : null,
    operatingExpense,
    profit,
    margin: revenue > 0 ? profit / revenue : null,
    campaigns: own.sort((a, b) => b.period_start.localeCompare(a.period_start)),
  };
}

export function platformTotals(campaigns: Campaign[]): Array<{
  platform: string;
  spend: number;
  revenue: number;
  roas: number | null;
  orders: number;
}> {
  const map = new Map<string, { spend: number; revenue: number; orders: number }>();

  for (const c of campaigns) {
    const bucket = map.get(c.platform) ?? { spend: 0, revenue: 0, orders: 0 };
    bucket.spend += Number(c.spend);
    bucket.revenue += Number(c.revenue);
    bucket.orders += c.orders ?? 0;
    map.set(c.platform, bucket);
  }

  return [...map.entries()]
    .map(([platform, v]) => ({
      platform,
      spend: v.spend,
      revenue: v.revenue,
      roas: v.spend > 0 ? v.revenue / v.spend : null,
      orders: v.orders,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}
