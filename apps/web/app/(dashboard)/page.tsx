import Link from "next/link";

interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  cycle: "monthly" | "yearly" | "weekly";
  nextCharge: string;
}

interface SubscriptionsResponse {
  success: boolean;
  data?: { subscriptions: Subscription[]; monthlySpend: number; token?: string };
  error?: string;
}

async function getDashboardData(): Promise<NonNullable<SubscriptionsResponse["data"]>> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/subscriptions`, {
    cache: "no-store"
  });
  if (!res.ok) {
    return { subscriptions: [], monthlySpend: 0 };
  }
  const json: SubscriptionsResponse = await res.json();
  if (!json.success || !json.data) {
    return { subscriptions: [], monthlySpend: 0 };
  }
  return json.data;
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 p-8">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Monthly Spend</h2>
          <p className="mt-4 text-4xl font-bold text-slate-900">
            ฿{data.monthlySpend.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-2 text-sm text-slate-500">Calculated from upcoming monthly and prorated yearly subscriptions.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Actions</h2>
          <p className="mt-4 text-sm text-slate-600">
            Keep the free tier happy—review your recurring charges and prune what you no longer use.
          </p>
          <Link
            href="/subscriptions/new"
            className="mt-6 inline-flex w-fit items-center rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600"
          >
            Add subscription
          </Link>
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Next charges</h2>
            <p className="text-sm text-slate-500">Review the immediate cash impact to stay ahead of renewals.</p>
          </div>
          <Link href="/subscriptions" className="text-sm font-medium text-brand-600">
            Manage all
          </Link>
        </header>
        <ul className="divide-y divide-slate-200">
          {data.subscriptions.length === 0 ? (
            <li className="py-6 text-center text-sm text-slate-500">You have no upcoming charges. Add your first subscription!</li>
          ) : (
            data.subscriptions.map((subscription) => (
              <li key={subscription.id} className="flex flex-col gap-1 py-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-base font-medium text-slate-900">{subscription.name}</p>
                  <p className="text-sm text-slate-500">Next on {new Date(subscription.nextCharge).toLocaleDateString("th-TH")}</p>
                </div>
                <p className="text-base font-semibold text-slate-900">
                  {subscription.currency} {subscription.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
