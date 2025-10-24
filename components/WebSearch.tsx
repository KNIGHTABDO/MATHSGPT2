
import React, { useState } from 'react';
import { searchWeb } from '../services/geminiService';
import type { SearchResult } from '../types';
import Button from './ui/Button';
import Card from './ui/Card';
import Spinner from './ui/Spinner';

const WebSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!query.trim()) {
      setError('Please enter a search query.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await searchWeb(query);
      setResult(res);
    } catch (e) {
      setError('An error occurred during the search. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            className="flex-grow p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            placeholder="Ask anything about recent events or topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading} className="sm:w-auto">
            {isLoading ? <Spinner /> : 'Search'}
          </Button>
        </form>
      </Card>
      {error && <Card><p className="text-red-400">{error}</p></Card>}
      {result && (
        <Card>
          <div className="space-y-4">
            <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: result.answer.replace(/\n/g, '<br />') }}/>

            {result.sources.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-400">Sources:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {result.sources.map((source, index) => (
                    <li key={index}>
                      <a
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline transition"
                      >
                        {source.title || source.uri}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default WebSearch;
