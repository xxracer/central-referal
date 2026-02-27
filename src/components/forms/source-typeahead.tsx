'use client';

import * as React from 'react';
import { searchSourcesPublicAction } from '@/lib/actions';
import { useDebounce } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Plus, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SourceTypeaheadProps {
    defaultValue?: string; // The physical name if any
    error?: string;
}

export function SourceTypeahead({ defaultValue = '', error }: SourceTypeaheadProps) {
    const [inputValue, setInputValue] = React.useState(defaultValue);
    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const [isOpen, setIsOpen] = React.useState(false);

    // Custom state to replace React Query
    const [suggestions, setSuggestions] = React.useState<Array<{ id: string; name: string }>>([]);
    const [isFetching, setIsFetching] = React.useState(false);

    // We only create a true form submission value if we either clicked an existing ID or typed a new label
    const combinedFormValue = selectedId || (inputValue ? 'new' : '');

    const debouncedSearch = useDebounce(inputValue, 400);

    // Replacement for React Query's `useQuery`
    React.useEffect(() => {
        let isMounted = true;

        const fetchSuggestions = async () => {
            if (!debouncedSearch || debouncedSearch.length < 2 || selectedId) {
                if (isMounted) setSuggestions([]);
                return;
            }

            setIsFetching(true);
            try {
                const results = await searchSourcesPublicAction(debouncedSearch);
                if (isMounted) {
                    setSuggestions(results);
                }
            } catch (error) {
                console.error("Failed to fetch suggestions:", error);
                if (isMounted) setSuggestions([]);
            } finally {
                if (isMounted) setIsFetching(false);
            }
        };

        fetchSuggestions();

        return () => {
            isMounted = false;
        };
    }, [debouncedSearch, selectedId]);

    const wrapperRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (id: string, name: string) => {
        setInputValue(name);
        setSelectedId(id);
        setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        setSelectedId(null); // Clear ID, making it a "new" draft again
        setIsOpen(true);
    };

    return (
        <div className="relative space-y-2" ref={wrapperRef}>
            <Label htmlFor="organizationName">Organization / Facility Name <span className="text-destructive">*</span></Label>

            <div className="relative">
                <Input
                    type="text"
                    id="organizationName"
                    name="organizationName" // We keep this name so the backward compat is smooth
                    placeholder="e.g., Memorial Hermann"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    required
                    autoComplete="off"
                    className={cn(
                        "bg-blue-50 text-blue-900 border-blue-200 pl-9",
                        error && "border-destructive ring-destructive"
                    )}
                />
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-blue-500/60" />

                {/* Hidden input to pass the ID if selected */}
                <input type="hidden" name="referralSourceId" value={combinedFormValue} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Dropdown Suggestions */}
            {isOpen && inputValue.trim().length >= 2 && !selectedId && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg py-1 text-sm">
                    {isFetching ? (
                        <div className="flex items-center justify-center py-4 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                    ) : suggestions.length > 0 ? (
                        <>
                            {suggestions.map((source: { id: string; name: string }) => (
                                <button
                                    key={source.id}
                                    type="button"
                                    onClick={() => handleSelect(source.id, source.name)}
                                    className="w-full text-left px-3 py-2 text-slate-700 hover:bg-blue-50 hover:text-blue-900 focus:bg-blue-50 focus:outline-none transition-colors border-b last:border-0"
                                >
                                    <div className="font-medium flex items-center justify-between">
                                        <span className="flex items-baseline gap-1.5">
                                            <span className="text-slate-400 font-normal text-xs italic">You mean:</span>
                                            <span className="font-bold text-blue-800">{source.name}</span>
                                        </span>
                                        {inputValue.toLowerCase() === source.name.toLowerCase() && (
                                            <Check className="h-3.5 w-3.5 text-blue-600" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </>
                    ) : (
                        <div className="px-3 py-3 text-sm text-slate-500 italic">
                            No matching facility found. Keep typing to use "{inputValue}".
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
