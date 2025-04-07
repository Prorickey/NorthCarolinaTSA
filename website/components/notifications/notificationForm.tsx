import React, { useState, useEffect } from 'react';
import { Notification } from './notification';

interface NotificationFormProps {
  formData: Partial<Notification>;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  resetForm: () => void;
  isPrivate: boolean;
  setIsPrivate: (isPrivate: boolean) => void;
  selectedRecipients: Array<{id: string, name: string, type: 'user' | 'school' | 'event'}>;
  setSelectedRecipients: (recipients: Array<{id: string, name: string, type: 'user' | 'school' | 'event'}>) => void;
  apiKey: string;
  apiUrl: string;
}

const NotificationForm: React.FC<NotificationFormProps> = ({
  formData,
  handleInputChange,
  handleDateChange,
  handleSubmit,
  resetForm,
  isPrivate,
  setIsPrivate,
  selectedRecipients,
  setSelectedRecipients,
  apiKey,
  apiUrl
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{id: string, name: string, type: 'user' | 'school' | 'event'}>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Function to search for users and schools
  const searchRecipientsDebounced = async (term: string) => {
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

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

      // Fetch events by search
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

      interface Event {
        id: string;
        name: string;
      }

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

  const handleRecipientSelect = (recipient: {id: string, name: string, type: 'user' | 'school' | 'event'}) => {
    setSelectedRecipients([...selectedRecipients, recipient]);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleRemoveRecipient = (id: string) => {
    setSelectedRecipients(selectedRecipients.filter(recipient => recipient.id !== id));
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Create New Notification</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-gray-300 mb-2">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title || ''}
            onChange={handleInputChange}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="category" className="block text-gray-300 mb-2">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category || 'general'}
            onChange={handleInputChange}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            required
          >
            <option value="general">General</option>
            <option value="event">Event</option>
            <option value="chapter">Chapter</option>
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="description" className="block text-gray-300 mb-2">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleInputChange}
            rows={4}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="date" className="block text-gray-300 mb-2">Date</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''}
            onChange={handleDateChange}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            required
          />
        </div>

        <div className="mb-4">
			<label className="flex items-center space-x-2">
				<input
				type="checkbox"
				checked={isPrivate}
				onChange={(e) => {
					console.log("Checkbox changed:", e.target.checked); // Add this for debugging
					setIsPrivate(e.target.checked);
				}}
				className="h-4 w-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
				/>
				<span className="text-gray-300">Private Notification</span>
			</label>
		</div>

        {isPrivate && (
          <div className="mb-4 bg-gray-700 p-4 rounded-lg">
            <label className="block text-gray-300 mb-2">Recipients (Users & Schools)</label>
            <div className="mb-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for users or schools..."
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
            {selectedRecipients.length > 0 && (
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
            )}
          </div>
        )}

        <div className="flex space-x-4">
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default NotificationForm;