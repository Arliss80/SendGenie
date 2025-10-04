import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Contact, EmailLog, EmailOpen, ContactExclusion } from '../lib/supabase';
import { ArrowLeft, Mail, Eye, Clock, ChevronDown, ChevronUp, Filter, Send, X, Search, UserX, CheckSquare, Square } from 'lucide-react';
import { FollowUpComposer } from './FollowUpComposer';

interface CampaignAnalyticsProps {
  campaignId: string;
  onBack: () => void;
}

interface ContactAnalytics extends Contact {
  emailLog?: EmailLog;
  opens: EmailOpen[];
  openCount: number;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
  selected?: boolean;
  excluded?: boolean;
  exclusionReason?: string;
}

export function CampaignAnalytics({ campaignId, onBack }: CampaignAnalyticsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [contactAnalytics, setContactAnalytics] = useState<ContactAnalytics[]>([]);
  const [expandedContact, setExpandedContact] = useState<string | null>(null);

  // Filter and selection states
  const [filterMode, setFilterMode] = useState(false);
  const [openThreshold, setOpenThreshold] = useState(2);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExcluded, setShowExcluded] = useState(false);
  const [showComposer, setShowComposer] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [campaignId]);

  const fetchAnalytics = async () => {
    try {
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('first_name');

      if (contactsError) throw contactsError;

      const { data: emailLogs, error: logsError } = await supabase
        .from('email_logs')
        .select('*')
        .eq('campaign_id', campaignId)
        .is('follow_up_campaign_id', null);

      if (logsError) throw logsError;

      const { data: opens, error: opensError } = await supabase
        .from('email_opens')
        .select('*')
        .eq('campaign_id', campaignId)
        .is('follow_up_campaign_id', null)
        .order('opened_at');

      if (opensError) throw opensError;

      const analytics: ContactAnalytics[] = (contacts || []).map(contact => {
        const emailLog = (emailLogs || []).find(log => log.contact_id === contact.id);
        const contactOpens = (opens || []).filter(open => open.contact_id === contact.id);

        return {
          ...contact,
          emailLog,
          opens: contactOpens,
          openCount: contactOpens.length,
          firstOpenedAt: emailLog?.first_opened_at,
          lastOpenedAt: emailLog?.last_opened_at,
          selected: false,
          excluded: false,
        };
      });

      analytics.sort((a, b) => b.openCount - a.openCount);

      setContactAnalytics(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableFilterMode = () => {
    setFilterMode(true);
    applyThresholdFilter();
  };

  const applyThresholdFilter = () => {
    setContactAnalytics(prev => prev.map(contact => ({
      ...contact,
      selected: contact.openCount >= openThreshold && !contact.excluded,
    })));
  };

  const handleSelectAll = () => {
    setContactAnalytics(prev => prev.map(contact => ({
      ...contact,
      selected: contact.openCount >= openThreshold && !contact.excluded,
    })));
  };

  const handleDeselectAll = () => {
    setContactAnalytics(prev => prev.map(contact => ({
      ...contact,
      selected: false,
    })));
  };

  const handleToggleContact = (contactId: string) => {
    setContactAnalytics(prev => prev.map(contact =>
      contact.id === contactId ? { ...contact, selected: !contact.selected } : contact
    ));
  };

  const handleExcludeContact = (contactId: string, reason: string = 'Manually excluded') => {
    setContactAnalytics(prev => prev.map(contact =>
      contact.id === contactId
        ? { ...contact, excluded: true, selected: false, exclusionReason: reason }
        : contact
    ));
  };

  const handleIncludeContact = (contactId: string) => {
    setContactAnalytics(prev => prev.map(contact =>
      contact.id === contactId
        ? { ...contact, excluded: false, exclusionReason: undefined }
        : contact
    ));
  };

  const handleResetFilters = () => {
    setFilterMode(false);
    setOpenThreshold(2);
    setSearchTerm('');
    setShowExcluded(false);
    setContactAnalytics(prev => prev.map(contact => ({
      ...contact,
      selected: false,
      excluded: false,
      exclusionReason: undefined,
    })));
  };

  const selectedCount = contactAnalytics.filter(c => c.selected).length;
  const excludedCount = contactAnalytics.filter(c => c.excluded).length;
  const filteredContacts = contactAnalytics.filter(c => c.openCount >= openThreshold);

  const totalOpens = contactAnalytics.reduce((sum, c) => sum + c.openCount, 0);
  const uniqueOpens = contactAnalytics.filter(c => c.openCount > 0).length;
  const openRate = campaign?.total_contacts > 0
    ? ((uniqueOpens / campaign.total_contacts) * 100).toFixed(1)
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

  const searchedContacts = contactAnalytics.filter(contact => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      contact.email.toLowerCase().includes(search) ||
      contact.first_name.toLowerCase().includes(search) ||
      (contact.last_name?.toLowerCase() || '').includes(search) ||
      (contact.company?.toLowerCase() || '').includes(search)
    );
  });

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

  if (showComposer) {
    return (
      <FollowUpComposer
        campaignId={campaignId}
        campaign={campaign}
        selectedContacts={contactAnalytics.filter(c => c.selected)}
        excludedContacts={contactAnalytics.filter(c => c.excluded)}
        engagementThreshold={openThreshold}
        onBack={() => setShowComposer(false)}
        onComplete={() => {
          setShowComposer(false);
          handleResetFilters();
          onBack();
        }}
      />
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Campaign Analytics</h2>
          <p className="text-gray-600">{campaign?.name}</p>
          <p className="text-sm text-gray-500 mt-1">Subject: {campaign?.subject}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-6 h-6 text-blue-600" />
              <h3 className="text-sm font-medium text-gray-500">Total Sent</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{campaign?.sent_count || 0}</p>
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

        {!filterMode ? (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Send Follow-up Email</h3>
                <p className="text-sm text-gray-600">
                  Filter contacts by engagement and send targeted follow-up emails
                </p>
              </div>
              <button
                onClick={handleEnableFilterMode}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                <Filter className="w-5 h-5" />
                Start Follow-up
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Filter className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Follow-up Email Filter</h3>
                  <p className="text-sm text-gray-600">
                    Select contacts who opened at least X times
                  </p>
                </div>
              </div>
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Opens
                </label>
                <input
                  type="number"
                  min="1"
                  value={openThreshold}
                  onChange={(e) => {
                    setOpenThreshold(parseInt(e.target.value) || 1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Matching Contacts
                </label>
                <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {filteredContacts.length}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search & Exclude
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => {
                  applyThresholdFilter();
                  handleSelectAll();
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                Select All Filtered ({filteredContacts.length})
              </button>
              <button
                onClick={handleDeselectAll}
                className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                <Square className="w-4 h-4" />
                Deselect All
              </button>
              <div className="flex-1"></div>
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-green-600">{selectedCount}</span> selected
                {excludedCount > 0 && (
                  <>
                    {' · '}
                    <button
                      onClick={() => setShowExcluded(!showExcluded)}
                      className="font-semibold text-red-600 hover:underline"
                    >
                      {excludedCount} excluded
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowComposer(true)}
                disabled={selectedCount === 0}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                <Send className="w-5 h-5" />
                Compose Follow-up ({selectedCount})
              </button>
            </div>

            {showExcluded && excludedCount > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <UserX className="w-4 h-4" />
                  Excluded Contacts ({excludedCount})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {contactAnalytics.filter(c => c.excluded).map(contact => (
                    <div key={contact.id} className="flex items-center justify-between bg-white p-3 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {contact.first_name} {contact.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{contact.email}</p>
                        {contact.exclusionReason && (
                          <p className="text-xs text-red-600 mt-1">{contact.exclusionReason}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleIncludeContact(contact.id)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Re-include
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Contact Engagement</h3>
            <p className="text-sm text-gray-600 mt-1">
              {filterMode ? 'Select contacts for follow-up email' : 'Sorted by engagement level'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {filterMode && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                  )}
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
                    {filterMode ? 'Actions' : 'Details'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchedContacts.map((contact) => {
                  const badge = getEngagementBadge(contact.openCount);
                  const isExpanded = expandedContact === contact.id;
                  const meetsThreshold = contact.openCount >= openThreshold;

                  return (
                    <>
                      <tr
                        key={contact.id}
                        className={`hover:bg-gray-50 ${
                          contact.excluded ? 'bg-red-50 opacity-60' :
                          contact.selected ? 'bg-green-50' :
                          filterMode && meetsThreshold ? 'bg-blue-50' : ''
                        }`}
                      >
                        {filterMode && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            {contact.excluded ? (
                              <UserX className="w-5 h-5 text-red-500" />
                            ) : (
                              <input
                                type="checkbox"
                                checked={contact.selected || false}
                                onChange={() => handleToggleContact(contact.id)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                            )}
                          </td>
                        )}
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
                          {filterMode ? (
                            <div className="flex items-center gap-2">
                              {contact.excluded ? (
                                <button
                                  onClick={() => handleIncludeContact(contact.id)}
                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Re-include
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    const reason = prompt('Reason for exclusion (optional):');
                                    handleExcludeContact(contact.id, reason || 'Manually excluded');
                                  }}
                                  className="text-red-600 hover:text-red-800 font-medium"
                                >
                                  Exclude
                                </button>
                              )}
                            </div>
                          ) : (
                            contact.openCount > 0 && (
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
                            )
                          )}
                        </td>
                      </tr>
                      {isExpanded && contact.opens.length > 0 && (
                        <tr>
                          <td colSpan={filterMode ? 7 : 6} className="px-6 py-4 bg-gray-50">
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
              <p className="text-gray-600">No contacts found for this campaign</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
