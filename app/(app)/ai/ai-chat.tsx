'use client';

import { useState } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AiChat({ aiReady }: { aiReady: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;

    setInput('');
    setError(null);
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'user', content: message }]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversation_id: conversationId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Gagal contacting AI');
      setConversationId(payload.conversation_id);
      setMessages((prev) => [...prev, { role: 'assistant', content: payload.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghubungi AI');
    } finally {
      setLoading(false);
    }
  }

  if (!aiReady) {
    return (
      <div className="card">
        <h2 className="font-medium">AI belum dikonfigurasi</h2>
        <p className="mt-1 text-sm text-muted">
          Isi <code className="rounded bg-border/60 px-1 py-0.5">AI_PROVIDER</code> dan{' '}
          <code className="rounded bg-border/60 px-1 py-0.5">AI_API_KEY</code> di <code>.env.local</code>, lalu restart
          server. Provider yang didukung: gemini, openai (juga untuk endpoint OpenAI-compatible seperti DashScope), dan
          anthropic.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card min-h-[320px] space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">
            Tanya apa saja tentang uangmu, misalnya: “Kalau punya surplus 15 juta, lebih baik modal campaign atau dana
            darurat dulu?”
          </p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                message.role === 'user' ? 'bg-accent/10' : 'bg-border/40'
              }`}
            >
              {message.content}
            </div>
          ))
        )}
        {loading ? <p className="text-sm text-muted">AI sedang berpikir…</p> : null}
        {error ? <p className="text-sm text-negative">{error}</p> : null}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input
          className="input-base"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Tanya soal keuanganmu…"
          aria-label="Pesan untuk AI advisor"
        />
        <button type="submit" className="btn-primary" disabled={loading || !input.trim()}>
          Kirim
        </button>
      </form>
    </div>
  );
}
