'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
	
interface Event {
    id: string; // UUID
    name: string;
    location: string;
    startTime: string; // ISO string for start time
    endTime: string; // ISO string for end time
    startTimeTime: string; // Time string for start time
    endTimeTime: string; // Time string for end time
    createdAt?: string; // Adding this for sorting/display purposes
}

const EventsManager: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nctsa-api.bedson.tech';
    const { data: session } = useSession();
    const apiKey = session?.user.apiKey; 
    
    // Form state
    const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [formData, setFormData] = useState<Partial<Event>>({
        name: '',
        location: '',
        startTime: new Date().toISOString().split('T')[0],
        endTime: new Date().toISOString().split('T')[0],

        startTimeTime: new Date().toISOString().split('T')[1].slice(0, 5),
        endTimeTime: new Date(Date.now() + 60 * 60 * 1000).toISOString().split('T')[1].slice(0, 5),
    });

    // Fetch events
    const fetchEvents = useCallback(async () => {
        try {
            const response = await fetch(`${apiUrl}/admin/events`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch events');
            }
            const data = await response.json();
            
            // Sort by startTime if available, otherwise by createdAt
            const sortedData = [...data].sort((a, b) => {
                if (a.startTime && b.startTime) {
                    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
                } else if (a.createdAt && b.createdAt) {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
                return 0;
            });
            
            setEvents(sortedData);
        } catch (err) {
            setError('Error fetching events');
            console.error(err);
        } 
    }, [apiUrl, apiKey])

    // Initial load and refresh every 10 seconds
    useEffect(() => {
        (async () => {
            setLoading(true);
            await fetchEvents();
            setLoading(false);
        })();
        const interval = setInterval(fetchEvents, 10 * 1000);
        
        // Clean up interval on component unmount
        return () => clearInterval(interval);
    }, [fetchEvents]);

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            location: '',
            startTime: new Date().toISOString().split('T')[0],
            endTime: new Date().toISOString().split('T')[0],
            startTimeTime: new Date().toISOString().split('T')[1].slice(0, 5),
            endTimeTime: new Date(Date.now() + 60 * 60 * 1000).toISOString().split('T')[1].slice(0, 5),
        });
        setEditingEvent(null);
    };

    // Open form for editing
    const handleEdit = (event: Event) => {
        setEditingEvent(event);
        const startDate = new Date(event.startTime);
        const endDate = new Date(event.endTime);
        
        setFormData({
            name: event.name,
            location: event.location,
            startTime: startDate.toISOString().split('T')[0],
            endTime: endDate.toISOString().split('T')[0],
            startTimeTime: startDate.toISOString().split('T')[1].slice(0, 5),
            endTimeTime: endDate.toISOString().split('T')[1].slice(0, 5),
        });
        setIsFormOpen(true);
    };

    // Submit form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Combine date and time fields
        const combinedStartTime = new Date(`${formData.startTime}T${formData.startTimeTime}`).toISOString();
        const combinedEndTime = new Date(`${formData.endTime}T${formData.endTimeTime}`).toISOString();
        
        // Validate end time is after start time
        if (new Date(combinedEndTime) <= new Date(combinedStartTime)) {
            setError('End time must be after start time');
            return;
        }
        
        try {
            if (editingEvent) {
                // Update existing event
                const response = await fetch(`${apiUrl}/admin/events/${editingEvent.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        name: formData.name,
                        location: formData.location,
                        startTime: combinedStartTime,
                        endTime: combinedEndTime,
                    }),
                });
                
                if (!response.ok) {
                    throw new Error('Failed to update event');
                }

                // Refresh data
                const data = await response.json();
                setEvents(prev => prev.map((event) => event.id === data.event.id ? data.event : event));
            } else {
                // Create new event
                const response = await fetch(`${apiUrl}/admin/events`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        name: formData.name,
                        location: formData.location,
                        startTime: combinedStartTime,
                        endTime: combinedEndTime,
                    }),
                });
                
                if (!response.ok) {
                    throw new Error('Failed to create event');
                }

                // Refresh data
                const data = await response.json();
                setEvents([data.event, ...events]);
            }
            
            // Reset and close form
            resetForm();
            setIsFormOpen(false);
            setError(null);
        } catch (err) {
            setError('Failed to save event');
            console.error(err);
        }
    };

    // Delete event
    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this event?')) {
            return;
        }
        
        try {
            const response = await fetch(`${apiUrl}/admin/events/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete event');
            }
            
            // Remove from state
            setEvents(prev => prev.filter((event) => event.id !== id));
        } catch (err) {
            setError('Failed to delete event');
            console.error(err);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-200">Events Manager</h1>
                <button
                    onClick={() => {
                        resetForm();
                        setIsFormOpen(!isFormOpen);
                    }}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Event
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {isFormOpen && (
                <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg mb-6">
                    <h2 className="text-xl font-semibold mb-4">
                        {editingEvent ? 'Edit Event' : 'Add New Event'}
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name || ''}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location || ''}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    name="startTime"
                                    value={formData.startTime || ''}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Start Time</label>
                                <input
                                    type="time"
                                    name="startTimeTime"
                                    value={formData.startTimeTime || ''}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                                <input
                                    type="date"
                                    name="endTime"
                                    value={formData.endTime || ''}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">End Time</label>
                                <input
                                    type="time"
                                    name="endTimeTime"
                                    value={formData.endTimeTime || ''}
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => {
                                    resetForm();
                                    setIsFormOpen(false);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md text-gray-300 hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                {editingEvent ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            ) : events.length === 0 ? (
                <div className="text-center p-8 bg-gray-800 rounded-lg">
                    <p className="text-gray-300">No events found. Create your first one!</p>
                </div>
            ) : (
                <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-600">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Event
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Location
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Start Time
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    End Time
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-600">
                            {events.map((event) => (
                                <tr key={event.id} className="hover:bg-gray-700">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-200">{event.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        {event.location}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        {format(parseISO(event.startTime), 'MMM dd, yyyy h:mm a')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        {format(parseISO(event.endTime), 'MMM dd, yyyy h:mm a')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => handleEdit(event)}
                                                className="text-indigo-400 hover:text-indigo-200"
                                                title="Edit"
                                            >
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(event.id)}
                                                className="text-red-400 hover:text-red-200"
                                                title="Delete"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default EventsManager;