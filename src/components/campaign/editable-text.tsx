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
      <div className="rounded-lg border-2 border-primary/20 bg-white p-3 shadow-sm">
        <span className="text-xs font-medium text-gray-500 mb-1.5 block">Edit text</span>
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
            className="w-full min-h-[140px] p-3 text-sm leading-relaxed rounded-md border border-gray-200 bg-white text-gray-900 resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
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
            className="w-full p-3 text-sm rounded-md border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
          />
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
          </div>
          {maxLength && (
            <span className="text-sm font-medium text-gray-500">
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
