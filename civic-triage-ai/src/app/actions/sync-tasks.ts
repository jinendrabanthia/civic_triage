'use server';

import { supabase } from '@/lib/supabase';

export async function syncOfflineTasks(updates: any[]) {
  try {
    for (const update of updates) {
      let resolvedImageUrl = null;

      // If there's an image, we need to upload it
      if (update.imageBase64 && update.imageType) {
        // Convert base64 back to buffer
        const buffer = Buffer.from(update.imageBase64, 'base64');
        const fileName = `resolved-offline-${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('report-images')
          .upload(fileName, buffer, { contentType: update.imageType });

        if (!uploadError) {
          resolvedImageUrl = supabase.storage.from('report-images').getPublicUrl(fileName).data.publicUrl;
        }
      }

      const updateData: any = {
        status: update.status,
        field_notes: update.fieldNotes,
      };

      if (resolvedImageUrl) {
        updateData.resolved_image_url = resolvedImageUrl;
        updateData.resolved_at = new Date(update.queuedAt).toISOString();
      } else if (update.status === 'resolved') {
        updateData.resolved_at = new Date(update.queuedAt).toISOString();
      }

      await supabase
        .from('reports')
        .update(updateData)
        .eq('id', update.reportId);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Sync error:", error);
    return { success: false, error: 'Failed to sync offline tasks' };
  }
}
