import * as Sentry from "@sentry/nextjs";

const piiKeys = new Set([
  "email",
  "password",
  "token",
  "authorization",
  "cookie",
  "set-cookie",
  "confirmToken",
]);

function scrubObject<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => scrubObject(item)) as unknown as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, val]) => {
        if (piiKeys.has(key.toLowerCase())) return [key, "[redacted]"];
        return [key, scrubObject(val)];
      },
    );
    return Object.fromEntries(entries) as unknown as T;
  }

  if (typeof value === "string") {
    return value.replace(
      /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
      "[email]",
    ) as unknown as T;
  }

  return value;
}

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.request?.data) {
      delete event.request.data;
    }
    if (event.request?.cookies) {
      event.request.cookies = { redacted: "true" };
    }
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    if (event.extra) {
      event.extra = scrubObject(event.extra);
    }
    if (event.contexts) {
      event.contexts = scrubObject(event.contexts);
    }
    return event;
  },
});
