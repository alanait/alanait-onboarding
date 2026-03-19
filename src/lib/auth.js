import { supabase } from './supabase.js';

const ALLOWED_DOMAIN = 'alanait.com';

function validateDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain !== ALLOWED_DOMAIN) {
    throw new Error(`Solo se permiten emails @${ALLOWED_DOMAIN}`);
  }
}

export async function signUp(email, password, fullName) {
  validateDomain(email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return subscription;
}

export function getUserName(session) {
  return session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || '';
}

export function getUserEmail(session) {
  return session?.user?.email || '';
}
