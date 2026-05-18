import {
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
} from "@/app/notificaciones/actions";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { UserNotificationListItem } from "@/services/notificationService";

type NotificationListProps = {
  notifications: UserNotificationListItem[];
  returnTo: string;
};

function HiddenFields({
  notificationId,
  returnTo,
}: {
  notificationId?: string;
  returnTo: string;
}) {
  return (
    <>
      {notificationId ? (
        <input name="notificationId" type="hidden" value={notificationId} />
      ) : null}
      <input name="returnTo" type="hidden" value={returnTo} />
    </>
  );
}

export function NotificationList({
  notifications,
  returnTo,
}: NotificationListProps) {
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  if (notifications.length === 0) {
    return (
      <p className="text-sm leading-6 text-slate-600">
        Todavía no tenés notificaciones internas.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-500">
          {unreadCount} sin leer
        </p>
        {unreadCount > 0 ? (
          <form action={markAllNotificationsAsReadAction}>
            <HiddenFields returnTo={returnTo} />
            <Button size="sm" type="submit" variant="secondary">
              Marcar todas como leídas
            </Button>
          </form>
        ) : null}
      </div>

      <div className="divide-y divide-slate-100 rounded-lg border border-slate-100">
        {notifications.map((notification) => (
          <div className="p-4" key={notification.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950">
                  {notification.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {notification.message}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-400">
                  {formatDate(notification.createdAt)}
                </p>
              </div>
              <span
                className={`inline-flex h-8 items-center justify-center rounded-full border px-3 text-xs font-semibold ${
                  notification.read
                    ? "border-slate-200 bg-slate-50 text-slate-600"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {notification.read ? "Leida" : "Nueva"}
              </span>
            </div>

            {!notification.read ? (
              <form action={markNotificationAsReadAction} className="mt-3">
                <HiddenFields
                  notificationId={notification.id}
                  returnTo={returnTo}
                />
                <Button size="sm" type="submit" variant="ghost">
                  Marcar como leída
                </Button>
              </form>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
