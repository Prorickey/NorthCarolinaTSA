'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
	
interface AgendaItem {
	id: number;
	title: string;
	description: string;
	date: string; // Date and time combined
	time: string;
	endTime: string;
	location: string;
	icon?: string;
	createdAt: string;
	published?: boolean; // Adding published status (might need backend update)
}

const getDate = () => {
	const localTime = new Date();
	return new Date(localTime.getTime() - (localTime.getTimezoneOffset() * 60000));
}

const AgendaManager: React.FC = () => {
	const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nctsa-api.bedson.tech';
	const { data: session } = useSession();

	const apiKey = session?.user.apiKey; // This should be securely stored in production
	
	// Form state
	const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
	const [editingItem, setEditingItem] = useState<AgendaItem | null>(null);
	const [formData, setFormData] = useState<Partial<AgendaItem>>({
		title: '',
		description: '',
		date: getDate().toISOString().split('T')[0],
		time: getDate().toISOString().split('T')[1].slice(0, 5), // Add time field
		endTime: getDate().toISOString().split('T')[1].slice(0, 5), // Add time field
		location: '',
		published: true,
	});

	// Fetch agenda items
	const fetchAgendaItems = useCallback(async () => {
		try {
			const response = await fetch(apiUrl + '/admin/agenda', {
				headers: {
					'Authorization': `Bearer ${apiKey}`,
				}
			});
			if (!response.ok) {
				throw new Error('Failed to fetch agenda items');
			}
			const data = await response.json();
			
			// Sort by date
			const sortedData = [...data].sort((a, b) => 
				new Date(a.date).getTime() - new Date(b.date).getTime()
			);
			
			setAgendaItems(sortedData);
		} catch (err) {
			setError('Error fetching agenda items');
			console.error(err);
		} 
	}, [apiUrl, apiKey])

	// Initial load and refresh every 10 seconds
	useEffect(() => {
		(async () => {
			setLoading(true);
			await fetchAgendaItems();
			setLoading(false);
		})();
		setInterval(fetchAgendaItems, 10 * 1000)
	}, [fetchAgendaItems])

	useEffect(() => {
		fetchAgendaItems();
	}, [fetchAgendaItems]);

	// Handle form input changes
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target;
		console.log(name, value)
		setFormData({
			...formData,
			[name]: value,
		});
	};

	// Handle checkbox changes
	const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, checked } = e.target;
		setFormData({
			...formData,
			[name]: checked,
		});
	};

	// Reset form
	const resetForm = () => {
		setFormData({
			title: '',
			description: '',
			date: getDate().toISOString().split('T')[0],
			time: getDate().toISOString().split('T')[1].slice(0, 5), // Reset time field
			endTime: getDate().toISOString().split('T')[1].slice(0, 5), // Reset time field
			location: '',
			published: true,
		});
		setEditingItem(null);
	};

	// Open form for editing
	const handleEdit = (item: AgendaItem) => {
		setEditingItem(item);
		setFormData({
			title: item.title,
			description: item.description,
			date: new Date((new Date(item.date).getTime())).toISOString().split('T')[0],
			time: new Date((new Date(item.date).getTime())).toISOString().split('T')[1].slice(0, 5), // Set time field
			endTime: new Date((new Date(item.date).getTime())) .toISOString().split('T')[1].slice(0, 5), // Set time field
			location: item.location,
			published: item.published,
		});
		setIsFormOpen(true);
	};

	// Submit form
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		// Combine date and time fields
		const combinedDateTime = new Date(new Date(`${formData.date}T${formData.time}`).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString();
		const combinedEndDateTime = new Date(new Date(`${formData.date}T${formData.endTime}`).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString();

		try {
			if (editingItem) {
				// Update existing item
				const response = await fetch(`${apiUrl}/admin/agenda/${editingItem.id}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${apiKey}`,
					},
					body: JSON.stringify({ ...formData, date: combinedDateTime, endTime: combinedEndDateTime }),
				});
				
				if (!response.ok) {
					throw new Error('Failed to update agenda item');
				}

				// Refresh data
				const data = await response.json();
				setAgendaItems(prev => prev.map((item) => item.id === data.agenda.id ? data.agenda : item));
			} else {
				// Create new item
				const response = await fetch(`${apiUrl}/admin/agenda`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${apiKey}`,
					},
					body: JSON.stringify({ ...formData, date: combinedDateTime, endTime: combinedEndDateTime }),
				});
				
				if (!response.ok) {
					throw new Error('Failed to create agenda item');
				}

				// Refresh data
				const data = await response.json();
				setAgendaItems([...agendaItems, data.agenda]);
			}
			
			// Reset and close form
			resetForm();
			setIsFormOpen(false);
		} catch (err) {
			setError('Failed to save agenda item');
			console.error(err);
		}
	};

	// Delete agenda item
	const handleDelete = async (id: number) => {
		if (!window.confirm('Are you sure you want to delete this agenda item?')) {
			return;
		}
		
		try {
			const response = await fetch(`${apiUrl}/admin/agenda/${id}`, {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
				}
			});
			
			if (!response.ok) {
				throw new Error('Failed to delete agenda item');
			}
			
			// Refresh data
			setAgendaItems(prev => prev.filter((item) => item.id !== id));
		} catch (err) {
			setError('Failed to delete agenda item');
			console.error(err);
		}
	};

	// Toggle publish status
	const togglePublishStatus = async (item: AgendaItem) => {
		try {
			const response = await fetch(`${apiUrl}/admin/agenda/${item.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					...item,
					published: !item.published,
				}),
			});
			
			if (!response.ok) {
				throw new Error('Failed to update publish status');
			}
			
			// Refresh data
			const data = await response.json();
			setAgendaItems(prev => prev.map((i) => i.id === data.agenda.id ? data.agenda : i));
		} catch (err) {
			setError('Failed to update publish status');
			console.error(err);
		}
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-bold text-gray-200">Agenda Manager</h1>
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
						{editingItem ? 'Edit Event' : 'Add New Event'}
					</h2>
					<form onSubmit={handleSubmit}>
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
									value={formData.date || ''}
									onChange={handleInputChange}
									className="w-full p-2 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-300 mb-1">Start Time</label>
								<input
									type="time"
									name="time"
									value={formData.time || ''}
									onChange={handleInputChange}
									className="w-full p-2 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
									required
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-300 mb-1">End Time</label>
								<input
									type="time"
									name="endTime"
									value={formData.endTime || ''}
									onChange={handleInputChange}
									className="w-full p-2 border border-gray-600 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white"
									required
								/>
							</div>
						</div>
						
						<div className="mb-4">
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
							<label className="flex items-center">
								<input
									type="checkbox"
									name="published"
									checked={formData.published || false}
									onChange={handleCheckboxChange}
									className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
								/>
								<span className="ml-2 text-sm text-gray-300">Published</span>
							</label>
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
								{editingItem ? 'Update' : 'Save'}
							</button>
						</div>
					</form>
				</div>
			)}

			{loading ? (
				<div className="flex justify-center items-center h-40">
					<div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
				</div>
			) : agendaItems.length === 0 ? (
				<div className="text-center p-8 bg-gray-800 rounded-lg">
					<p className="text-gray-300">No agenda items found. Create your first one!</p>
				</div>
			) : (
				<div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
					<table className="min-w-full divide-y divide-gray-600">
						<thead className="bg-gray-700">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
									Date
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
									Event
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
									Location
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="bg-gray-800 divide-y divide-gray-600">
							{agendaItems.map((item) => (
								<tr key={item.id} className="hover:bg-gray-700">
									<td className="px-6 py-4 whitespace-nowrap text-gray-300">
										{format(new Date(parseISO(item.date).getTime() + (new Date().getTimezoneOffset() * 60000)), 'MMM dd, yyyy h:mm a')}
									</td>
									<td className="px-6 py-4">
										<div className="text-sm font-medium text-gray-200">{item.title}</div>
										<div className="text-sm text-gray-400 line-clamp-2">{item.description}</div>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
										{item.location}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
											item.published 
												? 'bg-green-200 text-green-800' 
												: 'bg-yellow-200 text-yellow-800'
										}`}>
											{item.published ? 'Published' : 'Draft'}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
										<div className="flex justify-end space-x-2">
											<button
												onClick={() => togglePublishStatus(item)}
												className="text-gray-400 hover:text-gray-200"
												title={item.published ? "Unpublish" : "Publish"}
											>
												{item.published ? (
													<EyeIcon className="h-5 w-5" />
												) : (
													<EyeSlashIcon className="h-5 w-5" />
												)}
											</button>
											<button
												onClick={() => handleEdit(item)}
												className="text-indigo-400 hover:text-indigo-200"
												title="Edit"
											>
												<PencilIcon className="h-5 w-5" />
											</button>
											<button
												onClick={() => handleDelete(item.id)}
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

export default AgendaManager;