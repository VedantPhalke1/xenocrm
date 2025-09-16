'use client'
import { useState } from 'react';
import { QueryBuilder, formatQuery } from 'react-querybuilder';
import 'react-querybuilder/dist/react-querybuilder.css';
import axios from 'axios';

// Define the fields available for segmentation
const fields = [
    { name: 'totalSpends', label: 'Total Spend', inputType: 'number' },
    { name: 'visits', label: 'Number of Visits', inputType: 'number' },
    { name: 'lastVisit', label: 'Last Visit Date', inputType: 'date' },
];

const initialQuery = {
    combinator: 'and',
    rules: [
        { field: 'totalSpends', operator: '>', value: 10000 },
    ],
};

export default function RuleBuilder() {
    const [query, setQuery] = useState(initialQuery);
    const [message, setMessage] = useState("Here's a special 10% off for you!");
    const [status, setStatus] = useState({ type: '', text: '' });
    const [prompt, setPrompt] = useState('');

    const handleGenerateFromText = async () => {
        if (!prompt) return;
        setStatus({ type: 'loading', text: '🤖 Generating rules from your text...' });
        try {
            const res = await axios.post('/api/segments/generate-from-text', { prompt });
            setQuery(res.data);
            setStatus({ type: 'success', text: 'Rules generated successfully!' });
        } catch (error) {
            setStatus({ type: 'error', text: 'Failed to generate rules. Please try again.' });
            console.error(error);
        }
    };

    const handleCreateCampaign = async () => {
        setStatus({ type: 'loading', text: '🚀 Sending campaign to the queue...' });
        try {
            const res = await axios.post('/api/campaigns', {
                rules: query,
                messageTemplate: message,
            });
            setStatus({ type: 'success', text: res.data.message });
        } catch (error) {
            setStatus({ type: 'error', text: 'Failed to create campaign.' });
            console.error(error);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            {/* AI Feature Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-md border">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">✨ AI-Powered Segment Builder</h3>
                <p className="text-sm text-gray-500 mb-3">Describe your audience in plain English.</p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., users with more than 3 visits and spend over 5000"
                        className="flex-grow p-2 border rounded-md"
                    />
                    <button onClick={handleGenerateFromText} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">
                        Generate
                    </button>
                </div>
            </div>

            {/* Rule Builder Section */}
            <div className="query-builder-container mb-4">
                <QueryBuilder fields={fields} query={query} onQueryChange={q => setQuery(q)} />
            </div>

            {/* Message and Action Section */}
            <div className="mt-6">
                <label htmlFor="message" className="block text-md font-medium text-gray-700 mb-2">Campaign Message</label>
                <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="w-full p-2 border rounded-md shadow-sm"
                ></textarea>
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleCreateCampaign}
                    className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors"
                >
                    Save & Launch Campaign
                </button>
            </div>

            {/* Status Message */}
            {status.text && (
                <div className={`mt-4 p-3 rounded-md text-center ${
                    status.type === 'success' ? 'bg-green-100 text-green-800' :
                    status.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                    {status.text}
                </div>
            )}
        </div>
    );
}