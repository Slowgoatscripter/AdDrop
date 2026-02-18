'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface EmailModalProps {
  campaignId: string;
}

export function EmailModal({ campaignId }: EmailModalProps) {
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [recentRecipients, setRecentRecipients] = useState<string[]>([]);

  useEffect(() => {
    // Load user email
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });

    // Load recent recipients from localStorage
    try {
      const stored = localStorage.getItem('recentEmailRecipients');
      if (stored) setRecentRecipients(JSON.parse(stored));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  function saveRecipients(newEmails: string[]) {
    const all = [...new Set([...newEmails, ...recentRecipients])].slice(0, 5);
    setRecentRecipients(all);
    localStorage.setItem('recentEmailRecipients', JSON.stringify(all));
  }

  async function handleSend(toOverride?: string[]) {
    const toList =
      toOverride ||
      emails
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean);

    if (toList.length === 0) {
      toast.error('Enter at least one email address');
      return;
    }
    if (toList.length > 10) {
      toast.error('Maximum 10 recipients per send');
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/campaign/${campaignId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toList, message: message || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to send email');
        return;
      }

      const data = await res.json();
      saveRecipients(toList);

      if (data.failed > 0) {
        toast.warning(
          `Sent ${data.sent} of ${data.sent + data.failed} emails`
        );
      } else {
        toast.success(
          `Email sent to ${data.sent} recipient${data.sent > 1 ? 's' : ''}!`
        );
      }

      setEmails('');
      setMessage('');
      setOpen(false);
    } catch {
      toast.error('Failed to send email');
    } finally {
      setSending(false);
    }
  }

  function addRecipient(email: string) {
    const current = emails
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    if (!current.includes(email)) {
      setEmails(current.length > 0 ? `${emails}, ${email}` : email);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Email</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email Campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {userEmail && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handleSend([userEmail])}
              disabled={sending}
            >
              Send to myself ({userEmail})
            </Button>
          )}

          <div>
            <label className="text-sm font-medium">Recipients</label>
            <input
              type="text"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="email@example.com, another@example.com"
              className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Separate multiple emails with commas (max 10)
            </p>
          </div>

          {recentRecipients.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground">Recent:</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {recentRecipients.map((email) => (
                  <button
                    key={email}
                    onClick={() => addRecipient(email)}
                    className="text-xs px-2 py-1 bg-muted rounded-full hover:bg-muted/80 transition-colors"
                  >
                    {email}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal note..."
              rows={3}
              className="w-full mt-1 px-3 py-2 text-sm border rounded-md bg-background resize-none"
            />
          </div>

          <Button
            onClick={() => handleSend()}
            disabled={sending || !emails.trim()}
            className="w-full"
          >
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
