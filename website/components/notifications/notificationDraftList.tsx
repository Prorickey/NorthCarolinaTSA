'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import NotificationEditor from './notificationEditor';
import { Notification } from './notification';

interface DraftListProps {
	drafts: Notification[];
	editingIds: Set<string>;
	apiUrl: string;
	apiKey: string | undefined;
	handleDraftSelect: (draft: Notification) => void;
	handleDraftDelete: (id: string) => void;
	handleNotificationSave: (updatedNotification: Notification) => void;
	handleNotificationSend: (updatedNotification: Notification) => void;
	setEditingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const NotificationsDraftList: React.FC<DraftListProps> = ({
	drafts,
	editingIds,
	apiUrl,
	apiKey,
	handleDraftSelect,
	handleDraftDelete,
	handleNotificationSave,
	handleNotificationSend,
	setEditingIds
}) => {
	return (
		<div className="space-y-4 mb-6">
			{drafts.map((draft) => (
				<div 
					key={draft.id} 
					className="bg-gray-800 rounded-lg shadow-lg overflow-hidden"
				>
					<div 
						className="p-4 cursor-pointer hover:bg-gray-700 flex justify-between items-center"
						onClick={() => handleDraftSelect(draft)}
					>
						<div>
							<h3 className="text-lg font-medium text-gray-200">{draft.title}</h3>
							<p className="text-sm text-gray-400">
								{format(parseISO(draft.createdAt), 'MMM dd, yyyy HH:mm')}
							</p>
						</div>
						<div className="flex items-center">
							<button 
								className="text-red-400 hover:text-red-600"
								onClick={(e) => {
									e.stopPropagation();
									handleDraftDelete(draft.id);
								}}
							>
								Delete
							</button>
						</div>
					</div>
					{editingIds.has(draft.id) && (
						<NotificationEditor
							key={draft.id}
							notification={draft}
							apiUrl={apiUrl}
							apiKey={apiKey}
							onSave={handleNotificationSave}
							onDelete={handleDraftDelete}
							onSend={handleNotificationSend}
							onCancel={() => setEditingIds(prev => {
								const newSet = new Set(prev);
								newSet.delete(draft.id);
								return newSet;
							})}
						/>
					)}
				</div>
			))}
		</div>
	);
};

export default NotificationsDraftList;