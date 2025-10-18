"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { SubscriptionUpdateInput } from "@/schemas/subscription";
import { subscriptionListSchema, subscriptionUpdateSchema } from "@/schemas/subscription";
import { parse } from "valibot";
import { Button } from "@subsentinel/ui";

interface SubscriptionRow {
  id: string;
  name: string;
  amount: number;
  currency: string;
  cycle: "weekly" | "monthly" | "yearly";
  nextCharge: string;
  notes?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type OptimisticState = Record<string, Partial<SubscriptionRow> & { deleted?: boolean }>;

function useSubscriptions() {
  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions");
      const json: ApiResponse<unknown> = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error ?? "Failed to load subscriptions");
      }
      const parsed = parse(subscriptionListSchema, json.data);
      return parsed.subscriptions;
    }
  });
}

export default function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useSubscriptions();
  const [optimistic, setOptimistic] = useState<OptimisticState>({});

  const patchSubscription = async (input: SubscriptionUpdateInput) => {
    const parsed = parse(subscriptionUpdateSchema, input);
    setOptimistic((prev) => ({ ...prev, [parsed.id]: { ...prev[parsed.id], ...parsed } }));
    const res = await fetch(`/api/subscriptions/${parsed.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed)
    });
    const json: ApiResponse<SubscriptionRow> = await res.json();
    if (!json.success) {
      throw new Error(json.error ?? "Unable to update subscription");
    }
    setOptimistic((prev) => {
      const copy = { ...prev };
      delete copy[parsed.id];
      return copy;
    });
    await queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
  };

  const deleteSubscription = async (id: string) => {
    setOptimistic((prev) => ({ ...prev, [id]: { ...prev[id], deleted: true } }));
    const res = await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    const json: ApiResponse<null> = await res.json();
    if (!json.success) {
      throw new Error(json.error ?? "Unable to delete subscription");
    }
    await queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Subscriptions</h1>
          <p className="text-sm text-slate-500">Keep tabs on every repeating cost to stay within free-tier limits.</p>
        </div>
        <Button asChild>
          <Link href="/subscriptions/new">Add subscription</Link>
        </Button>
      </header>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Cycle</th>
              <th className="px-4 py-3">Next charge</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Loading subscriptions...
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-red-600">
                  {(error as Error).message}
                </td>
              </tr>
            )}
            {data?.length === 0 && !isLoading && !error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No subscriptions yet.
                </td>
              </tr>
            )}
            {data?.map((subscription) => {
              if (optimistic[subscription.id]?.deleted) {
                return null;
              }
              const optimisticRow = { ...subscription, ...optimistic[subscription.id] };
              return (
                <tr key={subscription.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{optimisticRow.name}</td>
                  <td className="px-4 py-3">
                    {optimisticRow.currency} {optimisticRow.amount?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 capitalize">{optimisticRow.cycle}</td>
                  <td className="px-4 py-3">{new Date(optimisticRow.nextCharge).toLocaleDateString("th-TH")}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          patchSubscription({ id: subscription.id, nextCharge: new Date().toISOString().slice(0, 10) })
                        }
                      >
                        Snooze 1 day
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => deleteSubscription(subscription.id)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
