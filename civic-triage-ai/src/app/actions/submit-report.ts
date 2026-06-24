'use server';

import { supabase } from '@/lib/supabase';
import { analyzeReportImage } from '@/lib/gemini';
import { detectAndTranslate } from '@/lib/translate';

// Reverse geocode lat/lng to extract PIN code using OpenStreetMap Nominatim
async function reverseGeocodeForPinCode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'User-Agent': 'CivicTriageAI/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.address?.postcode || null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}

async function findAssignedOfficial(pinCode: string, citizenCity?: string): Promise<string | null> {
  const { data: assignment } = await supabase
    .from('area_assignments')
    .select('official_id')
    .eq('pin_code', pinCode)
    .single();
  if (assignment) return assignment.official_id;

  if (citizenCity) {
    const { data: cityAdmin } = await supabase
      .from('officials')
      .select('id')
      .eq('city', citizenCity)
      .eq('verification_status', 'approved')
      .limit(1)
      .single();
    if (cityAdmin) return cityAdmin.id;
  }

  const { data: anyAdmin } = await supabase
    .from('officials')
    .select('id')
    .eq('verification_status', 'approved')
    .limit(1)
    .single();
  return anyAdmin?.id || null;
}

export async function submitReport(formData: FormData) {
  try {
    const file = formData.get('image') as File;
    const latStr = formData.get('lat') as string;
    const lngStr = formData.get('lng') as string;
    const description = formData.get('description') as string;
    const citizenId = formData.get('citizen_id') as string;

    if (!file || !latStr || !lngStr || !citizenId) {
      throw new Error("Missing required fields");
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    // 1. Convert image to base64 for Gemini
    const arrayBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    
    // 2. Upload image to Supabase Storage
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    const { error: uploadError } = await supabase.storage
      .from('report-images')
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) {
      console.error("Supabase storage error:", uploadError);
      throw new Error("Failed to upload image");
    }

    const imageUrl = supabase.storage.from('report-images').getPublicUrl(fileName).data.publicUrl;

    // 3. Analyze image with Gemini (includes emergency detection)
    const aiResult = await analyzeReportImage(base64Image, file.type);

    // 4. Auto-translate description if not English
    let originalLanguage = 'en';
    let descriptionTranslated = description;
    if (description && description.trim().length > 0) {
      const translationResult = await detectAndTranslate(description);
      originalLanguage = translationResult.original_language;
      descriptionTranslated = translationResult.translated_text;
    }

    // 5. Reverse geocode for PIN code
    const pinCode = await reverseGeocodeForPinCode(lat, lng);

    // 6. Get citizen's city for fallback routing
    let citizenCity: string | undefined;
    const { data: citizen } = await supabase
      .from('citizens')
      .select('city')
      .eq('id', citizenId)
      .single();
    citizenCity = citizen?.city;

    // 7. Find assigned official
    let assignedTo: string | null = null;
    if (pinCode) {
      assignedTo = await findAssignedOfficial(pinCode, citizenCity);
    } else if (citizenCity) {
      const { data: cityAdmin } = await supabase
        .from('officials')
        .select('id')
        .eq('city', citizenCity)
        .eq('verification_status', 'approved')
        .limit(1)
        .single();
      assignedTo = cityAdmin?.id || null;
    }
    
    // 8. Build report data
    const reportData: Record<string, unknown> = {
      citizen_id: citizenId,
      location: `POINT(${lng} ${lat})`,
      lat,
      lng,
      image_url: imageUrl,
      description,
      original_language: originalLanguage,
      description_translated: originalLanguage !== 'en' ? descriptionTranslated : null,
      ai_category: aiResult.issue_category,
      ai_severity: aiResult.severity_score,
      ai_confidence: aiResult.confidence_score,
      ai_justification: aiResult.justification_for_severity,
      ai_suggested_department: aiResult.suggested_city_department,
      ai_estimated_complexity: aiResult.estimated_fix_complexity,
      status: aiResult.is_prank_or_unrelated ? 'rejected' : 'open',
      is_emergency: aiResult.is_emergency_hazard || false,
      emergency_type: aiResult.emergency_type || 'none',
      emergency_notified_at: aiResult.is_emergency_hazard ? new Date().toISOString() : null,
      pin_code: pinCode,
      assigned_to: assignedTo,
    };

    // Emergency escalation: force severity to 100
    if (aiResult.is_emergency_hazard) {
      reportData.ai_severity = 100;
    }

    const { data: insertData, error: dbError } = await supabase
      .from('reports')
      .insert([reportData])
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      throw new Error("Failed to save report to database");
    }

    // 9. Deduplication logic
    if (insertData && !aiResult.is_prank_or_unrelated) {
      const { data: nearbyReports, error: rpcError } = await supabase.rpc('get_reports_within_radius', {
        query_lat: lat,
        query_lng: lng,
        radius_meters: 50
      });

      if (!rpcError && nearbyReports && nearbyReports.length > 0) {
        const others = nearbyReports.filter((r: { id: string, ai_category: string }) => r.id !== insertData.id);
        if (others.length > 0) {
          const closest = others[0];
          if (closest.ai_category === aiResult.issue_category) {
            await supabase
              .from('reports')
              .update({ status: 'duplicate', merged_into_id: closest.id })
              .eq('id', insertData.id);
            return { success: true, duplicateOf: closest.id, message: `Merged with Incident #${closest.id.split('-')[0]}` };
          }
        }
      }
    }

    // 10. Build response message
    let message = "Report submitted successfully.";
    if (aiResult.is_emergency_hazard) {
      message = `🚨 EMERGENCY ALERT: ${aiResult.emergency_type?.replace('_', ' ').toUpperCase()} detected! Emergency services have been notified.`;
    } else if (assignedTo) {
      message = `Report submitted and auto-assigned to area official${pinCode ? ` (PIN: ${pinCode})` : ''}.`;
    }

    return { success: true, data: insertData, message, isEmergency: aiResult.is_emergency_hazard || false };

  } catch (error: unknown) {
    console.error("Submit Report Error:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
