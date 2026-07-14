import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ExtraCatalogEntry = { name: string; price: number };

let extrasCatalogPromise: Promise<Record<string, ExtraCatalogEntry>> | null = null;

export function loadExtrasCatalog(): Promise<Record<string, ExtraCatalogEntry>> {
  if (!extrasCatalogPromise) {
    extrasCatalogPromise = (async () => {
      const { data, error } = await supabase
        .from('product_extras')
        .select('id, name, price');
      if (error || !data) return {};
      const map: Record<string, ExtraCatalogEntry> = {};
      for (const e of data) map[e.id] = { name: e.name, price: Number(e.price) || 0 };
      return map;
    })();
  }
  return extrasCatalogPromise;
}

export function useExtrasCatalog() {
  const [catalog, setCatalog] = useState<Record<string, ExtraCatalogEntry>>({});
  useEffect(() => {
    let alive = true;
    loadExtrasCatalog().then((c) => { if (alive) setCatalog(c); });
    return () => { alive = false; };
  }, []);
  return catalog;
}
