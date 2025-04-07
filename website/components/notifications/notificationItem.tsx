'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { Notification } from './notification';

interface NotificationItemProps {
	notification: Notification;
	isExpanded: boolean;
	toggleExpand: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, isExpanded, toggleExpand }) => {
	console.log(notification)
	return (
		<div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
			<div 
				className="p-4 cursor-pointer hover:bg-gray-700 flex justify-between items-center"
				onClick={() => toggleExpand(notification.id)}
			>
				<div>
					<h3 className="text-lg font-medium text-gray-200">{notification.title}</h3>
					<p className="text-sm text-gray-400">
						{format(parseISO(notification.createdAt), 'MMM dd, yyyy HH:mm')}
					</p>
				</div>
				<div className="flex items-center">
					<button className="text-gray-400 hover:text-white">
						{isExpanded ? (
							<ChevronUpIcon className="h-5 w-5" />
						) : (
							<ChevronDownIcon className="h-5 w-5" />
						)}
					</button>
				</div>
			</div>
			
			{isExpanded && (
				<div className="px-4 pb-4 bg-gray-800">
					<div className="pt-2 pb-3 border-t border-gray-700">
						<p className="text-gray-300 whitespace-pre-wrap">{notification.description}</p>
						<p className="text-sm text-gray-400 mt-2">
							Notification Date: {format(parseISO(notification.date), 'MMM dd, yyyy')}
						</p>
					</div>
				</div>
			)}
		</div>
	);
};

export default NotificationItem;