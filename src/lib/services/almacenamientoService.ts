import { randomUUID } from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/services/supabaseError';

const BUCKET = 'productos';

function extensionFromMimeType(mimeType: string): string {
  const subtype = mimeType.split('/')[1] ?? 'jpg';
  return subtype === 'jpeg' ? 'jpg' : subtype;
}

export const almacenamientoService = {
  async subirImagenProducto(buffer: Buffer, mimeType: string): Promise<string> {
    const supabase = createSupabaseServerClient();
    const path = `${randomUUID()}.${extensionFromMimeType(mimeType)}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: mimeType,
    });
    throwOnSupabaseError(error, 'No se pudo subir la imagen');

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  },
};
