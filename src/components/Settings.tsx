import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, UserSettings, UserProfile } from '../lib/supabase';
import { Save, Mail, Server, Lock, AlertCircle, CheckCircle, User, Briefcase, Building, Image, Upload, X, Phone, Globe, Linkedin, Clock } from 'lucide-react';
import { SignaturePreview } from './SignaturePreview';

interface SettingsProps {
  onBack: () => void;
}

export function Settings({ onBack }: SettingsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'email'>('profile');

  const [profile, setProfile] = useState({
    full_name: '',
    job_title: '',
    company_name: '',
    bio: '',
    phone: '',
    website: '',
    what_you_do: '',
    product_description: '',
    campaign_goals: '',
    target_audience: '',
    value_proposition: '',
    signature_enabled: false,
    signature_name: '',
    signature_title: '',
    signature_phone: '',
    signature_email: '',
    signature_website: '',
    signature_linkedin: '',
    signature_custom_text: '',
    company_logo_url: '',
    logo_enabled: false,
    logo_size: 'medium' as 'small' | 'medium' | 'large',
    logo_padding: 'medium' as 'none' | 'small' | 'medium' | 'large',
    timezone: 'UTC',
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        setProfile({
          full_name: profileData.full_name || '',
          job_title: profileData.job_title || '',
          company_name: profileData.company_name || '',
          bio: profileData.bio || '',
          phone: profileData.phone || '',
          website: profileData.website || '',
          what_you_do: profileData.what_you_do || '',
          product_description: profileData.product_description || '',
          campaign_goals: profileData.campaign_goals || '',
          target_audience: profileData.target_audience || '',
          value_proposition: profileData.value_proposition || '',
          signature_enabled: profileData.signature_enabled || false,
          signature_name: profileData.signature_name || '',
          signature_title: profileData.signature_title || '',
          signature_phone: profileData.signature_phone || '',
          signature_email: profileData.signature_email || '',
          signature_website: profileData.signature_website || '',
          signature_linkedin: profileData.signature_linkedin || '',
          signature_custom_text: profileData.signature_custom_text || '',
          company_logo_url: profileData.company_logo_url || '',
          logo_enabled: profileData.logo_enabled || false,
          logo_size: profileData.logo_size || 'medium',
          logo_padding: profileData.logo_padding || 'medium',
          timezone: profileData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }

      // Fetch email settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (settingsData) {
        setSettings({
          smtp_host: settingsData.smtp_host,
          smtp_port: settingsData.smtp_port,
          smtp_user: settingsData.smtp_user,
          smtp_pass: settingsData.smtp_pass,
          smtp_from: settingsData.smtp_from,
        });
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File size must be less than 2MB');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('File must be PNG, JPG, SVG, or WEBP');
      return;
    }

    setUploadError('');
    setUploading(true);

    try {
      if (profile.company_logo_url) {
        const urlParts = profile.company_logo_url.split('/storage/v1/object/public/company-logos/');
        if (urlParts.length > 1) {
          const oldPath = urlParts[1].split('?')[0];
          await supabase.storage.from('company-logos').remove([oldPath]);
        }
      }

      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${user?.id}/logo-${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      const logoUrlWithCache = `${data.publicUrl}?t=${timestamp}`;

      setProfile({ ...profile, company_logo_url: logoUrlWithCache });

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ company_logo_url: logoUrlWithCache })
        .eq('user_id', user?.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      setUploadError(error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!profile.company_logo_url) return;

    setUploading(true);
    try {
      const urlParts = profile.company_logo_url.split('/storage/v1/object/public/company-logos/');
      if (urlParts.length > 1) {
        const oldPath = urlParts[1].split('?')[0];
        await supabase.storage.from('company-logos').remove([oldPath]);
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ company_logo_url: '', logo_enabled: false })
        .eq('user_id', user?.id);

      if (error) throw error;

      setProfile({ ...profile, company_logo_url: '', logo_enabled: false });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error removing logo:', error);
      setUploadError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            ...profile,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user?.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            ...profile,
            user_id: user?.id,
          });

        if (error) throw error;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_settings')
          .update({
            ...settings,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user?.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_settings')
          .insert({
            ...settings,
            user_id: user?.id,
          });

        if (error) throw error;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img src="/SendGenie Logo Official.png" alt="SendGenie" className="h-[58px] w-auto" />
            <div className="h-8 w-px bg-gray-300"></div>
            <p className="text-sm text-gray-500 font-medium tracking-wide">upload, wish, send</p>
          </div>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'profile'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="w-4 h-4 inline-block mr-2" />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('email')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'email'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Mail className="w-4 h-4 inline-block mr-2" />
                Email Settings
              </button>
            </nav>
          </div>

          <div className="p-8">
            {activeTab === 'profile' && (
              <>
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Professional Profile
                  </h1>
                  <p className="text-gray-600">
                    Set up your professional information to use in email campaigns
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-800 font-medium">Error saving</p>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-800 font-medium">Saved successfully!</p>
                  </div>
                )}

                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="John Smith"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Use [Your Name] in email templates
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Title
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={profile.job_title}
                        onChange={(e) => setProfile({ ...profile, job_title: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Sales Manager"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Use [Your Title] in email templates
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={profile.company_name}
                        onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Acme Corp"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Use [Your Company] in email templates
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Professional Bio
                    </label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief professional bio or value proposition..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use [Your Bio] in email templates
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use [Your Phone] in email templates
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={profile.website}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://yourwebsite.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use [Your Website] in email templates
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <select
                        value={profile.timezone}
                        onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Anchorage">Alaska Time (AKT)</option>
                        <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                        <option value="Europe/London">London (GMT/BST)</option>
                        <option value="Europe/Paris">Paris (CET/CEST)</option>
                        <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                        <option value="Europe/Madrid">Madrid (CET/CEST)</option>
                        <option value="Europe/Rome">Rome (CET/CEST)</option>
                        <option value="Europe/Amsterdam">Amsterdam (CET/CEST)</option>
                        <option value="Asia/Dubai">Dubai (GST)</option>
                        <option value="Asia/Kolkata">India (IST)</option>
                        <option value="Asia/Singapore">Singapore (SGT)</option>
                        <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Shanghai">Shanghai (CST)</option>
                        <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                        <option value="Australia/Melbourne">Melbourne (AEST/AEDT)</option>
                        <option value="Pacific/Auckland">Auckland (NZST/NZDT)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Used for scheduling emails at the correct local time
                    </p>
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      AI Context for Email Generation
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Help the AI understand your business so it can generate better emails without you having to explain each time
                    </p>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          What Do You Do?
                        </label>
                        <textarea
                          value={profile.what_you_do}
                          onChange={(e) => setProfile({ ...profile, what_you_do: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Describe your role and what you do professionally..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Example: "I'm a software consultant helping companies modernize their technology stack"
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product/Service Description
                        </label>
                        <textarea
                          value={profile.product_description}
                          onChange={(e) => setProfile({ ...profile, product_description: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Describe what you're selling or offering..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Be specific about features, benefits, and what makes your offering unique
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Your Value Proposition
                        </label>
                        <textarea
                          value={profile.value_proposition}
                          onChange={(e) => setProfile({ ...profile, value_proposition: e.target.value })}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="What unique value do you provide to clients?"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Example: "We reduce cloud costs by 40% while improving performance"
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Target Audience
                        </label>
                        <textarea
                          value={profile.target_audience}
                          onChange={(e) => setProfile({ ...profile, target_audience: e.target.value })}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Who are you trying to reach?"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Example: "CTOs and engineering leaders at mid-sized tech companies"
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Campaign Goals
                        </label>
                        <textarea
                          value={profile.campaign_goals}
                          onChange={(e) => setProfile({ ...profile, campaign_goals: e.target.value })}
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="What do you want to achieve with your campaigns?"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Example: "Book discovery calls, build relationships, get referrals"
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Email Signature
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Create a professional signature that will appear at the end of your campaign emails
                    </p>

                    <div className="space-y-6">
                      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <input
                          type="checkbox"
                          id="signature_enabled"
                          checked={profile.signature_enabled}
                          onChange={(e) => setProfile({ ...profile, signature_enabled: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="signature_enabled" className="text-sm font-medium text-gray-900 cursor-pointer">
                          Enable email signature
                        </label>
                      </div>

                      {profile.signature_enabled && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Name
                            </label>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <input
                                type="text"
                                value={profile.signature_name}
                                onChange={(e) => setProfile({ ...profile, signature_name: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="John Smith"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Job Title
                            </label>
                            <div className="relative">
                              <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <input
                                type="text"
                                value={profile.signature_title}
                                onChange={(e) => setProfile({ ...profile, signature_title: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Sales Manager"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Phone Number
                            </label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <input
                                type="tel"
                                value={profile.signature_phone}
                                onChange={(e) => setProfile({ ...profile, signature_phone: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="+1 (555) 123-4567"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Email Address
                            </label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <input
                                type="email"
                                value={profile.signature_email}
                                onChange={(e) => setProfile({ ...profile, signature_email: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="john@company.com"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Website
                            </label>
                            <div className="relative">
                              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <input
                                type="url"
                                value={profile.signature_website}
                                onChange={(e) => setProfile({ ...profile, signature_website: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="www.company.com"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              LinkedIn Profile
                            </label>
                            <div className="relative">
                              <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <input
                                type="text"
                                value={profile.signature_linkedin}
                                onChange={(e) => setProfile({ ...profile, signature_linkedin: e.target.value })}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="linkedin.com/in/yourprofile or just yourprofile"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Custom Text / Tagline
                            </label>
                            <textarea
                              value={profile.signature_custom_text}
                              onChange={(e) => setProfile({ ...profile, signature_custom_text: e.target.value })}
                              rows={2}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="e.g., 'Helping businesses grow through technology'"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Company Logo
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Upload your company logo to include in email signatures
                    </p>

                    <div className="space-y-4">
                      {profile.company_logo_url ? (
                        <div className="space-y-4">
                          <div className="relative inline-block">
                            <img
                              src={profile.company_logo_url}
                              alt="Company Logo"
                              className="max-w-xs max-h-32 border border-gray-300 rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              disabled={uploading}
                              className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <input
                              type="checkbox"
                              id="logo_enabled"
                              checked={profile.logo_enabled}
                              onChange={(e) => setProfile({ ...profile, logo_enabled: e.target.checked })}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="logo_enabled" className="text-sm font-medium text-gray-900 cursor-pointer">
                              Include logo in email signature
                            </label>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Logo Size in Emails
                            </label>
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => setProfile({ ...profile, logo_size: 'small' })}
                                className={`flex-1 px-4 py-2 text-sm rounded-lg border-2 transition-colors ${
                                  profile.logo_size === 'small'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                Small (100px)
                              </button>
                              <button
                                type="button"
                                onClick={() => setProfile({ ...profile, logo_size: 'medium' })}
                                className={`flex-1 px-4 py-2 text-sm rounded-lg border-2 transition-colors ${
                                  profile.logo_size === 'medium'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                Medium (150px)
                              </button>
                              <button
                                type="button"
                                onClick={() => setProfile({ ...profile, logo_size: 'large' })}
                                className={`flex-1 px-4 py-2 text-sm rounded-lg border-2 transition-colors ${
                                  profile.logo_size === 'large'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                Large (200px)
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Logo Padding
                            </label>
                            <div className="grid grid-cols-4 gap-3">
                              <button
                                type="button"
                                onClick={() => setProfile({ ...profile, logo_padding: 'none' })}
                                className={`px-4 py-2 text-sm rounded-lg border-2 transition-colors ${
                                  profile.logo_padding === 'none'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                None
                              </button>
                              <button
                                type="button"
                                onClick={() => setProfile({ ...profile, logo_padding: 'small' })}
                                className={`px-4 py-2 text-sm rounded-lg border-2 transition-colors ${
                                  profile.logo_padding === 'small'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                Small
                              </button>
                              <button
                                type="button"
                                onClick={() => setProfile({ ...profile, logo_padding: 'medium' })}
                                className={`px-4 py-2 text-sm rounded-lg border-2 transition-colors ${
                                  profile.logo_padding === 'medium'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                Medium
                              </button>
                              <button
                                type="button"
                                onClick={() => setProfile({ ...profile, logo_padding: 'large' })}
                                className={`px-4 py-2 text-sm rounded-lg border-2 transition-colors ${
                                  profile.logo_padding === 'large'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                Large
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                          >
                            <Upload className="w-4 h-4" />
                            Replace Logo
                          </button>
                        </div>
                      ) : (
                        <div>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors w-full justify-center disabled:opacity-50"
                          >
                            <Image className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">
                              {uploading ? 'Uploading...' : 'Click to upload logo'}
                            </span>
                          </button>
                          <p className="text-xs text-gray-500 mt-2">
                            PNG, JPG, SVG, or WEBP. Max 2MB.
                          </p>
                        </div>
                      )}

                      {uploadError && (
                        <div className="text-sm text-red-600">{uploadError}</div>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <SignaturePreview profile={profile as UserProfile} />

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-5 h-5" />
                      {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {activeTab === 'email' && (
              <>
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Email Settings
                  </h1>
                  <p className="text-gray-600">
                    Configure your SMTP credentials to send emails from your own email account
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-800 font-medium">Error saving settings</p>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-800 font-medium">Settings saved successfully!</p>
                  </div>
                )}

                <form onSubmit={handleEmailSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Host
                    </label>
                    <div className="relative">
                      <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={settings.smtp_host}
                        onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="smtp.gmail.com"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Example: smtp.gmail.com, smtp.office365.com, smtp.mailgun.org
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={settings.smtp_port}
                      onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="587"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Common ports: 587 (TLS), 465 (SSL), 25 (unsecured)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Username
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={settings.smtp_user}
                        onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="your-email@company.com"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Usually your email address
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMTP Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="password"
                        value={settings.smtp_pass}
                        onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      For Gmail, use an App Password. For others, use your email password.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        value={settings.smtp_from}
                        onChange={(e) => setSettings({ ...settings, smtp_from: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="your-email@company.com"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      The email address that will appear in the "From" field
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-5 h-5" />
                      {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </form>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    Gmail Users
                  </h3>
                  <p className="text-xs text-blue-800">
                    If you're using Gmail, you'll need to create an App Password:
                  </p>
                  <ol className="text-xs text-blue-800 mt-2 ml-4 list-decimal space-y-1">
                    <li>Go to your Google Account settings</li>
                    <li>Enable 2-Step Verification</li>
                    <li>Go to Security → App passwords</li>
                    <li>Generate a password for "Mail"</li>
                    <li>Use that password here instead of your regular password</li>
                  </ol>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
