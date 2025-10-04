import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Contact, Campaign } from '../lib/supabase';
import { ArrowLeft, Wand2, Send, Loader, CheckCircle, XCircle, Mail, Eye, X, Clock } from 'lucide-react';

interface FollowUpComposerProps {
  campaignId: string;
  campaign: Campaign;
  selectedContacts: Contact[];
  excludedContacts: Contact[];
  engagementThreshold: number;
  onBack: () => void;
  onComplete: () => void;
}

export function FollowUpComposer({
  campaignId,
  campaign,
  selectedContacts,
  excludedContacts,
  engagementThreshold,
  onBack,
  onComplete,
}: FollowUpComposerProps) {
  const { user, session } = useAuth();
  const [step, setStep] = useState<'compose' | 'review' | 'sending'>('compose');

  const [campaignName, setCampaignName] = useState('');
  const [userInstructions, setUserInstructions] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ email: string; status: 'pending' | 'sent' | 'failed'; error?: string }[]>([]);
  const [followUpCampaignId, setFollowUpCampaignId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [includeLogo, setIncludeLogo] = useState(true);

  useEffect(() => {
    fetchUserProfile();
    setCampaignName(`Follow-up: ${campaign.name}`);
  }, [campaign]);

  const generatePreview = () => {
    const sampleContact = selectedContacts[0] || { first_name: 'John', last_name: 'Doe', company: 'Acme Corp', email: 'john@example.com' };

    let previewSubject = subject
      .replace(/\[First Name\]/g, sampleContact.first_name)
      .replace(/\[Company\]/g, sampleContact.company || 'your company');

    let previewBody = body
      .replace(/\[First Name\]/g, sampleContact.first_name)
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
      if (data) setUserProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleGenerateEmail = async () => {
    if (!userInstructions.trim()) {
      alert('Please provide instructions for the AI to compose the follow-up email');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-follow-up-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            originalCampaign: {
              name: campaign.name,
              subject: campaign.subject,
              body: campaign.body,
            },
            userInstructions,
            engagementThreshold,
            selectedCount: selectedContacts.length,
            profile: userProfile ? {
              what_you_do: userProfile.what_you_do,
              product_description: userProfile.product_description,
              value_proposition: userProfile.value_proposition,
              target_audience: userProfile.target_audience,
              campaign_goals: userProfile.campaign_goals,
            } : null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate follow-up email');
      }

      const data = await response.json();
      setSubject(data.subject);
      setBody(data.body);
      setStep('review');
    } catch (error) {
      console.error('Error generating follow-up email:', error);
      alert('Failed to generate follow-up email. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendFollowUp = async () => {
    if (!campaignName.trim()) {
      alert('Please enter a campaign name');
      return;
    }

    setSending(true);
    setStep('sending');

    try {

      const { data: followUpCampaign, error: campaignError } = await supabase
        .from('follow_up_campaigns')
        .insert({
          campaign_id: campaignId,
          user_id: user!.id,
          name: campaignName,
          subject,
          body,
          engagement_threshold: engagementThreshold,
          total_selected: selectedContacts.length,
          total_excluded: excludedContacts.length,
          sent_count: 0,
          failed_count: 0,
          status: 'sending',
          include_signature: includeSignature,
          include_logo: includeLogo,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;
      setFollowUpCampaignId(followUpCampaign.id);

      if (excludedContacts.length > 0) {
        const exclusions = excludedContacts.map(contact => ({
          follow_up_campaign_id: followUpCampaign.id,
          contact_id: contact.id,
          user_id: user!.id,
          reason: (contact as any).exclusionReason || 'Manually excluded',
        }));

        await supabase.from('contact_exclusions').insert(exclusions);
      }

      const statusArray = selectedContacts.map(c => ({ email: c.email, status: 'pending' as const }));
      setSendStatus(statusArray);

      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < selectedContacts.length; i++) {
        const contact = selectedContacts[i];

        try {
          const trackingPixelId = crypto.randomUUID();

          let personalizedBody = body
            .replace(/\[First Name\]/g, contact.first_name)
            .replace(/\[Company\]/g, contact.company || 'your company');

          let personalizedSubject = subject
            .replace(/\[First Name\]/g, contact.first_name)
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
                campaignId: campaignId,
                contactId: contact.id,
                trackingPixelId: trackingPixelId,
                followUpCampaignId: followUpCampaign.id,
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
        .from('follow_up_campaigns')
        .update({
          status: failedCount === selectedContacts.length ? 'failed' : 'completed',
          sent_count: sentCount,
          failed_count: failedCount,
        })
        .eq('id', followUpCampaign.id);

    } catch (error) {
      console.error('Error sending follow-up emails:', error);
      alert('Failed to send follow-up emails. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (step === 'compose') {
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
                Back to Analytics
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Compose Follow-up Email</h2>
          <p className="text-gray-600 mb-8">
            AI will compose a personalized follow-up email for {selectedContacts.length} contacts
          </p>

          <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Original Campaign Context</h3>
              <p className="text-sm text-blue-800 mb-1">
                <span className="font-medium">Campaign:</span> {campaign.name}
              </p>
              <p className="text-sm text-blue-800 mb-1">
                <span className="font-medium">Original Subject:</span> {campaign.subject}
              </p>
              <p className="text-sm text-blue-800">
                <span className="font-medium">Engagement Filter:</span> Opened at least {engagementThreshold} times
              </p>
            </div>

            {excludedContacts.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <span className="font-medium">{excludedContacts.length} contacts excluded</span> from this follow-up
                </p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Follow-up Campaign Name
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Follow-up: Q1 Outreach"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions for AI
              </label>
              <textarea
                value={userInstructions}
                onChange={(e) => setUserInstructions(e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Example: Write a warm follow-up thanking them for their interest. Mention that we have a special offer for early adopters. Include a call to action to schedule a 15-minute demo call this week. Keep the tone friendly and professional."
              />
              <p className="text-xs text-gray-500 mt-2">
                Be specific about tone, content, and call-to-action. The AI will reference the original campaign automatically.
              </p>
            </div>

            <button
              onClick={handleGenerateEmail}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  Generate Follow-up Email
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
                onClick={() => setStep('compose')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Compose
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Review & Send Follow-up</h2>
          <p className="text-gray-600 mb-8">
            Review your follow-up email and send to {selectedContacts.length} contacts
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

            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Recipients Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Selected Contacts</p>
                  <p className="text-2xl font-bold text-green-600">{selectedContacts.length}</p>
                </div>
                <div>
                  <p className="text-gray-600">Excluded Contacts</p>
                  <p className="text-2xl font-bold text-red-600">{excludedContacts.length}</p>
                </div>
              </div>
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
                onClick={handleSendFollowUp}
                disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
                Send {selectedContacts.length} Follow-up Emails
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
                      Sample recipient: {sampleContact.first_name} {sampleContact.last_name} ({sampleContact.email})
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
                      <p><span className="font-semibold">[First Name]</span> → {sampleContact.first_name}</p>
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
              <h1 className="text-xl font-bold text-gray-900">Sending Follow-up Campaign</h1>
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
                onClick={onComplete}
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
