import { useState } from 'react';
import { useBranches } from '@/hooks/useBranches';
import { Branch } from '@/contexts/BranchContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Building2, MapPin, Phone, Star } from 'lucide-react';
import { BranchFormDialog } from '@/components/branches/BranchFormDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function BranchesManagement() {
  const { branches, isLoading, remove } = useBranches();
  const [editing, setEditing] = useState<Branch | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Branch | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Locales
          </h1>
          <p className="text-sm text-muted-foreground">
            Administra tus locales: dirección, horario y caja registradora.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo local
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {branches.map((b) => (
            <Card key={b.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {b.name}
                    {b.is_default && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="h-3 w-3" /> Principal
                      </Badge>
                    )}
                    {!b.is_active && <Badge variant="outline">Inactivo</Badge>}
                  </CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setEditing(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-destructive"
                    onClick={() => setDeleting(b)}
                    disabled={b.is_default}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-sm">
                {b.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {b.address}
                  </div>
                )}
                {b.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {b.phone}
                  </div>
                )}
                <div className="text-xs text-muted-foreground pt-2">
                  {b.cash_account_id
                    ? '✓ Caja registradora configurada'
                    : '⚠ Falta asignar caja registradora'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Pedidos online: {b.accepts_online_orders ? 'Sí' : 'No'}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BranchFormDialog
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false);
            setEditing(null);
          }
        }}
        branch={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar local?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Los registros históricos asociados se conservarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleting) {
                  await remove(deleting.id);
                  setDeleting(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
