import { getPrismaClient } from "@/lib/prisma";

export type CreateNotificationInput = {
  userId: string;
  title: string;
  message: string;
  type: string;
};

export type CreateNotificationResult =
  | { status: "created" }
  | { status: "database_unavailable"; reason: string }
  | { status: "error" };

export type UpdateNotificationResult =
  | { status: "read" }
  | { status: "not_found" }
  | { status: "database_unavailable"; reason: string }
  | { status: "error" };

export type UserNotificationListItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
};

const missingDatabaseReason =
  "Falta configurar DATABASE_URL o DIRECT_URL con la conexion Postgres de Supabase.";

export async function createNotification({
  message,
  title,
  type,
  userId,
}: CreateNotificationInput): Promise<CreateNotificationResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        read: false,
      },
    });

    return { status: "created" };
  } catch (error) {
    console.error("Unable to create notification.", error);
    return { status: "error" };
  }
}

export async function listUserNotifications(
  userId: string,
  limit = 10,
): Promise<UserNotificationListItem[]> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return [];
  }

  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
): Promise<UpdateNotificationResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  try {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });

    return result.count > 0 ? { status: "read" } : { status: "not_found" };
  } catch (error) {
    console.error("Unable to mark notification as read.", error);
    return { status: "error" };
  }
}

export async function markAllNotificationsAsRead(
  userId: string,
): Promise<UpdateNotificationResult> {
  const prisma = getPrismaClient();

  if (!prisma) {
    return { status: "database_unavailable", reason: missingDatabaseReason };
  }

  try {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { status: "read" };
  } catch (error) {
    console.error("Unable to mark all notifications as read.", error);
    return { status: "error" };
  }
}
