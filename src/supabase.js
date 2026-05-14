import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://upxykbidubtrekewdsic.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVweHlrYmlkdWJ0cmVrZXdkc2ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzkyOTUsImV4cCI6MjA5NDAxNTI5NX0.tB20-CnCHCm4Fxopvq595tWzFPnL2S303SLq6V3ur5U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── CLIENTS ─────────────────────────────────────────────────────
export const getClients     = ()       => supabase.from('clients').select('*').order('created_at');
export const addClient      = (data)   => supabase.from('clients').insert(data).select().single();
export const updateClient   = (id, d)  => supabase.from('clients').update(d).eq('id', id);
export const deleteClient   = (id)     => supabase.from('clients').delete().eq('id', id);

// ─── PROJECTS ────────────────────────────────────────────────────
export const getProjects    = ()       => supabase.from('projects').select('*').order('created_at');
export const addProject     = (data)   => supabase.from('projects').insert(data).select().single();
export const updateProject  = (id, d)  => supabase.from('projects').update(d).eq('id', id);
export const deleteProject  = (id)     => supabase.from('projects').delete().eq('id', id);

// ─── BRIEFS ──────────────────────────────────────────────────────
export const getBriefs      = ()       => supabase.from('briefs').select('*').order('submitted_at', { ascending: false });
export const addBrief       = (data)   => supabase.from('briefs').insert(data).select().single();
export const updateBrief    = (id, d)  => supabase.from('briefs').update(d).eq('id', id);
export const deleteBrief    = (id)     => supabase.from('briefs').delete().eq('id', id);

// ─── NEXT MONTH ───────────────────────────────────────────────────
export const getNextMonth   = ()       => supabase.from('next_month').select('*').order('queued_on', { ascending: false });
export const addNextMonth   = (data)   => supabase.from('next_month').insert(data).select().single();
export const deleteNextMonth= (id)     => supabase.from('next_month').delete().eq('id', id);

// ─── COMMENTS ────────────────────────────────────────────────────
export const getComments    = (pid)    => supabase.from('comments').select('*').eq('project_id', pid).order('created_at');
export const addComment     = (data)   => supabase.from('comments').insert(data).select().single();

// ─── ASSETS ──────────────────────────────────────────────────────
export const getAssets      = (pid)    => supabase.from('assets').select('*').eq('project_id', pid).order('uploaded_at', { ascending: false });
export const addAsset       = (data)   => supabase.from('assets').insert(data).select().single();
export const deleteAsset    = (id)     => supabase.from('assets').delete().eq('id', id);

// ─── BRAND LIBRARY ───────────────────────────────────────────────
export const getBrandFiles  = (cid)    => supabase.from('brand_library').select('*').eq('client_id', cid).order('uploaded_at', { ascending: false });
export const addBrandFile   = (data)   => supabase.from('brand_library').insert(data).select().single();
export const deleteBrandFile= (id)     => supabase.from('brand_library').delete().eq('id', id);

// ─── CONTENT ─────────────────────────────────────────────────────
export const getContent     = ()       => supabase.from('content').select('*');
export const updateContent  = (key, value) => supabase.from('content').update({ value, updated_at: new Date().toISOString() }).eq('key', key);

// ─── FILE UPLOAD ─────────────────────────────────────────────────
export const uploadFile = async (bucket, path, file) => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return urlData.publicUrl;
};

export const deleteFile = async (bucket, path) => {
  await supabase.storage.from(bucket).remove([path]);
};
