import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/lib/imageCompression';

interface VariantImageUploadProps {
  imageUrl?: string | null;
  onImageChange: (url: string | null) => void;
  variantName?: string;
  compact?: boolean;
}

export function VariantImageUpload({ imageUrl, onImageChange, variantName = 'variante', compact = false }: VariantImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const inputId = `variant-img-${Math.random().toString(36).substring(2, 8)}`;

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const rawFile = event.target.files[0];
      const file = await compressImage(rawFile);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `variants/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      onImageChange(data.publicUrl);
      toast({ title: "Éxito", description: "Imagen de variante subida" });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo subir la imagen", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    onImageChange(null);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {imageUrl ? (
          <div className="relative w-12 h-12 rounded-md overflow-hidden border flex-shrink-0">
            <img src={imageUrl} alt={variantName} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="w-12 h-12 rounded-md border-2 border-dashed border-muted-foreground/25 flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <Input type="file" accept="image/*" onChange={uploadImage} disabled={uploading} id={inputId} className="hidden" />
        <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={() => document.getElementById(inputId)?.click()}>
          <Upload className="w-3 h-3 mr-1" />
          {uploading ? '...' : 'Img'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {imageUrl ? (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border">
          <img src={imageUrl} alt={variantName} className="w-full h-full object-cover" />
          <Button type="button" variant="destructive" size="sm" className="absolute top-1 right-1" onClick={removeImage}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
          <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Sin imagen</p>
        </div>
      )}
      <Input type="file" accept="image/*" onChange={uploadImage} disabled={uploading} id={inputId} className="hidden" />
      <Button type="button" variant="outline" size="sm" className="w-full" disabled={uploading} onClick={() => document.getElementById(inputId)?.click()}>
        <Upload className="w-3 h-3 mr-1" />
        {uploading ? 'Subiendo...' : 'Subir Imagen'}
      </Button>
    </div>
  );
}
