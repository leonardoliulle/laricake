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

export function deriveNumericUserIdFromAuthUid(authUid: string) {
  let hash = 2166136261;

  for (let index = 0; index < authUid.length; index += 1) {
    hash ^= authUid.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  // Keep the value in a positive signed 32-bit range and avoid zero.
  const normalizedValue = (hash >>> 1) + 1;
  return normalizedValue;
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

export function isUserAdmin(user: User) {
  const roleCandidates: unknown[] = [
    user.user_metadata?.role,
    user.app_metadata?.role,
    user.user_metadata?.roles,
    user.app_metadata?.roles,
  ];

  for (const candidate of roleCandidates) {
    if (typeof candidate === "string" && candidate.trim().toLowerCase() === "admin") {
      return true;
    }

    if (
      Array.isArray(candidate) &&
      candidate.some(
        (value) => typeof value === "string" && value.trim().toLowerCase() === "admin"
      )
    ) {
      return true;
    }
  }

  const isAdminCandidates: unknown[] = [
    user.user_metadata?.is_admin,
    user.app_metadata?.is_admin,
  ];

  return isAdminCandidates.some((candidate) => candidate === true);
}
