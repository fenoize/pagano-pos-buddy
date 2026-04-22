import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gift, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAllianceSessionId, saveAllianceAttribution } from '@/lib/allianceAttribution';

interface PublicAlliance {
  id: string;
  name: string;
  type: string;
  slug: string;
  description: string | null;
  welcome_runas: number;
  coupon_id: string | null;
  free_delivery_first_order: boolean;
}

export default function AllianceLanding() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [alliance, setAlliance] = useState<PublicAlliance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!slug) return;
      saveAllianceAttribution(slug);
      const sessionId = getAllianceSessionId();
      await supabase.rpc('track_marketing_alliance_view' as any, {
        _slug: slug,
        _session_id: sessionId,
        _metadata: { path: window.location.pathname, referrer: document.referrer || null },
      });
      const { data } = await supabase.rpc('get_marketing_alliance_by_slug' as any, { _slug: slug });
      setAlliance(Array.isArray(data) ? data[0] : data);
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return <div className="customer-app min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!alliance) {
    return <div className="customer-app min-h-screen bg-background flex items-center justify-center p-4"><Card><CardContent className="p-6 text-center space-y-4"><p className="font-semibold">Esta alianza no está disponible.</p><Button onClick={() => navigate('/menu')}>Ir al menú</Button></CardContent></Card></div>;
  }

  return (
    <div className="customer-app min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-2xl">
        <CardContent className="p-6 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"><Gift className="h-8 w-8 text-primary" /></div>
          <div className="space-y-2">
            <Badge variant="secondary">Beneficio exclusivo</Badge>
            <h1 className="text-3xl font-bold">{alliance.name}</h1>
            <p className="text-muted-foreground">{alliance.description || 'Crea tu cuenta y recibe beneficios para tu primera compra.'}</p>
          </div>
          <div className="rounded-lg bg-muted/60 p-4 space-y-2 text-sm text-left">
            {alliance.welcome_runas > 0 && <p className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {alliance.welcome_runas} runas al registrarte</p>}
            {alliance.coupon_id && <p className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Cupón para tu primera compra</p>}
            {alliance.free_delivery_first_order && <p className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Delivery gratis en tu primera compra</p>}
          </div>
          <Button size="lg" className="w-full" onClick={() => navigate(`/login?mode=signup&ally=${alliance.slug}`)}>Crear cuenta</Button>
          <Button variant="ghost" className="w-full" onClick={() => navigate(`/login?ally=${alliance.slug}`)}>Ya tengo cuenta</Button>
        </CardContent>
      </Card>
    </div>
  );
}
