import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Contact, EmailLog, EmailOpen, FollowUpCampaign } from '../lib/supabase';
import { ArrowLeft, Mail, Eye, Clock, ChevronDown, ChevronUp, Reply } from 'lucide-react';

interface FollowUpAnalyticsProps {
  followUpCampaignId: string;
  onBack: () => void;
}

interface ContactAnalytics extends Contact {
  emailLog?: EmailLog;
  opens: EmailOpen[];
  openCount: number;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
}

export function FollowUpAnalytics({ followUpCampaignId, onBack }: FollowUpAnalyticsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [followUpCampaign, setFollowUpCampaign] = useState<FollowUpCampaign | null>(null);
  const [parentCampaign, setParentCampaign] = useState<any>(null);
  const [contactAnalytics, setContactAnalytics] = useState<ContactAnalytics[]>([]);
  const [expandedContact, setExpandedContact] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [followUpCampaignId]);

  const fetchAnalytics = async () => {
    try {
      const { data: followUpData, error: followUpError } = await supabase
        .from('follow_up_campaigns')
        .select('*')
        .eq('id', followUpCampaignId)
        .single();

      if (followUpError) throw followUpError;
      setFollowUpCampaign(followUpData);

      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', followUpData.campaign_id)
        .single();

      if (campaignError) throw campaignError;
      setParentCampaign(campaignData);

      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('campaign_id', followUpData.campaign_id)
        .order('first_name');

      if (contactsError) throw contactsError;

      const { data: emailLogs, error: logsError } = await supabase
        .from('email_logs')
        .select('*')
        .eq('follow_up_campaign_id', followUpCampaignId);

      if (logsError) throw logsError;

      const { data: opens, error: opensError } = await supabase
        .from('email_opens')
        .select('*')
        .eq('follow_up_campaign_id', followUpCampaignId)
        .order('opened_at');

      if (opensError) throw opensError;

      const emailLogsMap = new Map((emailLogs || []).map(log => [log.contact_id, log]));
      const sentContactIds = new Set((emailLogs || []).map(log => log.contact_id));

      const analytics: ContactAnalytics[] = (contacts || [])
        .filter(contact => sentContactIds.has(contact.id))
        .map(contact => {
          const emailLog = emailLogsMap.get(contact.id);
          const contactOpens = (opens || []).filter(open => open.email_log_id === emailLog?.id);

          return {
            ...contact,
            emailLog,
            opens: contactOpens,
            openCount: contactOpens.length,
            firstOpenedAt: emailLog?.first_opened_at,
            lastOpenedAt: emailLog?.last_opened_at,
          };
        });

      analytics.sort((a, b) => b.openCount - a.openCount);

      setContactAnalytics(analytics);
    } catch (error) {
      console.error('Error fetching follow-up analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalOpens = contactAnalytics.reduce((sum, c) => sum + c.openCount, 0);
  const uniqueOpens = contactAnalytics.filter(c => c.openCount > 0).length;
  const openRate = followUpCampaign?.sent_count && followUpCampaign.sent_count > 0
    ? ((uniqueOpens / followUpCampaign.sent_count) * 100).toFixed(1)
    : '0';

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getEngagementColor = (count: number) => {
    if (count === 0) return 'text-gray-400';
    if (count === 1) return 'text-blue-600';
    if (count <= 3) return 'text-green-600';
    return 'text-orange-600';
  };

  const getEngagementBadge = (count: number) => {
    if (count === 0) return { label: 'Not Opened', color: 'bg-gray-100 text-gray-600' };
    if (count === 1) return { label: 'Opened Once', color: 'bg-blue-100 text-blue-700' };
    if (count <= 3) return { label: 'Engaged', color: 'bg-green-100 text-green-700' };
    return { label: 'Highly Engaged', color: 'bg-orange-100 text-orange-700' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Reply className="w-6 h-6 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-900">Follow-up Campaign Analytics</h2>
          </div>
          <p className="text-gray-600">{followUpCampaign?.name}</p>
          <p className="text-sm text-gray-500 mt-1">Subject: {followUpCampaign?.subject}</p>
          <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Parent Campaign:</span> {parentCampaign?.name}
            </p>
            <p className="text-sm text-blue-900 mt-1">
              <span className="font-semibold">Engagement Filter:</span> Contacts who opened the original email at least {followUpCampaign?.engagement_threshold} times
            </p>
            <p className="text-sm text-blue-900 mt-1">
              <span className="font-semibold">Sent to:</span> {followUpCampaign?.total_selected} contacts ({followUpCampaign?.total_excluded} excluded)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-6 h-6 text-blue-600" />
              <h3 className="text-sm font-medium text-gray-500">Total Sent</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{followUpCampaign?.sent_count || 0}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Eye className="w-6 h-6 text-green-600" />
              <h3 className="text-sm font-medium text-gray-500">Unique Opens</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{uniqueOpens}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Eye className="w-6 h-6 text-orange-600" />
              <h3 className="text-sm font-medium text-gray-500">Total Opens</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalOpens}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-6 h-6 text-blue-600" />
              <h3 className="text-sm font-medium text-gray-500">Open Rate</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{openRate}%</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Contact Engagement</h3>
            <p className="text-sm text-gray-600 mt-1">Sorted by engagement level</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Times Opened
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    First Opened
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Opened
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contactAnalytics.map((contact) => {
                  const badge = getEngagementBadge(contact.openCount);
                  const isExpanded = expandedContact === contact.id;

                  return (
                    <>
                      <tr key={contact.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {contact.first_name} {contact.last_name}
                          </div>
                          <div className="text-sm text-gray-500">{contact.email}</div>
                          {contact.company && (
                            <div className="text-xs text-gray-400">{contact.company}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-2xl font-bold ${getEngagementColor(contact.openCount)}`}>
                            {contact.openCount}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(contact.firstOpenedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {contact.lastOpenedAt ? formatRelativeTime(contact.lastOpenedAt) : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {contact.openCount > 0 && (
                            <button
                              onClick={() => setExpandedContact(isExpanded ? null : contact.id)}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  Hide
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  View All
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && contact.opens.length > 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                All Open Events ({contact.opens.length})
                              </h4>
                              <div className="space-y-1">
                                {contact.opens.map((open, idx) => (
                                  <div
                                    key={open.id}
                                    className="flex items-center gap-3 text-sm text-gray-600 bg-white px-4 py-2 rounded"
                                  >
                                    <span className="font-mono text-xs text-gray-400">#{idx + 1}</span>
                                    <Eye className="w-4 h-4 text-blue-500" />
                                    <span className="font-medium">{formatDateTime(open.opened_at)}</span>
                                    <span className="text-gray-400">({formatRelativeTime(open.opened_at)})</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {contactAnalytics.length === 0 && (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No contacts found for this follow-up campaign</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
