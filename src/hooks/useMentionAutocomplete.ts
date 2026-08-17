import { useState, useRef, useCallback, useEffect } from 'react';
import { Profile } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface MentionState {
  isOpen: boolean;
  query: string;
  startIndex: number;
  results: Profile[];
  isLoading: boolean;
  selectedIndex: number;
}

const CLOSED: MentionState = {
  isOpen: false,
  query: '',
  startIndex: -1,
  results: [],
  isLoading: false,
  selectedIndex: 0,
};

export function useMentionAutocomplete(
  content: string,
  setContent: (val: string) => void,
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
) {
  const [mention, setMention] = useState<MentionState>(CLOSED);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>('');

  const close = useCallback(() => {
    setMention(CLOSED);
    lastQueryRef.current = '';
  }, []);

  // Main detection: runs on every content change
  useEffect(() => {
    // Get cursor position — use textarea ref directly
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? content.length;
    const textBeforeCursor = content.slice(0, cursor);

    // Find @trigger: last @ before cursor with no space after it
    const match = textBeforeCursor.match(/@([\w]*)$/);

    if (!match) {
      if (mention.isOpen) close();
      return;
    }

    const query = match[1];
    const startIndex = cursor - 1 - query.length; // position of @

    // Avoid redundant searches
    if (query === lastQueryRef.current && mention.isOpen) {
      setMention(prev => ({ ...prev, startIndex, selectedIndex: 0 }));
      return;
    }

    lastQueryRef.current = query;

    setMention(prev => ({
      ...prev,
      isOpen: true,
      query,
      startIndex,
      selectedIndex: 0,
      results: query === '' ? prev.results : prev.results, // keep stale while loading
    }));

    // Debounce DB search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!isSupabaseConfigured()) {
        setMention(prev => ({ ...prev, isLoading: false }));
        return;
      }

      setMention(prev => ({ ...prev, isLoading: true }));

      try {
        let queryBuilder = supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .limit(6);

        if (query.trim()) {
          queryBuilder = queryBuilder.or(
            `username.ilike.${query}%,full_name.ilike.${query}%`
          );
        } else {
          // No query yet — show recent/any profiles
          queryBuilder = queryBuilder.order('created_at', { ascending: false });
        }

        const { data, error } = await queryBuilder;
        if (!error) {
          setMention(prev => ({
            ...prev,
            results: (data as Profile[]) ?? [],
            isLoading: false,
          }));
        } else {
          setMention(prev => ({ ...prev, isLoading: false }));
        }
      } catch {
        setMention(prev => ({ ...prev, isLoading: false }));
      }
    }, 180);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const selectMention = useCallback(
    (profile: Profile) => {
      const before = content.slice(0, mention.startIndex);
      const after = content.slice(mention.startIndex + 1 + mention.query.length);
      const inserted = `@${profile.username} `;
      const newContent = before + inserted + after;
      setContent(newContent);
      close();
      // Restore cursor position after insert
      setTimeout(() => {
        const el = textareaRef.current;
        if (!el) return;
        const pos = before.length + inserted.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      }, 0);
    },
    [content, mention.startIndex, mention.query.length, setContent, close, textareaRef]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (!mention.isOpen || mention.results.length === 0) return false;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMention(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % prev.results.length,
        }));
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMention(prev => ({
          ...prev,
          selectedIndex: (prev.selectedIndex - 1 + prev.results.length) % prev.results.length,
        }));
        return true;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        const selected = mention.results[mention.selectedIndex];
        if (selected) {
          e.preventDefault();
          selectMention(selected);
          return true;
        }
      }
      if (e.key === 'Escape') {
        close();
        return true;
      }
      return false;
    },
    [mention, selectMention, close]
  );

  return { mention, selectMention, handleKeyDown, close };
}
