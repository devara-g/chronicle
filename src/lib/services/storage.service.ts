import { supabase } from '../supabase/client';

/**
 * Compresses an image file and converts it to WebP format using HTML5 Canvas
 */
export async function compressImageToWebP(
  file: File,
  maxWidth: number = 1600,
  maxHeight: number = 1600,
  quality: number = 0.82
): Promise<File> {
  // If not in browser or not an image (e.g. video / audio / gif), return original
  if (typeof window === 'undefined' || !file.type.startsWith('image/') || file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      // Scale dimensions down if larger than bounds
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = Math.round((img.height * width) / img.width);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return resolve(file);
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return resolve(file);
          }

          const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || 'image';
          const webpFile = new File([blob], `${originalName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          });

          resolve(webpFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

export const StorageService = {
  /**
   * Uploads an image/media file to the 'media' bucket, compressed to WebP, and returns its public URL
   */
  async uploadMedia(file: File, userId: string, bucket: string = 'media'): Promise<string> {
    try {
      // Auto-compress image to WebP format
      const processedFile = await compressImageToWebP(file);
      const fileExt = processedFile.name.split('.').pop() || 'webp';
      const fileName = `${userId}/${Math.random().toString(36).substring(2, 12)}_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, processedFile, {
          contentType: processedFile.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  },

  /**
   * Uploads an audio blob (voice note) to the 'media' bucket and returns its public URL
   */
  async uploadAudioBlob(blob: Blob, userId: string, bucket: string = 'media'): Promise<string> {
    try {
      const mime = blob.type || 'audio/webm';
      const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : mime.includes('wav') ? 'wav' : 'webm';
      const fileName = `${userId}/audio_${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, {
          contentType: mime,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading audio blob:', error);
      throw error;
    }
  },

  /**
   * Deletes a file from the 'media' bucket given its public URL
   */
  async deleteMedia(publicUrl: string, bucket: string = 'media'): Promise<void> {
    try {
      const urlParts = publicUrl.split(`/object/public/${bucket}/`);
      if (urlParts.length !== 2) {
        console.warn('Invalid public URL format for deletion:', publicUrl);
        return;
      }
      
      const filePath = urlParts[1];
      
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting media:', error);
      throw error;
    }
  }
};
