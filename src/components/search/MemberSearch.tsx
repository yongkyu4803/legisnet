'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  X,
  User,
  Users,
  TrendingUp,
  Loader2
} from 'lucide-react';

interface MemberSearchResult {
  memberId: string;
  name: string;
  age: number;
  proposedCount: number;
  cosponsorCount: number;
  totalBills: number;
}

interface MemberSearchProps {
  onMemberSelect: (memberId: string) => void;
  className?: string;
}

export function MemberSearch({ onMemberSelect, className = '' }: MemberSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search API call
  useEffect(() => {
    const searchMembers = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/members?q=${encodeURIComponent(query)}&pageSize=8`
        );

        if (response.ok) {
          const data = await response.json();
          setResults(data.items);
          setIsOpen(true);
          setSelectedIndex(-1);
        } else {
          console.error('Search API error:', response.status, response.statusText);
          setResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchMembers, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleMemberSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleMemberSelect = (member: MemberSearchResult) => {
    onMemberSelect(member.memberId);
    setQuery(member.name);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
          placeholder="의원 이름 검색..."
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
        />

        {/* Loading Spinner */}
        {isLoading && (
          <Loader2 className="absolute right-8 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}

        {/* Clear Button */}
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 max-h-96 overflow-y-auto z-50 shadow-lg border">
          <CardContent className="p-0">
            {results.map((member, index) => (
              <div
                key={member.memberId}
                onClick={() => handleMemberSelect(member)}
                className={`p-3 cursor-pointer border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                  index === selectedIndex ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="font-medium text-gray-900 truncate">
                        {member.name}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {member.age}대 국회
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        대표발의: {member.proposedCount}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        공동발의: {member.cosponsorCount}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* More results indicator */}
            {results.length === 8 && (
              <div className="p-2 text-center text-xs text-gray-500 bg-gray-50">
                더 구체적인 검색어를 입력하면 더 정확한 결과를 볼 수 있습니다
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No results */}
      {isOpen && !isLoading && query.length >= 2 && results.length === 0 && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg border">
          <CardContent className="p-4 text-center text-sm text-gray-500">
            <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            "{query}"에 대한 검색 결과가 없습니다
          </CardContent>
        </Card>
      )}
    </div>
  );
}