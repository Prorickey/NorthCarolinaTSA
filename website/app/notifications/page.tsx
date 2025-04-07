'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Notification } from '@/components/notifications/notification';
import NotificationForm from '@/components/notifications/notificationForm';
import NotificationsDraftList from '@/components/notifications/notificationDraftList';
import NotificationList from '@/components/notifications/notificationList';
import { useSession } from 'next-auth/react';

const NotificationManager: React.FC = () => {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [drafts, setDrafts] = useState<Notification[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
    const [isPrivate, setIsPrivate] = useState<boolean>(false);
    const [selectedRecipients, setSelectedRecipients] = useState<Array<{id: string, name: string, type: 'user' | 'school' | 'event'}>>([]);

	const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nctsa-api.bedson.tech';
	const { data: session } = useSession();
	const apiKey = session?.user.apiKey; // This should be securely stored in production

	// Form state
	const [formData, setFormData] = useState<Partial<Notification>>({
		title: '',
		description: '',
		date: new Date().toISOString(),
        category: 'general',
	});

	// Fetch notifications
	const fetchNotifications = useCallback(async () => {
		try {
			setLoading(true);
			const response = await fetch(`${apiUrl}/admin/notifications`, {
				headers: {
					"Authorization": `Bearer ${apiKey}`,
				}
			});
			if (!response.ok) {
				throw new Error('Failed to fetch notifications');
			}
			const data = await response.json();
			
			// Sort by createdAt date (newest first)
			const sortedData = [...data].sort((a, b) => 
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);
			
			setNotifications(sortedData.filter((notification: Notification) => notification.published));
			setDrafts(sortedData.filter((notification: Notification) => !notification.published));
		} catch (err) {
			setError('Error fetching notifications');
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, [apiUrl, apiKey])

	// Initial load and refresh every 30 seconds
	useEffect(() => {
		fetchNotifications();
		const interval = setInterval(fetchNotifications, 30 * 1000);
		return () => clearInterval(interval);
	}, [fetchNotifications]);

	// Handle form input changes
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData({
			...formData,
			[name]: value,
		});
	};

	// Handle date change
	const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { value } = e.target;
		// Convert the date picker value (YYYY-MM-DD) to ISO format
		const isoDate = new Date(value).toISOString();
		setFormData({
			...formData,
			date: isoDate,
		});
	};

	// Reset form
	const resetForm = () => {
		setFormData({
			title: '',
			description: '',
			date: new Date().toISOString(),
            category: 'general',
		});
        setIsPrivate(false);
        setSelectedRecipients([]);
	};

	// Submit form
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		try {
		  // Prepare the request payload
		  const payload = {
			...formData,
			private: isPrivate,  // Make sure this is the right variable
			type: formData.category,
			userids: isPrivate ? selectedRecipients.map(recipient => recipient.id) : []
		  };
	  
		  // Debug log
		  console.log("Submitting with isPrivate:", isPrivate);
		  console.log("Full payload:", payload);
		  
		  const response = await fetch(`${apiUrl}/admin/notifications`, {
			method: 'POST',
			headers: {
			  'Content-Type': 'application/json',
			  'Authorization': `Bearer ${apiKey}`,
			},
			body: JSON.stringify(payload),
		  });
		  
		  // More logging to check response
		  const responseData = await response.json();
		  console.log("Server response:", responseData);
		  
		  if (!response.ok) {
			throw new Error('Failed to create notification');
		  }
		  
		  // Refresh notifications data after posting
		  setDrafts([responseData.notification, ...drafts]);
		  
		  // Reset form
		  resetForm();
		} catch (err) {
		  setError('Failed to save notification');
		  console.error(err);
		}
	  };

	// Toggle notification expansion and editor
	const toggleExpand = (id: string) => {
		if (expandedId === id) {
			setExpandedId(null);
			setEditingIds(prev => {
				const newSet = new Set(prev);
				newSet.delete(id);
				return newSet;
			});
		} else {
			setExpandedId(id);
			setEditingIds(prev => {
				const newSet = new Set(prev);
				newSet.add(id);
				return newSet;
			});
		}
	};

	// Handle draft selection
	const handleDraftSelect = (draft: Notification) => {
		setEditingIds(prev => {
			const newSet = new Set(prev);
			if (prev.has(draft.id)) newSet.delete(draft.id);
			else newSet.add(draft.id);
			return newSet;
		});
	};

	// Handle draft deletion
	const handleDraftDelete = async (id: string) => {
		try {
			const response = await fetch(`${apiUrl}/admin/notifications/${id}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
				},
			});
			
			if (!response.ok) {
				throw new Error('Failed to delete draft');
			}
			
			setDrafts(drafts.filter(draft => draft.id !== id));
			setEditingIds(prev => {
				const newSet = new Set(prev);
				newSet.delete(id);
				return newSet;
			});
		} catch (err) {
			setError('Failed to delete draft');
			console.error(err);
		}
	};

	// Handle notification save
	const handleNotificationSave = async (updatedNotification: Notification) => {
		try {
			const response = await fetch(`${apiUrl}/admin/notifications/${updatedNotification.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
				body: JSON.stringify(updatedNotification),
			});
			
			if (!response.ok) {
				throw new Error('Failed to update notification');
			}

			const data = (await response.json()).notification;
			setNotifications(prev => prev.map(n => n.id === data.id ? data : n));
			setDrafts(prev => prev.map(d => d.id === data.id ? data : d));
			setEditingIds(prev => {
				const newSet = new Set(prev);
				newSet.delete(data.id);
				return newSet;
			});
		} catch (err) {
			setError('Failed to save notification');
			console.error(err);
		}
	};

	// Handle notification send
	const handleNotificationSend = async (updatedNotification: Notification) => {
		try {
			const response = await fetch(`${apiUrl}/admin/notifications/${updatedNotification.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
				body: JSON.stringify({ ...updatedNotification, published: true }),
			});
			
			if (!response.ok) {
				throw new Error('Failed to send notification');
			}

			const data = (await response.json()).notification;
			setNotifications(prev => [data, ...prev]);
			setDrafts(prev => prev.filter(d => d.id !== data.id));
			setEditingIds(prev => {
				const newSet = new Set(prev);
				newSet.delete(data.id);
				return newSet;
			});
		} catch (err) {
			setError('Failed to send notification');
			console.error(err);
		}
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-gray-200">Notification Manager</h1>
			</div>

			{error && (
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					{error}
				</div>
			)}

			{/* Notification Creation Form - Always Visible */}
			<NotificationForm
				formData={formData}
				handleInputChange={handleInputChange}
				handleDateChange={handleDateChange}
				handleSubmit={handleSubmit}
				resetForm={resetForm}
                isPrivate={isPrivate}
                setIsPrivate={setIsPrivate}
                selectedRecipients={selectedRecipients}
                setSelectedRecipients={setSelectedRecipients}
                apiKey={apiKey!}
                apiUrl={apiUrl}
			/>

			{/* Notification Drafts */}
			<h2 className="text-xl font-semibold mb-4 text-gray-200">Notification Drafts</h2>
			{drafts.length === 0 ? (
				<div className="text-center p-8 bg-gray-800 rounded-lg">
					<p className="text-gray-300">No drafts found.</p>
				</div>
			) : (
				<NotificationsDraftList
					drafts={drafts}
					editingIds={editingIds}
					apiUrl={apiUrl}
					apiKey={apiKey}
					handleDraftSelect={handleDraftSelect}
					handleDraftDelete={handleDraftDelete}
					handleNotificationSave={handleNotificationSave}
					handleNotificationSend={handleNotificationSend}
					setEditingIds={setEditingIds}
				/>
			)}

			{/* Notifications List */}
			<h2 className="text-xl font-semibold mb-4 text-gray-200">Previous Notifications</h2>
			
			{loading ? (
				<div className="flex justify-center items-center h-40">
					<div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
				</div>
			) : notifications.length === 0 ? (
				<div className="text-center p-8 bg-gray-800 rounded-lg">
					<p className="text-gray-300">No notifications found. Create your first one!</p>
				</div>
			) : (
				<NotificationList
					notifications={notifications}
					expandedId={expandedId}
					toggleExpand={toggleExpand}
				/>
			)}
		</div>
	);
};

export default NotificationManager;