import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';
import { toast } from "sonner";

interface ImageUploadProps {
  imageUrl?: string;
  onImageChange: (url: string | null) => void;
  productName?: string;
}

export function ImageUpload({ imageUrl, onImageChange, productName = 'producto' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const rawFile = event.target.files[0];
      const file = await compressImage(rawFile);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // Subir archivo a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Obtener URL pública
      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      onImageChange(data.publicUrl);
      
      toast.success("Éxito", { description: "Imagen subida correctamente" });
    } catch (error) {
      toast.error("Error", { description: "No se pudo subir la imagen" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    if (imageUrl) {
      try {
        // Extraer el path del archivo de la URL
        const urlParts = imageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `products/${fileName}`;

        // Eliminar archivo de Storage
        const { error } = await supabase.storage
          .from('product-images')
          .remove([filePath]);

        if (error) {
          console.warn('Error removing image from storage:', error);
        }
      } catch (error) {
        console.warn('Error removing image:', error);
      }
    }

    onImageChange(null);
    
    toast.success("Éxito", { description: "Imagen eliminada" });
  };

  return (
    <div className="space-y-4">
      <Label>Imagen del Producto</Label>
      
      {imageUrl ? (
        <div className="relative">
          <img
            src={imageUrl}
            alt={productName}
            className="w-full h-48 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={removeImage}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No hay imagen seleccionada</p>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          type="file"
          accept="image/*"
          onChange={uploadImage}
          disabled={uploading}
          id="image-upload"
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => document.getElementById('image-upload')?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Subiendo...' : 'Subir Imagen'}
        </Button>
        
        {imageUrl && (
          <Button
            type="button"
            variant="outline"
            onClick={removeImage}
          >
            <X className="w-4 h-4 mr-2" />
            Eliminar
          </Button>
        )}
      </div>
    </div>
  );
}