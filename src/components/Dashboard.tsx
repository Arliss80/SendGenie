import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Campaign, FollowUpCampaign } from '../lib/supabase';
import { Plus, Mail, LogOut, Clock, CheckCircle, XCircle, Settings as SettingsIcon, BarChart3, Eye, Reply, ChevronDown, ChevronUp, Search, X as XIcon, Filter, Calendar, TrendingUp } from 'lucide-react';

interface DashboardProps {
  onNewCampaign: () => void;
  onSettings: () => void;
  onViewAnalytics: (campaignId: string, isFollowUp?: boolean) => void;
}

interface CampaignWithAnalytics extends Campaign {
  uniqueOpens: number;
  totalOpens: number;
  openRate: number;
  followUps?: FollowUpWithAnalytics[];
}

interface FollowUpWithAnalytics extends FollowUpCampaign {
  uniqueOpens: number;
  totalOpens: number;
  openRate: number;
}

export function Dashboard({ onNewCampaign, onSettings, onViewAnalytics }: DashboardProps) {
  const { user, signOut } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignWithAnalytics[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<CampaignWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingEmail, setViewingEmail] = useState<{subject: string; body: string} | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'performance'>('date');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const campaignsWithAnalytics = await Promise.all(
        (campaignsData || []).map(async (campaign) => {
          const { data: emailLogs } = await supabase
            .from('email_logs')
            .select('opened_count')
            .eq('campaign_id', campaign.id)
            .is('follow_up_campaign_id', null);

          const uniqueOpens = (emailLogs || []).filter(log => (log.opened_count || 0) > 0).length;
          const totalOpens = (emailLogs || []).reduce((sum, log) => sum + (log.opened_count || 0), 0);
          const openRate = campaign.sent_count > 0 ? (uniqueOpens / campaign.sent_count) * 100 : 0;

          const { data: followUpsData } = await supabase
            .from('follow_up_campaigns')
            .select('*')
            .eq('campaign_id', campaign.id)
            .order('created_at', { ascending: false });

          const followUpsWithAnalytics = await Promise.all(
            (followUpsData || []).map(async (followUp) => {
              const { data: followUpLogs } = await supabase
                .from('email_logs')
                .select('opened_count')
                .eq('follow_up_campaign_id', followUp.id);

              const followUpUniqueOpens = (followUpLogs || []).filter(log => (log.opened_count || 0) > 0).length;
              const followUpTotalOpens = (followUpLogs || []).reduce((sum, log) => sum + (log.opened_count || 0), 0);
              const followUpOpenRate = followUp.sent_count > 0 ? (followUpUniqueOpens / followUp.sent_count) * 100 : 0;

              return {
                ...followUp,
                uniqueOpens: followUpUniqueOpens,
                totalOpens: followUpTotalOpens,
                openRate: followUpOpenRate,
              };
            })
          );

          return {
            ...campaign,
            uniqueOpens,
            totalOpens,
            openRate,
            followUps: followUpsWithAnalytics,
          };
        })
      );

      setCampaigns(campaignsWithAnalytics);
      setFilteredCampaigns(campaignsWithAnalytics);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = campaigns;

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(query) ||
        campaign.subject.toLowerCase().includes(query) ||
        campaign.body.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'performance') {
        return b.openRate - a.openRate;
      }
      return 0;
    });

    setFilteredCampaigns(filtered);
  }, [searchQuery, campaigns, statusFilter, sortBy]);

  const toggleCampaignExpanded = (campaignId: string) => {
    setExpandedCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'sending':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'sending':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      <nav className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src="/SendGenie Logo Official.png" alt="SendGenie" className="h-[58px] w-auto" />
              <div className="h-8 w-px bg-gray-300"></div>
              <p className="text-sm text-gray-500 font-medium tracking-wide">upload, wish, send</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">{user?.email}</span>
              </div>
              <button
                onClick={onSettings}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
              >
                <SettingsIcon className="w-4 h-4" />
                <span className="hidden md:inline text-sm font-medium">Settings</span>
              </button>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Your Campaigns</h2>
            <p className="text-gray-500 mt-1.5 text-sm">
              Manage and track your email campaigns
            </p>
          </div>
          <button
            onClick={onNewCampaign}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-lg hover:shadow-xl shadow-blue-600/20 hover:shadow-blue-600/30"
          >
            <Plus className="w-5 h-5" />
            New Campaign
          </button>
        </div>

        {campaigns.length > 0 && (
          <div className="mb-7 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns by name, subject, or content..."
                className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-shadow text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <option value="all">All</option>
                  <option value="completed">Completed</option>
                  <option value="sending">Sending</option>
                  <option value="failed">Failed</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div className="h-6 w-px bg-gray-200"></div>

              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'performance')}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <option value="date">Recent</option>
                  <option value="name">Name</option>
                  <option value="performance">Performance</option>
                </select>
              </div>

              <div className="ml-auto text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
                {filteredCampaigns.length} of {campaigns.length} campaigns
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
            <p className="text-gray-500 mt-4 font-medium">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              No campaigns yet
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Create your first campaign to start sending personalized emails
            </p>
            <button
              onClick={onNewCampaign}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-5 h-5" />
              Create Your First Campaign
            </button>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              No campaigns found
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              No campaigns match your search query
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-600/20"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCampaigns.map((campaign) => {
              const isExpanded = expandedCampaigns.has(campaign.id);
              const hasFollowUps = (campaign.followUps?.length || 0) > 0;

              return (
                <div key={campaign.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-200 overflow-hidden group">
                  <div className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2.5">
                          <h3 className="text-xl font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {campaign.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {campaign.status === 'completed' && campaign.sent_count > 0 && (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                <Eye className="w-3.5 h-3.5" />
                                {campaign.openRate.toFixed(0)}%
                              </span>
                            )}
                            <span
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(
                                campaign.status
                              )}`}
                            >
                              {getStatusIcon(campaign.status)}
                              {campaign.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 truncate mb-3 font-medium">
                          {campaign.subject}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5" />
                            {campaign.status === 'completed' && campaign.sent_count > 0
                              ? `Sent ${new Date(campaign.created_at).toLocaleDateString()}`
                              : `Created ${new Date(campaign.created_at).toLocaleDateString()}`}
                          </span>
                          {hasFollowUps && (
                            <button
                              onClick={() => toggleCampaignExpanded(campaign.id)}
                              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                            >
                              <Reply className="w-3.5 h-3.5" />
                              {campaign.followUps!.length} follow-up{campaign.followUps!.length > 1 ? 's' : ''}
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setViewingEmail({ subject: campaign.subject, body: campaign.body })}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 active:scale-95 transition-all"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                        {campaign.status === 'completed' && campaign.sent_count > 0 && (
                          <button
                            onClick={() => onViewAnalytics(campaign.id, false)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/20"
                          >
                            <BarChart3 className="w-4 h-4" />
                            <span className="hidden sm:inline">Analytics</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4 mt-5 pt-5 border-t border-gray-100">
                      <div className="text-center">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Contacts</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {campaign.total_contacts}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Sent</p>
                        <p className="text-2xl font-bold text-green-600">
                          {campaign.sent_count}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Failed</p>
                        <p className="text-2xl font-bold text-red-600">
                          {campaign.failed_count}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Opened</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {campaign.uniqueOpens}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Total Opens</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {campaign.totalOpens}
                        </p>
                      </div>
                    </div>
                  </div>

                  {isExpanded && hasFollowUps && (
                    <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-t border-gray-200 px-6 py-5">
                      <h4 className="text-xs font-bold text-gray-600 mb-4 flex items-center gap-2 uppercase tracking-wider">
                        <Reply className="w-4 h-4" />
                        Follow-up Campaigns
                      </h4>
                      <div className="space-y-3">
                        {campaign.followUps!.map((followUp) => (
                          <div
                            key={followUp.id}
                            className="bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                          >
                            <div className="flex justify-between items-start gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="text-sm font-semibold text-gray-900 truncate">
                                    {followUp.name}
                                  </h5>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {followUp.status === 'completed' && followUp.sent_count > 0 && (
                                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                        <Eye className="w-3 h-3" />
                                        {followUp.openRate.toFixed(0)}%
                                      </span>
                                    )}
                                    <span
                                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                        followUp.status
                                      )}`}
                                    >
                                      {getStatusIcon(followUp.status)}
                                      {followUp.status}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600 truncate">
                                  {followUp.subject}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Filter: Opened ≥ {followUp.engagement_threshold}×
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => setViewingEmail({ subject: followUp.subject, body: followUp.body })}
                                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200 transition-colors"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                                {followUp.status === 'completed' && followUp.sent_count > 0 && (
                                  <button
                                    onClick={() => onViewAnalytics(followUp.id, true)}
                                    className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                                  >
                                    <BarChart3 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-5 gap-2 text-center pt-2 border-t border-gray-100">
                              <div>
                                <p className="text-xs text-gray-500">Selected</p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {followUp.total_selected}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Excluded</p>
                                <p className="text-sm font-semibold text-red-600">
                                  {followUp.total_excluded}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Sent</p>
                                <p className="text-sm font-semibold text-green-600">
                                  {followUp.sent_count}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Opened</p>
                                <p className="text-sm font-semibold text-blue-600">
                                  {followUp.uniqueOpens}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Total</p>
                                <p className="text-sm font-semibold text-orange-600">
                                  {followUp.totalOpens}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewingEmail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="text-2xl font-bold text-gray-900">Email Template</h3>
              <button
                onClick={() => setViewingEmail(null)}
                className="text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg p-2 transition-all"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">Subject:</label>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 font-medium text-gray-900">
                  {viewingEmail.subject}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">Body:</label>
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 whitespace-pre-wrap text-gray-900 leading-relaxed">
                  {viewingEmail.body}
                </div>
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800 leading-relaxed">
                  <strong className="font-semibold">Note:</strong> This is the template with placeholders like [First Name] and [Company].
                  Each recipient received a personalized version with their actual information.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
