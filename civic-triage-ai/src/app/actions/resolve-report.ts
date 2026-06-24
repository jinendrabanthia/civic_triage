'use server';

import { supabase } from '@/lib/supabase';
import { translateTo } from '@/lib/translate';

export async function resolveReport(formData: FormData) {
  const reportId = formData.get('report_id') as string;
  const fieldNotes = formData.get('field_notes') as string;
  const resolvedImage = formData.get('resolved_image') as File;

  if (!reportId || !resolvedImage || resolvedImage.size === 0) {
    return { success: false, error: 'Report ID and resolution photo are required' };
  }

  try {
    // Upload the "after" image
    const fileName = `resolved-${Date.now()}-${resolvedImage.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    const { error: uploadError } = await supabase.storage
      .from('report-images')
      .upload(fileName, resolvedImage, { contentType: resolvedImage.type });

    if (uploadError) {
      console.error("Resolution image upload error:", uploadError);
      return { success: false, error: 'Failed to upload resolution photo' };
    }

    const resolvedImageUrl = supabase.storage.from('report-images').getPublicUrl(fileName).data.publicUrl;

    // Update the report
    const { error: updateError } = await supabase
      .from('reports')
      .update({
        status: 'resolved',
        resolved_image_url: resolvedImageUrl,
        resolved_at: new Date().toISOString(),
        field_notes: fieldNotes || null,
      })
      .eq('id', reportId);

    if (updateError) {
      console.error("Report update error:", updateError);
      return { success: false, error: 'Failed to update report' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Resolve Report Error:", error);
    return { success: false, error: 'Failed to resolve report' };
  }
}

export async function replyToReport(reportId: string, replyText: string) {
  if (!reportId || !replyText) {
    return { success: false, error: 'Report ID and reply text are required' };
  }

  try {
    // Get the report's original language
    const { data: report } = await supabase
      .from('reports')
      .select('original_language, citizen_id')
      .eq('id', reportId)
      .single();

    if (!report) {
      return { success: false, error: 'Report not found' };
    }

    // Translate the reply to the citizen's language if not English
    let translatedReply: string | null = null;
    if (report.original_language && report.original_language !== 'en') {
      translatedReply = await translateTo(replyText, report.original_language);
    }

    const { error: updateError } = await supabase
      .from('reports')
      .update({
        official_reply: replyText,
        official_reply_translated: translatedReply,
      })
      .eq('id', reportId);

    if (updateError) {
      return { success: false, error: 'Failed to save reply' };
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Reply error:", error);
    return { success: false, error: 'Failed to send reply' };
  }
}
