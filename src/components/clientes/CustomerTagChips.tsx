import { useState, useMemo } from 'react';
import { Plus, X, Tag as TagIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCustomerTags } from '@/hooks/useCustomerTags';
import { useCustomerTagAssignments } from '@/hooks/useCustomerTagAssignments';

const sourceLabels: Record<string, string> = {
  manual: 'Asignada manualmente',
  alliance: 'Asignada por alianza',
  campaign: 'Asignada por campaña',
  import: 'Importada',
  system: 'Asignada por el sistema',
};

interface Props {
  customerId: string;
  size?: 'sm' | 'md';
  editable?: boolean;
}

export default function CustomerTagChips({ customerId, size = 'md', editable = true }: Props) {
  const { tags, createTag } = useCustomerTags();
  const { assignments, assignTag, removeTag } = useCustomerTagAssignments(customerId);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const assignedIds = useMemo(() => new Set(assignments.map(a => a.tag_id)), [assignments]);

  const availableTags = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tags
      .filter(t => !assignedIds.has(t.id))
      .filter(t => !term || t.name.toLowerCase().includes(term));
  }, [tags, assignedIds, search]);

  const exactMatch = useMemo(
    () => tags.some(t => t.name.toLowerCase() === search.trim().toLowerCase()),
    [tags, search]
  );

  const handleCreate = async () => {
    const name = search.trim();
    if (!name) return;
    setCreating(true);
    try {
      const newTag = await createTag({ name, color: randomColor(), description: null });
      await assignTag((newTag as any).id);
      setSearch('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1.5">
        {assignments.map(a => (
          <Tooltip key={a.id}>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={`${size === 'sm' ? 'text-xs py-0 px-2 h-5' : 'text-xs py-0.5 px-2'} gap-1 border-2 font-medium`}
                style={{
                  backgroundColor: `${a.tag.color}22`,
                  borderColor: a.tag.color,
                  color: a.tag.color,
                }}
              >
                {a.tag.name}
                {editable && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeTag(a.tag_id); }}
                    className="hover:bg-black/10 rounded-sm ml-0.5"
                    aria-label={`Quitar ${a.tag.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{sourceLabels[a.source] || a.source}</p>
              {a.tag.description && <p className="text-xs text-muted-foreground">{a.tag.description}</p>}
            </TooltipContent>
          </Tooltip>
        ))}

        {editable && (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={size === 'sm' ? 'h-5 text-xs px-1.5' : 'h-7 text-xs'}>
                <Plus className="h-3 w-3 mr-1" />
                Etiqueta
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <div className="space-y-2">
                <Label className="text-xs">Buscar o crear etiqueta</Label>
                <Input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre de etiqueta..."
                  className="h-8 text-sm"
                />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {availableTags.length === 0 && !search && (
                    <p className="text-xs text-muted-foreground py-2 text-center">No hay etiquetas disponibles</p>
                  )}
                  {availableTags.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={async () => { await assignTag(t.id); setSearch(''); }}
                      className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm"
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="flex-1">{t.name}</span>
                      {t.customer_count !== undefined && (
                        <span className="text-xs text-muted-foreground">{t.customer_count}</span>
                      )}
                    </button>
                  ))}
                  {search.trim() && !exactMatch && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-sm h-8"
                      disabled={creating}
                      onClick={handleCreate}
                    >
                      <TagIcon className="h-3 w-3 mr-2" />
                      Crear "{search.trim()}"
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </TooltipProvider>
  );
}

const PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'];
const randomColor = () => PALETTE[Math.floor(Math.random() * PALETTE.length)];
