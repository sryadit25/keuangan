import { isAiConfigured } from '@/lib/ai/provider';
import { AiChat } from './ai-chat';

export default async function AiPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">AI Advisor</h1>
        <p className="text-sm text-muted">
          Advisor membaca data keuanganmu (read-only) lalu menjawab: ke mana uang pergi, cukup tidak menabungnya, dan
          bagaimana melipatgandakan lewat bisnis &amp; pekerjaan.
        </p>
      </header>

      <AiChat aiReady={isAiConfigured()} />
    </div>
  );
}
