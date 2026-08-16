import { supabase } from '../supabase/client';

export const StorageService = {
  /**
   * Uploads a file to the 'media' bucket and returns its public URL
   */
  async uploadMedia(file: File, userId: string, bucket: string = 'media'): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
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
