import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Landing } from './components/Landing';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { CampaignBuilder } from './components/CampaignBuilder';
import { Settings } from './components/Settings';
import { CampaignAnalytics } from './components/CampaignAnalytics';
import { FollowUpAnalytics } from './components/FollowUpAnalytics';

type View = 'landing' | 'auth' | 'dashboard' | 'campaign' | 'settings' | 'analytics' | 'followUpAnalytics';

function AppContent() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>('landing');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedFollowUpCampaignId, setSelectedFollowUpCampaignId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (view === 'landing') {
      return <Landing onGetStarted={() => setView('auth')} />;
    }
    return <Auth />;
  }

  if (view === 'campaign') {
    return <CampaignBuilder onBack={() => setView('dashboard')} />;
  }

  if (view === 'settings') {
    return <Settings onBack={() => setView('dashboard')} />;
  }

  if (view === 'analytics' && selectedCampaignId) {
    return (
      <CampaignAnalytics
        campaignId={selectedCampaignId}
        onBack={() => {
          setView('dashboard');
          setSelectedCampaignId(null);
        }}
      />
    );
  }

  if (view === 'followUpAnalytics' && selectedFollowUpCampaignId) {
    return (
      <FollowUpAnalytics
        followUpCampaignId={selectedFollowUpCampaignId}
        onBack={() => {
          setView('dashboard');
          setSelectedFollowUpCampaignId(null);
        }}
      />
    );
  }

  return (
    <Dashboard
      onNewCampaign={() => setView('campaign')}
      onSettings={() => setView('settings')}
      onViewAnalytics={(campaignId, isFollowUp) => {
        if (isFollowUp) {
          setSelectedFollowUpCampaignId(campaignId);
          setView('followUpAnalytics');
        } else {
          setSelectedCampaignId(campaignId);
          setView('analytics');
        }
      }}
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
