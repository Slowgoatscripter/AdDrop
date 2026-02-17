'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  onSave: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  className?: string;
}

export function EditableText({
  value,
  onChange,
  onSave,
  placeholder,
  multiline = true,
  maxLength,
  className,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  if (editing) {
    return (
      <div className={className}>
        {multiline ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              onChange(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full min-h-[100px] p-2 text-sm rounded border border-border bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary"
          />
        ) : (
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              onChange(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full p-2 text-sm rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
          </div>
          {maxLength && (
            <span className="text-xs text-muted-foreground">
              {draft.length} / {maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative cursor-pointer ${className || ''}`}
      onClick={() => setEditing(true)}
    >
      <span>{value || placeholder}</span>
      <Pencil
        data-testid="edit-pencil"
        className="inline-block ml-1.5 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground"
      />
    </div>
  );
}
