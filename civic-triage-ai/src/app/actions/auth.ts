'use server';

import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

// ============================================================
// CITIZEN AUTH
// ============================================================

export async function registerCitizen(
  aadharNumber: string,
  passwordStr: string,
  state: string,
  city: string,
  preferredLanguage: string = 'en'
) {
  if (!aadharNumber || aadharNumber.trim().length !== 12 || isNaN(Number(aadharNumber))) {
    return { success: false, error: 'A valid 12-digit Aadhar number is required' };
  }
  if (!passwordStr || passwordStr.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long' };
  }
  if (!state || !city) {
    return { success: false, error: 'State and City are required' };
  }

  try {
    const { data: existingCitizen } = await supabase
      .from('citizens')
      .select('id')
      .eq('aadhar_number', aadharNumber)
      .single();

    if (existingCitizen) {
      return { success: false, error: 'Aadhar number is already registered. Please log in.' };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordStr, salt);

    const { data: newCitizen, error } = await supabase
      .from('citizens')
      .insert([{
        aadhar_number: aadharNumber,
        password_hash: passwordHash,
        is_aadhar_verified: true,
        state,
        city,
        preferred_language: preferredLanguage,
      }])
      .select()
      .single();

    if (error) throw error;

    (await cookies()).set('citizen_id', newCitizen.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Citizen Registration Error:", error);
    return { success: false, error: 'Registration failed' };
  }
}

export async function loginCitizen(aadharNumber: string, passwordStr: string) {
  if (!aadharNumber || !passwordStr) {
    return { success: false, error: 'Aadhar number and password are required' };
  }

  try {
    const { data: citizen, error } = await supabase
      .from('citizens')
      .select('id, password_hash')
      .eq('aadhar_number', aadharNumber)
      .single();

    if (error || !citizen) {
      return { success: false, error: 'Invalid Aadhar number or password' };
    }

    const isMatch = await bcrypt.compare(passwordStr, citizen.password_hash);
    if (!isMatch) {
      return { success: false, error: 'Invalid Aadhar number or password' };
    }

    (await cookies()).set('citizen_id', citizen.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Citizen Login Error:", error);
    return { success: false, error: 'Failed to authenticate' };
  }
}

// ============================================================
// OFFICIAL AUTH
// ============================================================

export async function registerOfficial(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const passwordStr = formData.get('password') as string;
  const state = formData.get('state') as string;
  const city = formData.get('city') as string;
  const idCard = formData.get('id_card') as File;

  if (!name || !email || !passwordStr || !state || !city) {
    return { success: false, error: 'All fields are required' };
  }
  if (passwordStr.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }
  if (!idCard || idCard.size === 0) {
    return { success: false, error: 'Government ID card image is required' };
  }

  try {
    // Check if email already exists
    const { data: existing } = await supabase
      .from('officials')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return { success: false, error: 'This email is already registered. Please log in.' };
    }

    // Upload ID card
    const sanitizedName = idCard.name.replace(/[^a-zA-Z0-9.]/g, '');
    const fileName = `${Date.now()}-${sanitizedName}`;
    const { error: uploadError } = await supabase.storage
      .from('official-id-cards')
      .upload(fileName, idCard, { contentType: idCard.type });

    if (uploadError) {
      console.error("ID Card upload error:", uploadError);
      return { success: false, error: 'Failed to upload ID card' };
    }

    const idCardUrl = supabase.storage.from('official-id-cards').getPublicUrl(fileName).data.publicUrl;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordStr, salt);

    // Insert official with pending status
    const { error: insertError } = await supabase
      .from('officials')
      .insert([{
        name,
        email,
        password_hash: passwordHash,
        state,
        city,
        id_card_url: idCardUrl,
        verification_status: 'pending',
      }]);

    if (insertError) {
      console.error("Official insert error:", insertError);
      throw insertError;
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Official Registration Error:", error);
    return { success: false, error: 'Registration failed' };
  }
}

export async function loginOfficial(email: string, passwordStr: string) {
  if (!email || !passwordStr) {
    return { success: false, error: 'Email and password are required' };
  }

  try {
    const { data: official, error } = await supabase
      .from('officials')
      .select('id, name, password_hash, verification_status')
      .eq('email', email)
      .single();

    if (error || !official) {
      return { success: false, error: 'Invalid email or password' };
    }

    const isMatch = await bcrypt.compare(passwordStr, official.password_hash);
    if (!isMatch) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (official.verification_status === 'pending') {
      return { success: false, error: 'Your account is pending verification. Please wait for admin approval.', status: 'pending' };
    }

    if (official.verification_status === 'rejected') {
      return { success: false, error: 'Your registration has been rejected. Please contact the administrator.', status: 'rejected' };
    }

    (await cookies()).set('official_session', official.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      path: '/'
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Official Login Error:", error);
    return { success: false, error: 'Failed to authenticate' };
  }
}

export async function logout() {
  (await cookies()).delete('citizen_id');
  (await cookies()).delete('official_session');
  return { success: true };
}
