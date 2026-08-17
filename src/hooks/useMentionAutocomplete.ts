import { useState, useRef, useCallback, useEffect } from 'react';
import { Profile } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

interface MentionState {
  isOpen: boolean;
  query: string;
  startIndex: number; // position of the '@' in the string
  results: Profile[];
  isLoading: boolean;
  selectedIndex: number;
}

const INITIAL_STATE: MentionState = {
  isOpen: false,
  query: '',
  startIndex: -1,
  results: [],
  isLoading: false,
  selectedIndex: 0,
};

/**
 * Hook that detects @mention triggers in a textarea and fetches matching profiles.
 *
 * Usage:
 *   const { mention, textareaProps, selectMention, MentionDropdownProps } = useMentionAutocomplete(content, setContent, textareaRef);
 */
export function useMentionAutocomplete(
  content: string,
  setContent: (val: string) => void,
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
) {
  const [mention, setMention] = useState<MentionState>(INITIAL_STATE);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => setMention(INITIAL_STATE), []);

  // Detect @trigger on every content change
  useEffect(() => {
    const cursor = textareaRef.current?.selectionStart ?? content.length;
    const textBeforeCursor = content.slice(0, cursor);

    // Find the last @ before cursor that hasn't been closed by whitespace
    const match = textBeforeCursor.match(/@([\w]*)$/);

    if (!match) {
      if (mention.isOpen) close();
      return;
    }

    const query = match[1]; // the part after @
    const startIndex = textBeforeCursor.lastIndexOf('@');

    setMention((prev) => ({
      ...prev,
      isOpen: true,
      query,
      startIndex,
      selectedIndex: 0,
    }));

    // Debounce DB search
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      if (!isSupabaseConfigured()) return;
      setMention((p) => ({ ...p, isLoading: true }));
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .or(`username.ilike.${query}%,full_name.ilike.${query}%`)
          .limit(5);
        setMention((p) => ({ ...p, results: data ?? [], isLoading: false }));
      } catch {
        setMention((p) => ({ ...p, isLoading: false }));
      }
    }, 180);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Select a user from the dropdown
  const selectMention = useCallback(
    (profile: Profile) => {
      const before = content.slice(0, mention.startIndex);
      const after = content.slice(mention.startIndex + 1 + mention.query.length); // skip @query
      const inserted = `@${profile.username} `;
      const newContent = before + inserted + after;
      setContent(newContent);
      close();
      // Move cursor to end of inserted mention
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

  // Keyboard navigation inside dropdown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!mention.isOpen || mention.results.length === 0) return false;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMention((p) => ({ ...p, selectedIndex: (p.selectedIndex + 1) % p.results.length }));
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMention((p) => ({
          ...p,
          selectedIndex: (p.selectedIndex - 1 + p.results.length) % p.results.length,
        }));
        return true;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = mention.results[mention.selectedIndex];
        if (selected) selectMention(selected);
        return true;
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
