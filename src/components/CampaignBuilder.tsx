import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Upload, Wand2, Send, ArrowLeft, FileSpreadsheet, CheckCircle, XCircle, Loader, Eye, X, Clock } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Contact {
  firstName: string;
  lastName?: string;
  email: string;
  company?: string;
}

interface CampaignBuilderProps {
  onBack: () => void;
}

export function CampaignBuilder({ onBack }: CampaignBuilderProps) {
  const { user, session } = useAuth();
  const [step, setStep] = useState<'upload' | 'generate' | 'review' | 'sending'>('upload');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaignName, setCampaignName] = useState('');
  const [emailDescription, setEmailDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ email: string; status: 'pending' | 'sent' | 'failed'; error?: string }[]>([]);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{
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
    timezone: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [includeLogo, setIncludeLogo] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, [user]);

  const generatePreview = () => {
    const sampleContact = contacts[0] || { firstName: 'John', lastName: 'Doe', company: 'Acme Corp', email: 'john@example.com' };

    let previewSubject = subject
      .replace(/\[First Name\]/g, sampleContact.firstName)
      .replace(/\[Company\]/g, sampleContact.company || 'your company');

    let previewBody = body
      .replace(/\[First Name\]/g, sampleContact.firstName)
      .replace(/\[Company\]/g, sampleContact.company || 'your company')
      .replace(/\n/g, '<br>');

    if (userProfile) {
      previewSubject = previewSubject
        .replace(/\[Your Name\]/g, userProfile.full_name || 'Your Name')
        .replace(/\[Your Title\]/g, userProfile.job_title || 'Your Title')
        .replace(/\[Your Company\]/g, userProfile.company_name || 'Your Company')
        .replace(/\[Your Bio\]/g, userProfile.bio || 'Your Bio')
        .replace(/\[Your Phone\]/g, userProfile.phone || 'Your Phone')
        .replace(/\[Your Website\]/g, userProfile.website || 'Your Website');

      previewBody = previewBody
        .replace(/\[Your Name\]/g, userProfile.full_name || 'Your Name')
        .replace(/\[Your Title\]/g, userProfile.job_title || 'Your Title')
        .replace(/\[Your Company\]/g, userProfile.company_name || 'Your Company')
        .replace(/\[Your Bio\]/g, userProfile.bio || 'Your Bio')
        .replace(/\[Your Phone\]/g, userProfile.phone || 'Your Phone')
        .replace(/\[Your Website\]/g, userProfile.website || 'Your Website');
    }

    return { previewSubject, previewBody, sampleContact };
  };

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserProfile({
          full_name: data.full_name || '',
          job_title: data.job_title || '',
          company_name: data.company_name || '',
          bio: data.bio || '',
          phone: data.phone || '',
          website: data.website || '',
          what_you_do: data.what_you_do || '',
          product_description: data.product_description || '',
          campaign_goals: data.campaign_goals || '',
          target_audience: data.target_audience || '',
          value_proposition: data.value_proposition || '',
          timezone: data.timezone || 'UTC',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const parsedContacts: Contact[] = jsonData.map((row) => ({
          firstName: row['First Name'] || row['Name'] || row['first_name'] || row['name'] || '',
          lastName: row['Last Name'] || row['last_name'] || '',
          email: row['Email'] || row['email'] || '',
          company: row['Company'] || row['company'] || '',
        })).filter(c => c.email && c.firstName);

        setContacts(parsedContacts);
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file. Please ensure it has columns: First Name, Email, Company');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleGenerateEmail = async () => {
    if (!emailDescription.trim()) {
      alert('Please describe what you want the email to be about');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            description: emailDescription,
            profile: userProfile ? {
              what_you_do: userProfile.what_you_do,
              product_description: userProfile.product_description,
              value_proposition: userProfile.value_proposition,
              target_audience: userProfile.target_audience,
              campaign_goals: userProfile.campaign_goals,
            } : null
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate email');
      }

      const data = await response.json();
      setSubject(data.subject);
      setBody(data.body);
      setStep('review');
    } catch (error) {
      console.error('Error generating email:', error);
      alert('Failed to generate email. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendEmails = async () => {
    if (!campaignName.trim()) {
      alert('Please enter a campaign name');
      return;
    }

    setSending(true);
    setStep('sending');

    try {
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          user_id: user!.id,
          name: campaignName,
          subject,
          body,
          sender_email: 'default',
          status: 'sending',
          total_contacts: contacts.length,
          sent_count: 0,
          failed_count: 0,
          include_signature: includeSignature,
          include_logo: includeLogo,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;
      setCampaignId(campaign.id);

      const contactRecords = contacts.map(c => ({
        campaign_id: campaign.id,
        user_id: user!.id,
        first_name: c.firstName,
        last_name: c.lastName,
        email: c.email,
        company: c.company,
      }));

      const { data: savedContacts, error: contactsError } = await supabase
        .from('contacts')
        .insert(contactRecords)
        .select();

      if (contactsError) throw contactsError;

      const statusArray = contacts.map(c => ({ email: c.email, status: 'pending' as const }));
      setSendStatus(statusArray);

      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        const savedContact = savedContacts[i];

        try {
          const trackingPixelId = crypto.randomUUID();

          let personalizedBody = body
            .replace(/\[First Name\]/g, contact.firstName)
            .replace(/\[Company\]/g, contact.company || 'your company');

          let personalizedSubject = subject
            .replace(/\[First Name\]/g, contact.firstName)
            .replace(/\[Company\]/g, contact.company || 'your company');

          if (userProfile) {
            personalizedBody = personalizedBody
              .replace(/\[Your Name\]/g, userProfile.full_name)
              .replace(/\[Your Title\]/g, userProfile.job_title)
              .replace(/\[Your Company\]/g, userProfile.company_name)
              .replace(/\[Your Bio\]/g, userProfile.bio)
              .replace(/\[Your Phone\]/g, userProfile.phone)
              .replace(/\[Your Website\]/g, userProfile.website);

            personalizedSubject = personalizedSubject
              .replace(/\[Your Name\]/g, userProfile.full_name)
              .replace(/\[Your Title\]/g, userProfile.job_title)
              .replace(/\[Your Company\]/g, userProfile.company_name)
              .replace(/\[Your Bio\]/g, userProfile.bio)
              .replace(/\[Your Phone\]/g, userProfile.phone)
              .replace(/\[Your Website\]/g, userProfile.website);
          }

          const trackingPixelUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-email-open?id=${trackingPixelId}`;
          const trackingPixelHtml = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;" />`;

          personalizedBody = personalizedBody + trackingPixelHtml;

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({
                to: contact.email,
                subject: personalizedSubject,
                body: personalizedBody,
                campaignId: campaign.id,
                contactId: savedContact.id,
                trackingPixelId: trackingPixelId,
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          }

          sentCount++;
          setSendStatus(prev => prev.map((s, idx) =>
            idx === i ? { ...s, status: 'sent' as const } : s
          ));
        } catch (error: any) {
          failedCount++;
          setSendStatus(prev => prev.map((s, idx) =>
            idx === i ? { ...s, status: 'failed' as const, error: error.message } : s
          ));
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      await supabase
        .from('campaigns')
        .update({
          status: failedCount === contacts.length ? 'failed' : 'completed',
          sent_count: sentCount,
          failed_count: failedCount,
        })
        .eq('id', campaign.id);

    } catch (error) {
      console.error('Error sending emails:', error);
      alert('Failed to send emails. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img src="/SendGenie Logo Official.png" alt="SendGenie" className="h-[58px] w-auto" />
                <div className="h-8 w-px bg-gray-300"></div>
                <p className="text-sm text-gray-500 font-medium tracking-wide">upload, wish, send</p>
              </div>
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Upload Contacts</h2>
          <p className="text-gray-600 mb-8">
            Upload an Excel file with columns: First Name, Email, Company
          </p>

          <div className="bg-white rounded-lg shadow-sm p-8">
            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop your Excel file here or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports .xlsx and .xls files
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </label>

            {contacts.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {contacts.length} contacts loaded
                  </h3>
                  <button
                    onClick={() => setStep('generate')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Next
                    <Wand2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Name
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Email
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Company
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {contacts.slice(0, 10).map((contact, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {contact.firstName} {contact.lastName}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {contact.email}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {contact.company}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {contacts.length > 10 && (
                    <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500 text-center">
                      Showing 10 of {contacts.length} contacts
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'generate') {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img src="/SendGenie Logo Official.png" alt="SendGenie" className="h-[58px] w-auto" />
                <div className="h-8 w-px bg-gray-300"></div>
                <p className="text-sm text-gray-500 font-medium tracking-wide">upload, wish, send</p>
              </div>
              <button
                onClick={() => setStep('upload')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Generate Email</h2>
          <p className="text-gray-600 mb-8">
            Describe what you want the email to be about, and AI will write it for you
          </p>

          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Q1 Outreach"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Description
              </label>
              <textarea
                value={emailDescription}
                onChange={(e) => setEmailDescription(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Example: Write a friendly follow-up email to prospects who visited our booth at the healthcare conference. Mention how Skyler Health can help improve their patient engagement and offer to schedule a demo."
              />
            </div>

            <button
              onClick={handleGenerateEmail}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Generate Email with AI
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img src="/SendGenie Logo Official.png" alt="SendGenie" className="h-[58px] w-auto" />
                <div className="h-8 w-px bg-gray-300"></div>
                <p className="text-sm text-gray-500 font-medium tracking-wide">upload, wish, send</p>
              </div>
              <button
                onClick={() => setStep('generate')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Review & Send</h2>
          <p className="text-gray-600 mb-8">
            Review your email and send to {contacts.length} contacts
          </p>

          <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                Use [First Name] and [Company] for personalization
              </p>
            </div>

            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <input
                  type="checkbox"
                  id="include_signature"
                  checked={includeSignature}
                  onChange={(e) => setIncludeSignature(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="include_signature" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Include email signature from profile settings
                </label>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <input
                  type="checkbox"
                  id="include_logo"
                  checked={includeLogo}
                  onChange={(e) => setIncludeLogo(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="include_logo" className="text-sm font-medium text-gray-900 cursor-pointer">
                  Include company logo in signature
                </label>
              </div>
            </div>


            <div className="flex gap-4">
              <button
                onClick={() => setShowPreview(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Eye className="w-5 h-5" />
                Preview Email
              </button>
              <button
                onClick={handleSendEmails}
                disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
                Send {contacts.length} Emails
              </button>
            </div>
          </div>
        </div>

        {showPreview && (() => {
          const { previewSubject, previewBody, sampleContact } = generatePreview();
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Email Preview</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Sample recipient: {sampleContact.firstName} {sampleContact.lastName} ({sampleContact.email})
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 font-medium mb-1">SUBJECT</p>
                      <p className="text-lg font-semibold text-gray-900">{previewSubject}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-3">MESSAGE</p>
                      <div
                        className="prose prose-sm max-w-none text-gray-900"
                        dangerouslySetInnerHTML={{ __html: previewBody }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-900 font-medium mb-2">Personalization Tags</p>
                    <div className="text-xs text-blue-800 space-y-1">
                      <p><span className="font-semibold">[First Name]</span> → {sampleContact.firstName}</p>
                      <p><span className="font-semibold">[Company]</span> → {sampleContact.company || 'your company'}</p>
                      {userProfile && (
                        <>
                          <p><span className="font-semibold">[Your Name]</span> → {userProfile.full_name || 'Your Name'}</p>
                          <p><span className="font-semibold">[Your Title]</span> → {userProfile.job_title || 'Your Title'}</p>
                          <p><span className="font-semibold">[Your Company]</span> → {userProfile.company_name || 'Your Company'}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  if (step === 'sending') {
    const sentCount = sendStatus.filter(s => s.status === 'sent').length;
    const failedCount = sendStatus.filter(s => s.status === 'failed').length;
    const pendingCount = sendStatus.filter(s => s.status === 'pending').length;

    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img src="/SendGenie Logo Official.png" alt="SendGenie" className="h-[58px] w-auto" />
                <div className="h-8 w-px bg-gray-300"></div>
                <p className="text-sm text-gray-500 font-medium tracking-wide">upload, wish, send</p>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Sending Campaign</h1>
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Sending Progress</h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{sentCount}</p>
                <p className="text-sm text-gray-600">Sent</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{failedCount}</p>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <Loader className="w-8 h-8 text-blue-600 mx-auto mb-2 animate-spin" />
                <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                {sendStatus.map((status, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-3 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-900">{status.email}</span>
                      <span className="flex items-center gap-2">
                        {status.status === 'sent' && (
                          <span className="flex items-center gap-1 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Sent
                          </span>
                        )}
                        {status.status === 'failed' && (
                          <span className="flex items-center gap-1 text-red-600 text-sm">
                            <XCircle className="w-4 h-4" />
                            Failed
                          </span>
                        )}
                        {status.status === 'pending' && (
                          <span className="text-gray-400 text-sm">Pending...</span>
                        )}
                      </span>
                    </div>
                    {status.status === 'failed' && status.error && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded">
                        {status.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {!sending && (
              <button
                onClick={onBack}
                className="w-full mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
