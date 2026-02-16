'use client';

import { useState, useEffect } from 'react';
import { TemplateCard } from '../../../components/templates/TemplateCard';
import type { Template } from '../../api/templates/route';

type FilterTab = 'all' | 'bingo' | 'trivia';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  // Update filtered templates when filter or templates change
  useEffect(() => {
    if (filter === 'all') {
      setFilteredTemplates(templates);
    } else {
      setFilteredTemplates(templates.filter((t) => t.game === filter));
    }
  }, [filter, templates]);

  // Update URL when filter changes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (filter === 'all') {
      url.searchParams.delete('filter');
    } else {
      url.searchParams.set('filter', filter);
    }
    window.history.replaceState({}, '', url);
  }, [filter]);

  // Read filter from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlFilter = urlParams.get('filter') as FilterTab | null;
    if (urlFilter && ['all', 'bingo', 'trivia'].includes(urlFilter)) {
      setFilter(urlFilter);
    }
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
      setErrors(data.errors || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setErrors(['Failed to fetch templates']);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, game: 'bingo' | 'trivia') {
    try {
      const response = await fetch(`/api/templates/${id}?game=${game}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      // Remove from local state with animation
      setTemplates((prev) => prev.filter((t) => t.id !== id));

      // TODO: Show toast notification
    } catch (error) {
      console.error('Failed to delete template:', error);
      // TODO: Show error toast
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Game Templates
        </h1>
        <p className="text-lg text-gray-600">
          Manage your saved Bingo and Trivia templates
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
          <p className="text-base font-medium text-yellow-900 mb-2">
            Some game APIs are unavailable:
          </p>
          <ul className="list-disc list-inside text-base text-yellow-800">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b-2 border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-3 text-lg font-medium transition-colors ${
            filter === 'all'
              ? 'text-blue-600 border-b-2 border-blue-600 -mb-0.5'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All ({templates.length})
        </button>
        <button
          onClick={() => setFilter('bingo')}
          className={`px-6 py-3 text-lg font-medium transition-colors ${
            filter === 'bingo'
              ? 'text-blue-600 border-b-2 border-blue-600 -mb-0.5'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Bingo ({templates.filter((t) => t.game === 'bingo').length})
        </button>
        <button
          onClick={() => setFilter('trivia')}
          className={`px-6 py-3 text-lg font-medium transition-colors ${
            filter === 'trivia'
              ? 'text-blue-600 border-b-2 border-blue-600 -mb-0.5'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Trivia ({templates.filter((t) => t.game === 'trivia').length})
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-100 border-2 border-gray-200 rounded-lg p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-200 rounded mb-4 w-3/4" />
              <div className="h-4 bg-gray-200 rounded mb-2 w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Templates Grid */}
      {!loading && filteredTemplates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTemplates.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-gray-200">
          <p className="text-2xl font-medium text-gray-900 mb-2">
            No {filter === 'all' ? '' : filter} templates yet
          </p>
          <p className="text-lg text-gray-600">
            Create templates in Bingo or Trivia games
          </p>
        </div>
      )}
    </div>
  );
}
