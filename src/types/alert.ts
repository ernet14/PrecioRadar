import type { DateLike } from "@/types/common";

export type AlertType = "TARGET_PRICE" | "PERCENTAGE_DROP";

export type NotificationChannel = "EMAIL" | "INTERNAL";

export type Alert = {
  id: string;
  userId: string;
  productId: string;
  alertType: AlertType;
  targetPrice?: number | null;
  targetPercentage?: number | null;
  notificationChannel: NotificationChannel;
  active: boolean;
  paused: boolean;
  lastNotifiedAt?: DateLike | null;
  createdAt?: DateLike;
  updatedAt?: DateLike;
};
