type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

function hasPlaceholderValue(value: string | undefined) {
  return !value || value.includes("[") || value.includes("]");
}

function isValidHttpUrl(value: string | undefined) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = [
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ]
    .map((value) => value?.trim())
    .find((value) => value && !hasPlaceholderValue(value));

  if (
    !url ||
    !publishableKey ||
    hasPlaceholderValue(url) ||
    hasPlaceholderValue(publishableKey) ||
    !isValidHttpUrl(url)
  ) {
    return null;
  }

  return {
    url,
    publishableKey,
  };
}

export function isSupabaseConfigured() {
  return getSupabasePublicConfig() !== null;
}

export function getSupabaseConfigErrorMessage() {
  return "Supabase Auth no esta configurado todavia. Defini NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local.";
}

export function requireSupabasePublicConfig() {
  const config = getSupabasePublicConfig();

  if (!config) {
    throw new Error(getSupabaseConfigErrorMessage());
  }

  return config;
}
