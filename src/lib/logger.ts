import { createHash } from "node:crypto";

type LogLevel = "info" | "warn" | "error" | "debug";

type LogFields = {
  route?: string;
  userId?: string | null;
  latencyMs?: number;
  durationMs?: number;
  error?: unknown;
  metadata?: Record<string, unknown>;
};

function hashUserId(userId: string | null | undefined) {
  if (!userId) return null;
  return createHash("sha256").update(userId).digest("hex").slice(0, 12);
}

function serializeError(error: unknown) {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }
  return { message: String(error) };
}

function emit(level: LogLevel, message: string, fields: LogFields = {}) {
  const payload = {
    "@timestamp": new Date().toISOString(),
    level,
    message,
    ...(fields.route ? { route: fields.route } : {}),
    ...(fields.userId !== undefined
      ? { userIdHash: hashUserId(fields.userId) }
      : {}),
    ...(typeof fields.latencyMs === "number" ? { latencyMs: fields.latencyMs } : {}),
    ...(typeof fields.durationMs === "number" ? { durationMs: fields.durationMs } : {}),
    ...(fields.metadata ? { metadata: fields.metadata } : {}),
    ...(fields.error ? { error: serializeError(fields.error) } : {}),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info(message: string, fields?: LogFields) {
    emit("info", message, fields);
  },
  warn(message: string, fields?: LogFields) {
    emit("warn", message, fields);
  },
  error(message: string, fields?: LogFields) {
    emit("error", message, fields);
  },
  debug(message: string, fields?: LogFields) {
    if (process.env.NODE_ENV !== "production") {
      emit("debug", message, fields);
    }
  },
};
