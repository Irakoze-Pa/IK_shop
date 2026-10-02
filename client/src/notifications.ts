const apiBaseUrl = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/v1`;

export type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  type: string;
  orderId?: string;
  readAt?: string | null;
  createdAt: string;
};

export const getNotifications = async (token: string): Promise<{ notifications: NotificationItem[]; unreadCount: number }> => {
  const response = await fetch(`${apiBaseUrl}/notifications`, { headers: { Authorization: `Bearer ${token}` } });
  const payload = await response.json() as { notifications: NotificationItem[]; unreadCount: number } | { error?: string };
  if (!response.ok) throw new Error('Notifications could not be loaded');
  return payload as { notifications: NotificationItem[]; unreadCount: number };
};

export const markNotificationRead = async (token: string, notificationId: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/notifications/${notificationId}/read`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Update could not be marked as read');
};

export const markAllNotificationsRead = async (token: string): Promise<void> => {
  const response = await fetch(`${apiBaseUrl}/notifications/read-all`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Updates could not be marked as read');
};
