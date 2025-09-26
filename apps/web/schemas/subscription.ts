import { InferInput, array, literal, number, object, optional, string, union } from "valibot";

export const subscriptionCycleSchema = union([
  literal("weekly"),
  literal("monthly"),
  literal("yearly")
]);

export const subscriptionCreateSchema = object({
  name: string(),
  amount: number(),
  currency: string(),
  cycle: subscriptionCycleSchema,
  nextCharge: string(),
  notes: optional(string())
});

export const subscriptionUpdateSchema = object({
  id: string(),
  name: optional(string()),
  amount: optional(number()),
  currency: optional(string()),
  cycle: optional(subscriptionCycleSchema),
  nextCharge: optional(string()),
  notes: optional(string())
});

export const subscriptionListSchema = object({
  subscriptions: array(
    object({
      id: string(),
      name: string(),
      amount: number(),
      currency: string(),
      cycle: subscriptionCycleSchema,
      nextCharge: string()
    })
  ),
  monthlySpend: number(),
  token: optional(string())
});

export type SubscriptionCreateInput = InferInput<typeof subscriptionCreateSchema>;
export type SubscriptionUpdateInput = InferInput<typeof subscriptionUpdateSchema>;
