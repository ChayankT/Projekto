import React, { useEffect, useState, useCallback } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/client';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Badge, EmptyState, Skeleton } from '../components/ui';

const NotificationsPage = () => {
    const { activeUserId } = useApp();
    const { addToast } = useToast();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!activeUserId) return;
        try {
            const res = await getNotifications(activeUserId);
            setNotifications(res.data);
        } catch { addToast('Failed to load notifications', 'error'); }
        finally { setLoading(false); }
    }, [activeUserId]);

    useEffect(() => { setLoading(true); fetchNotifications(); }, [fetchNotifications]);

    const markRead = async (id) => {
        try {
            const res = await markNotificationRead(id);
            setNotifications(prev => prev.map(n => n._id === id ? res.data : n));
        } catch { }
    };

    const markAllRead = async () => {
        try {
            await markAllNotificationsRead(activeUserId);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            addToast('All marked as read');
        } catch { addToast('Failed', 'error'); }
    };

    if (!activeUserId) return (
        <EmptyState icon="👤" title="No user selected" description="Select a user from the top bar to view notifications." />
    );

    if (loading) return (
        <div>
            <div className="section-header">
                <Skeleton variant="heading" width="200px" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="card" height={72} />)}
            </div>
        </div>
    );

    const unread = notifications.filter(n => !n.isRead).length;

    return (
        <div style={{ animation: 'fade-in-up 0.35s ease forwards' }}>
            <div className="section-header">
                <h2>
                    Notifications
                    {unread > 0 && <Badge variant="active" style={{ marginLeft: 'var(--space-2)', verticalAlign: 'middle' }}>{unread} new</Badge>}
                </h2>
                {unread > 0 && (
                    <button className="btn btn-secondary btn-sm" onClick={markAllRead}>Mark all as read</button>
                )}
            </div>

            {notifications.length === 0 ? (
                <EmptyState
                    icon="🔔"
                    title="No notifications"
                    description="Overdue task reminders will appear here."
                />
            ) : (
                <div className="notif-list">
                    {notifications.map(n => (
                        <div key={n._id} className={`notif-item ${!n.isRead ? 'unread' : ''}`}>
                            {!n.isRead && <div className="notif-dot" />}
                            <div className="notif-content">
                                <p>{n.message}</p>
                                <small>{new Date(n.createdAt).toLocaleString()}</small>
                            </div>
                            {!n.isRead && (
                                <button className="btn btn-ghost btn-sm" onClick={() => markRead(n._id)}>Dismiss</button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
