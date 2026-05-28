import React, { useState, useEffect, useRef } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { notificationsAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { useSocket } from '../../context/SocketContext';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const { socket } = useSocket();
  const ref = useRef(null);

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationsAPI.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (e) {}
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_notification', () => {
      fetchNotifications();
    });
    return () => socket.off('new_notification');
  }, [socket]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    await notificationsAPI.markAllRead();
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const typeIcons = { appointment: '📅', message: '💬', prescription: '💊', report: '📋', reminder: '⏰', ai_alert: '🤖', system: '⚙️' };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
      >
        <BellIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 card shadow-xl z-50 overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-gray-700">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-gray-700">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No notifications yet
              </div>
            ) : notifications.map(n => (
              <div key={n._id} className={`px-4 py-3 flex gap-3 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors ${!n.isRead ? 'bg-primary-50 dark:bg-primary-900/10' : ''}`}>
                <span className="text-lg flex-shrink-0">{typeIcons[n.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-white">{n.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                </div>
                {!n.isRead && <div className="w-2 h-2 bg-primary-500 rounded-full mt-1 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
