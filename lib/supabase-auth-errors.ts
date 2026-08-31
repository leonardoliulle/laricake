function isProviderDisabledError(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("unsupported provider") ||
    normalizedMessage.includes("provider is not enabled")
  );
}

function getNormalizedErrorMessage(errorMessage: string) {
  try {
    const parsed = JSON.parse(errorMessage) as {
      msg?: string;
      error_description?: string;
      message?: string;
    };

    if (typeof parsed.msg === "string") {
      return parsed.msg;
    }

    if (typeof parsed.error_description === "string") {
      return parsed.error_description;
    }

    if (typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    return errorMessage;
  }

  return errorMessage;
}

export function getSupabaseOAuthErrorMessage(errorMessage: string) {
  const normalizedErrorMessage = getNormalizedErrorMessage(errorMessage);

  if (isProviderDisabledError(normalizedErrorMessage)) {
    return "O login com Google não está habilitado neste projeto Supabase. Ative o provedor Google em Authentication -> Providers e tente novamente.";
  }

  return normalizedErrorMessage;
}