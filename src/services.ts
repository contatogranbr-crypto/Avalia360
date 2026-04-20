import { supabase } from './supabase';

export async function createEmployeeAccount(userData: any, accessKey: string) {
  try {
    const savedUser = localStorage.getItem('auth_fallback_user');
    let adminEmail = null;
    let adminAccessKey = null;

    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      adminEmail = parsed.email;
      adminAccessKey = parsed.access_key || parsed.accessKey;
    }

    if (!savedUser) throw new Error('Not authenticated');

    // 1. Create via backend (to handle admin verification and RLS bypass)
    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userData,
        accessKey,
        adminEmail,
        adminAccessKey
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create user');
    }

    return data.uid;
  } catch (error: any) {
    console.error("Error creating account:", error);
    throw error;
  }
}

export async function updateEmployeeProfile(uid: string, data: any) {
  try {
    const savedUser = localStorage.getItem('auth_fallback_user');
    if (!savedUser) return;
    const parsed = JSON.parse(savedUser);

    // Map accessKey to access_key for Supabase
    const updateData = { ...data };
    if (updateData.accessKey) {
      updateData.access_key = updateData.accessKey;
      delete updateData.accessKey;
    }

    const response = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,
        updateData,
        adminEmail: parsed.email,
        adminAccessKey: parsed.access_key || parsed.accessKey
      })
    });

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
  } catch (error: any) {
    console.error("Error updating profile:", error);
    throw error;
  }
}

// Simplified login using Access Key via Server API
export async function loginWithAccessKey(email: string, accessKey: string) {
  try {
    // 1. Call the backend to verify the key
    const response = await fetch('/api/auth/login-with-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, accessKey }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Falha na autenticação.');
    }
    
    // 2. Store user data in localStorage for AuthContext to pick up
    localStorage.setItem('auth_fallback_user', JSON.stringify(data.userData));
    
    return data.userData;
  } catch (error: any) {
    console.error("Login error:", error);
    throw error;
  }
}

export async function deleteEmployeeAccount(uid: string) {
  try {
    const savedUser = localStorage.getItem('auth_fallback_user');
    let adminEmail = null;
    let adminAccessKey = null;

    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      adminEmail = parsed.email;
      adminAccessKey = parsed.access_key || parsed.accessKey;
    }

    if (!savedUser) throw new Error('Not authenticated');

    // 1. Delete via backend (to handle admin verification and RLS bypass)
    const response = await fetch('/api/admin/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid,
        adminEmail,
        adminAccessKey
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete user');
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting account:", error);
    throw error;
  }
}

export async function uploadOmbudsmanFile(file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = fileName;

  const { data, error } = await supabase.storage
    .from('ombudsman')
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('ombudsman')
    .getPublicUrl(filePath);

  return publicUrl;
}

export async function submitComplaint(data: {
  type: string;
  subject: string;
  description: string;
  is_anonymous: boolean;
  user_id?: string;
  contact_email?: string;
  attachments?: string[];
}) {
  const response = await fetch('/api/public/complaints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Erro ao enviar relato');
  return result;
}

export async function trackComplaint(protocol: string) {
  const response = await fetch(`/api/public/complaints/${protocol}`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Protocolo não encontrado');
  return result.complaint;
}

export async function getComplaints() {
  const savedUser = localStorage.getItem('auth_fallback_user');
  if (!savedUser) throw new Error('Unauthorized');
  const parsed = JSON.parse(savedUser);

  const response = await fetch('/api/admin/get-complaints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      adminEmail: parsed.email,
      adminAccessKey: parsed.access_key || parsed.accessKey
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Erro ao buscar relatos');
  return result.complaints;
}

export async function submitComplaintReply(protocol: string, content: string, attachments?: string[]) {
  const response = await fetch('/api/public/complaints-reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ protocol, content, attachments }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Erro ao enviar resposta');
  return result.complaint;
}

export async function respondToComplaint(complaintId: string, response: string, status: string, attachments?: string[]) {
  const savedUser = localStorage.getItem('auth_fallback_user');
  if (!savedUser) throw new Error('Unauthorized');
  const parsed = JSON.parse(savedUser);

  const res = await fetch('/api/admin/respond-complaint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      complaintId,
      response,
      status,
      attachments,
      adminEmail: parsed.email,
      adminAccessKey: parsed.access_key || parsed.accessKey
    }),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Erro ao responder relato');
  return result.complaint;
}
