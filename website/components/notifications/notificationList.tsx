'use client';

import React from 'react';
import { Notification } from './notification';
import NotificationItem from './notificationItem';

interface NotificationListProps {
	notifications: Notification[];
	expandedId: string | null;
	toggleExpand: (id: string) => void;
}

const NotificationList: React.FC<NotificationListProps> = ({ notifications, expandedId, toggleExpand }) => {
	return (
		<div className="space-y-4">
			{notifications.map((notification) => (
				<NotificationItem
					key={notification.id}
					notification={notification}
					isExpanded={expandedId === notification.id}
					toggleExpand={toggleExpand}
				/>
			))}
		</div>
	);
};

export default NotificationList;