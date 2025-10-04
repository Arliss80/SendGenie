import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Campaign = {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  sender_email: string;
  status: 'draft' | 'sending' | 'completed' | 'failed';
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  include_signature: boolean;
  include_logo: boolean;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  campaign_id: string;
  user_id: string;
  first_name: string;
  last_name?: string;
  email: string;
  company?: string;
  created_at: string;
};

export type EmailLog = {
  id: string;
  campaign_id: string;
  contact_id: string;
  user_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  error_message?: string;
  sent_at?: string;
  tracking_pixel_id?: string;
  opened_count?: number;
  first_opened_at?: string;
  last_opened_at?: string;
  created_at: string;
};

export type EmailOpen = {
  id: string;
  email_log_id: string;
  campaign_id: string;
  contact_id: string;
  user_id: string;
  opened_at: string;
  created_at: string;
};

export type UserSettings = {
  id: string;
  user_id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  created_at: string;
  updated_at: string;
};

export type FollowUpCampaign = {
  id: string;
  campaign_id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  engagement_threshold: number;
  total_selected: number;
  total_excluded: number;
  sent_count: number;
  failed_count: number;
  include_signature: boolean;
  include_logo: boolean;
  status: 'draft' | 'sending' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
};

export type ContactExclusion = {
  id: string;
  follow_up_campaign_id: string;
  contact_id: string;
  user_id: string;
  reason: string;
  created_at: string;
};

export type UserProfile = {
  id: string;
  user_id: string;
  full_name: string;
  job_title: string;
  company_name: string;
  bio: string;
  phone: string;
  website: string;
  what_you_do: string;
  product_description: string;
  campaign_goals: string;
  target_audience: string;
  value_proposition: string;
  signature_enabled: boolean;
  signature_name: string;
  signature_title: string;
  signature_phone: string;
  signature_email: string;
  signature_website: string;
  signature_linkedin: string;
  signature_custom_text: string;
  company_logo_url: string;
  logo_enabled: boolean;
  logo_size: 'small' | 'medium' | 'large';
  logo_padding: 'none' | 'small' | 'medium' | 'large';
  created_at: string;
  updated_at: string;
};
