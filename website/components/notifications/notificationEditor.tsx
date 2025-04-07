'use client';

import React, { useState, useEffect } from 'react';
import { Notification } from './notification';

interface NotificationEditorProps {
	notification: Notification;
	apiUrl: string;
	apiKey: string | undefined;
	onSave: (notification: Notification) => void;
	onDelete: (id: string) => void;
	onSend: (notification: Notification) => void;
	onCancel: () => void;
}

interface Event {
    id: string;
    name: string;
}

const NotificationEditor: React.FC<NotificationEditorProps> = ({ notification, apiUrl, apiKey, onSave, onDelete, onSend, onCancel }) => {
	const [formData, setFormData] = React.useState<Partial<Notification>>(notification);
    const [isPrivate, setIsPrivate] = useState<boolean>(notification.private || false);
    const [selectedRecipients, setSelectedRecipients] = useState<Array<{id: string, name: string, type: 'user' | 'school' | 'event'}>>([])
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Array<{id: string, name: string, type: 'user' | 'school' | 'event'}>>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isLoadingRecipients, setIsLoadingRecipients] = useState(notification.userids?.length != null && notification.userids?.length > 0);

    interface User {
        id: string;
        shortName: string;
        fullName: string;
        email: string;
        school_id: string;
    }
      
    interface School {
        id: string;
        name: string;
        privateCode: string;
    }

    // Load recipient details if there are recipients
    useEffect(() => {
        const loadRecipientDetails = async () => {
            if (!notification.userids || notification.userids.length === 0) {
                setIsLoadingRecipients(false);
                return;
            }
    
            try {
                // Extract all IDs from notification.userids
                const ids = notification.userids
                
                // Fetch all users and schools in parallel
                const [usersResponse, schoolsResponse, eventsResponse] = await Promise.all([
                    fetch(`${apiUrl}/admin/users`, {
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                        }
                    }),
                    fetch(`${apiUrl}/admin/schools`, {
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                        }
                    }),
                    fetch(`${apiUrl}/admin/s/events`, {
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                        }
                    })
                ]);
                
                // Parse the responses
                const users = usersResponse.ok ? await usersResponse.json() : [];
                const schools = schoolsResponse.ok ? await schoolsResponse.json() : [];
                const events = eventsResponse.ok ? await eventsResponse.json() : [];
                
                // Create maps for faster lookups
                const userMap = new Map<string, User>();
                users.forEach((user: User) => {
                    userMap.set(user.id, user);
                });
                
                const schoolMap = new Map<string, School>();
                schools.forEach((school: School) => {
                    schoolMap.set(school.id, school);
                });

                const eventMap = new Map<string, Event>();
                events.forEach((evt: Event) => {
                    eventMap.set(evt.id, evt)
                })
                
                // Map IDs to recipient objects with names
                const updatedRecipients = ids.map(id => {
                    if (userMap.has(id)) {
                        const user = userMap.get(id)!;
                        return {
                            id,
                            name: `${user.fullName} (${user.shortName})`,
                            type: 'user' as const
                        };
                    } else if (schoolMap.has(id)) {
                        const school = schoolMap.get(id)!;
                        return {
                            id,
                            name: `${school.name} (School)`,
                            type: 'school' as const
                        };
                    } else if(eventMap.has(id)) {
                        const evt = eventMap.get(id)!;
                        return {
                            id,
                            name: `${evt.name} (Event)`,
                            type: 'event' as const
                        }
                    } else {
                        return {
                            id,
                            name: "Unknown Recipient",
                            type: 'user' as const // Default type
                        };
                    }
                });
                
                setSelectedRecipients(updatedRecipients);
            } catch (error) {
                console.error("Error loading recipient details:", error);
            } finally {
                setIsLoadingRecipients(false);
            }
        };
    
        loadRecipientDetails();
    }, [notification.userids, apiUrl, apiKey]);

    // Search for users and schools
    const searchRecipientsDebounced = async (term: string) => {
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            // Fetch users
            const usersResponse = await fetch(`${apiUrl}/admin/users?search=${encodeURIComponent(term)}`, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                }
            });
            
            // Fetch schools
            const schoolsResponse = await fetch(`${apiUrl}/admin/schools?search=${encodeURIComponent(term)}`, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                }
            });

            // Fetch events
            const eventsResponse = await fetch(`${apiUrl}/admin/s/events?search=${encodeURIComponent(term)}`, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                }
            });

            if (!usersResponse.ok || !schoolsResponse.ok || !eventsResponse.ok) {
                throw new Error('Failed to fetch search results');
            }

            const users = await usersResponse.json();
            const schools = await schoolsResponse.json();
            const events = await eventsResponse.json();

            // Format results
            const formattedUsers = users.map((user: User) => ({
                id: user.id,
                name: `${user.fullName} (${user.shortName})`,
                type: 'user' as const
            }));

            const formattedSchools = schools.map((school: School) => ({
                id: school.id,
                name: `${school.name} (School)`,
                type: 'school' as const
            }));

            const formattedEvents = events.map((evt: Event) => ({
                id: evt.id,
                name: `${evt.name} (Event)`,
                type: 'event' as const
            }));

            setSearchResults([...formattedUsers, ...formattedSchools, ...formattedEvents]);
        } catch (error) {
            console.error('Error searching recipients:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // Debounce the search to avoid excessive API calls
    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchTerm) {
                searchRecipientsDebounced(searchTerm);
            }
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm, searchRecipientsDebounced]);

    // Handle recipient selection
    const handleRecipientSelect = (recipient: {id: string, name: string, type: 'user' | 'school' | 'event'}) => {
        // Check if recipient is already selected
        if (!selectedRecipients.some(r => r.id === recipient.id && r.type === recipient.type)) {
            setSelectedRecipients([...selectedRecipients, recipient]);
        }
        setSearchTerm('');
        setSearchResults([]);
    };

    // Handle recipient removal
    const handleRemoveRecipient = (id: string) => {
        setSelectedRecipients(selectedRecipients.filter(recipient => recipient.id !== id));
    };

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

    // Handle private toggle
    const handlePrivateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsPrivate(e.target.checked);
    };

	// Save notification
	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		
		try {
            // Prepare the request payload
            const payload = {
                ...formData,
                private: isPrivate,
                recipients: isPrivate ? selectedRecipients.map(recipient => ({
                    id: recipient.id,
                    type: recipient.type
                })) : []
            };
            
			const response = await fetch(`${apiUrl}/admin/notifications/${formData.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
				body: JSON.stringify(payload),
			});
			
			if (!response.ok) {
				throw new Error('Failed to update notification');
			}
			
			const updatedNotification = await response.json();
			onSave(updatedNotification.notification);
		} catch (err) {
			console.error('Failed to save notification:', err);
		}
	};

	// Send notification
	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		
		try {
            // Prepare the request payload
            const payload = {
                ...formData,
                isPrivate: isPrivate,
                recipients: isPrivate ? selectedRecipients.map(recipient => ({
                    id: recipient.id,
                    type: recipient.type
                })) : [],
                published: true
            };
            
			const response = await fetch(`${apiUrl}/admin/notifications/${formData.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
				body: JSON.stringify(payload),
			});
			
			if (!response.ok) {
				throw new Error('Failed to send notification');
			}
			
			const updatedNotification = await response.json();
			onSend(updatedNotification.notification);
		} catch (err) {
			console.error('Failed to send notification:', err);
		}
	};

	// Delete notification
	const handleDelete = async () => {
		try {
			const response = await fetch(`${apiUrl}/admin/notifications/${formData.id}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
				},
			});
			
			if (!response.ok) {
				throw new Error('Failed to delete notification');
			}
			
			onDelete(formData.id as string);
		} catch (err) {
			console.error('Failed to delete notification:', err);
		}
	};

	return (
		<div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg">
			<h2 className="text-xl font-semibold mb-4">Edit Notification</h2>
			<form>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
						<input
							type="text"
							name="title"
							value={formData.title || ''}
							onChange={handleInputChange}
							className="w-full p-2 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
							required
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
						<input
							type="date"
							name="date"
							value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''}
							onChange={handleDateChange}
							className="w-full p-2 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
							required
						/>
					</div>
				</div>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                    <select
                        name="category"
                        value={formData.category || 'general'}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
                        required
                    >
                        <option value="general">General</option>
                        <option value="event">Event</option>
                        <option value="chapter">Chapter</option>
                    </select>
                </div>
				
				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
					<textarea
						name="description"
						value={formData.description || ''}
						onChange={handleInputChange}
						rows={4}
						className="w-full p-2 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
						required
					/>
				</div>
                
                <div className="mb-4">
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={isPrivate}
                            onChange={handlePrivateChange}
                            className="h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-gray-300">Private Notification</span>
                    </label>
                </div>

                {isPrivate && (
                    <div className="mb-4 bg-gray-700 p-4 rounded-lg">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Recipients (Users, Events & Schools)</label>
                        <div className="mb-2">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search for users, events or schools..."
                                className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
                            />
                        </div>

                        {/* Search Results */}
                        {isSearching ? (
                            <div className="py-2 text-gray-400">Searching...</div>
                        ) : searchResults.length > 0 && (
                            <ul className="max-h-40 overflow-y-auto bg-gray-600 rounded p-2 mb-3">
                                {searchResults.map((result) => (
                                    <li 
                                        key={`${result.type}-${result.id}`}
                                        className="py-1 px-2 hover:bg-gray-500 cursor-pointer rounded"
                                        onClick={() => handleRecipientSelect(result)}
                                    >
                                        {result.name}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Selected Recipients */}
                        {isLoadingRecipients ? (
                            <div className="py-2 text-gray-400">Loading recipients...</div>
                        ) : selectedRecipients.length > 0 ? (
                            <div className="mt-2">
                                <h4 className="text-sm font-medium text-gray-300 mb-1">Selected Recipients:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedRecipients.map((recipient) => (
                                        <div 
                                            key={`selected-${recipient.type}-${recipient.id}`}
                                            className="flex items-center gap-1 bg-indigo-600 text-white text-sm px-2 py-1 rounded"
                                        >
                                            <span>{recipient.name}</span>
                                            <button 
                                                type="button"
                                                onClick={() => handleRemoveRecipient(recipient.id)}
                                                className="text-white hover:text-gray-200 ml-1"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="py-2 text-gray-400">No recipients selected</div>
                        )}
                    </div>
                )}
				
				<div className="flex justify-end space-x-3">
					<button
						type="button"
						onClick={onCancel}
						className="px-4 py-2 border border-gray-300 rounded-md text-gray-300 hover:bg-gray-700"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleDelete}
						className="px-4 py-2 border border-red-300 rounded-md text-red-300 hover:bg-red-700"
					>
						Delete
					</button>
					<button
						type="button"
                        onClick={handleSave}
						className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
					>
						Save
					</button>
					<button
						type="button"
						onClick={handleSend}
						className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
					>
						Send
					</button>
				</div>
			</form>
		</div>
	);
};

export default NotificationEditor;