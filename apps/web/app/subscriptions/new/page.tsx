"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import type { SubscriptionCreateInput } from "@/schemas/subscription";
import { subscriptionCreateSchema } from "@/schemas/subscription";
import { Button } from "@subsentinel/ui";

export default function NewSubscriptionPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SubscriptionCreateInput>({
    resolver: valibotResolver(subscriptionCreateSchema),
    defaultValues: {
      currency: "THB",
      cycle: "monthly"
    }
  });

  const onSubmit = handleSubmit(async (data) => {
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!json.success) {
      setServerError(json.error ?? "Unable to create subscription");
      return;
    }
    router.push("/subscriptions");
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Add subscription</h1>
        <p className="text-sm text-slate-500">Track renewal dates and keep calendar reminders within your free tier.</p>
      </div>
      <form onSubmit={onSubmit} className="grid gap-4">
        <label className="grid gap-1 text-sm text-slate-700">
          Name
          <input
            type="text"
            {...register("name")}
            className="rounded-md border border-slate-300 px-3 py-2 text-base focus:border-brand-500 focus:outline-none"
          />
          {errors.name && <span className="text-xs text-red-600">{errors.name.message}</span>}
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm text-slate-700">
            Amount
            <input
              type="number"
              step="0.01"
              {...register("amount", { valueAsNumber: true })}
              className="rounded-md border border-slate-300 px-3 py-2 text-base focus:border-brand-500 focus:outline-none"
            />
            {errors.amount && <span className="text-xs text-red-600">{errors.amount.message}</span>}
          </label>
          <label className="grid gap-1 text-sm text-slate-700">
            Currency
            <input
              type="text"
              maxLength={3}
              {...register("currency")}
              className="rounded-md border border-slate-300 px-3 py-2 text-base uppercase focus:border-brand-500 focus:outline-none"
            />
            {errors.currency && <span className="text-xs text-red-600">{errors.currency.message}</span>}
          </label>
        </div>
        <label className="grid gap-1 text-sm text-slate-700">
          Billing cycle
          <select
            {...register("cycle")}
            className="rounded-md border border-slate-300 px-3 py-2 text-base focus:border-brand-500 focus:outline-none"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          {errors.cycle && <span className="text-xs text-red-600">{errors.cycle.message}</span>}
        </label>
        <label className="grid gap-1 text-sm text-slate-700">
          Next charge date
          <input
            type="date"
            {...register("nextCharge")}
            className="rounded-md border border-slate-300 px-3 py-2 text-base focus:border-brand-500 focus:outline-none"
          />
          {errors.nextCharge && <span className="text-xs text-red-600">{errors.nextCharge.message}</span>}
        </label>
        <label className="grid gap-1 text-sm text-slate-700">
          Notes <span className="text-xs text-slate-400">Optional</span>
          <textarea
            {...register("notes")}
            className="rounded-md border border-slate-300 px-3 py-2 text-base focus:border-brand-500 focus:outline-none"
          />
          {errors.notes && <span className="text-xs text-red-600">{errors.notes.message}</span>}
        </label>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
