import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getStaffSupabaseClient } from '@/lib/supabaseClient';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Msg { role: 'user' | 'assistant'; content: string; }

export function LIAWidget() {
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: '¡Hola! Soy LIA, tu asistente de datos. Pregúntame sobre ventas, clientes, configuraciones o métricas del sistema.' },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'Administrador' || user?.roles?.includes('Administrador');
  const [canUseLia, setCanUseLia] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id || !isAdmin) { setCanUseLia(false); return; }
      try {
        const client = getStaffSupabaseClient();
        const { data } = await client.from('users').select('can_use_lia').eq('id', user.id).maybeSingle();
        if (!cancelled) setCanUseLia(Boolean((data as any)?.can_use_lia));
      } catch {
        if (!cancelled) setCanUseLia(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, isAdmin]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  if (!isAdmin || !canUseLia) return null;

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    const newMsgs: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const client = getStaffSupabaseClient();
      const { data, error } = await client.functions.invoke('lia-query', {
        body: {
          question: q,
          history: newMsgs.slice(-10).map(m => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      const answer = (data as any)?.answer || (data as any)?.error || 'Sin respuesta.';
      setMessages(m => [...m, { role: 'assistant', content: answer }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: `Error: ${e?.message || 'No se pudo procesar la consulta.'}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #E11D2C, #b81825)' }}
          aria-label="Abrir LIA"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={cn(
            "fixed z-50 bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-2xl flex flex-col",
            "bottom-0 right-0 left-0 h-[80vh] rounded-t-2xl",
            "md:bottom-6 md:right-6 md:left-auto md:h-[600px] md:w-[400px] md:rounded-2xl"
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ background: '#E11D2C' }}>
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-sm">LIA — Asistente Paganos</div>
                <div className="text-xs text-zinc-400">Pregunta sobre tus datos</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white p-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                      m.role === 'user' ? 'text-white' : 'bg-zinc-800 text-zinc-100'
                    )}
                    style={m.role === 'user' ? { background: '#E11D2C' } : undefined}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 rounded-2xl px-3 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Consultando...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-zinc-800 flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="¿Cuánto vendimos hoy?"
              disabled={loading}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-1"
              style={{ fontSize: '16px' }}
            />
            <Button
              onClick={send}
              disabled={loading || !input.trim()}
              size="icon"
              className="shrink-0 h-10 w-10"
              style={{ background: '#E11D2C' }}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
