import { type User } from "@supabase/supabase-js";

export const FALLBACK_ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
] as const;

export function normalizeOrderStatus(status: string | null | undefined) {
  if (!status) {
    return "PENDING";
  }

  return status.trim().toUpperCase();
}

export function getOrderStatusLabel(status: string) {
  const normalizedStatus = normalizeOrderStatus(status);

  switch (normalizedStatus) {
    case "PENDING":
      return "Pendentes";
    case "CONFIRMED":
      return "Confirmados";
    case "PROCESSING":
      return "Em andamento";
    case "COMPLETED":
      return "Concluidos";
    case "CANCELLED":
      return "Cancelados";
    default:
      return normalizedStatus;
  }
}

function parseNumericValue(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsedValue = Number.parseInt(value, 10);

    if (Number.isSafeInteger(parsedValue) && parsedValue > 0) {
      return parsedValue;
    }
  }

  return null;
}

export function resolveNumericUserId(user: User) {
  const metadataCandidates: unknown[] = [
    user.user_metadata?.user_id,
    user.user_metadata?.id,
    user.user_metadata?.legacy_user_id,
    user.app_metadata?.user_id,
  ];

  for (const candidate of metadataCandidates) {
    const parsedValue = parseNumericValue(candidate);

    if (parsedValue !== null) {
      return parsedValue;
    }
  }

  return null;
}

export function getStatusOptions(existingStatuses: Array<string | null | undefined>) {
  const normalizedExistingStatuses = existingStatuses
    .map((status) => normalizeOrderStatus(status))
    .filter((status, index, array) => status.length > 0 && array.indexOf(status) === index);

  if (normalizedExistingStatuses.length > 0) {
    return normalizedExistingStatuses;
  }

  return [...FALLBACK_ORDER_STATUSES];
}
