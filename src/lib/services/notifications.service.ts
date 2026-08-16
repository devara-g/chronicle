import { Notification } from '@/types';

export const NotificationsService = {
  getNotifications(): Notification[] {
    return [];
  },

  markAllAsRead(notifications: Notification[]): Notification[] {
    return notifications.map(n => ({ ...n, read: true }));
  },
};
