import { Mail, Zap, Shield, TrendingUp } from 'lucide-react';

interface LandingProps {
  onGetStarted: () => void;
}

export function Landing({ onGetStarted }: LandingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img src="/SendGenie Logo Official.png" alt="SendGenie" className="h-[69px] w-auto" />
              <p className="text-base text-gray-600 font-medium">upload, wish, send</p>
            </div>
            <button
              onClick={onGetStarted}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Beta
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            AI-Powered Email Campaigns
            <br />
            <span className="text-blue-600">Made Simple</span>
          </h2>
          <p className="text-2xl text-blue-600 font-medium mb-4">
            Upload, Wish, Send
          </p>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Upload your contacts, let AI write personalized emails, and send hundreds
            of authentic messages in minutes. Perfect for sales teams who need speed
            without sacrificing quality.
          </p>
          <button
            onClick={onGetStarted}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Join Beta Program
          </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          <FeatureCard
            icon={<Mail className="w-8 h-8 text-blue-600" />}
            title="Upload & Go"
            description="Drop in your Excel file with contacts. We handle the rest automatically."
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8 text-blue-600" />}
            title="AI Generation"
            description="Claude AI writes authentic, personalized emails that don't sound like templates."
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8 text-blue-600" />}
            title="Professional Sending"
            description="Emails sent from your actual business address for maximum deliverability."
          />
          <FeatureCard
            icon={<TrendingUp className="w-8 h-8 text-blue-600" />}
            title="Track Results"
            description="Real-time status tracking for every email sent in your campaigns."
          />
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to 10x Your Outreach?
          </h3>
          <p className="text-gray-600 mb-8 text-lg">
            Join sales teams already using AI to close more deals.
          </p>
          <button
            onClick={onGetStarted}
            className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
          >
            Get Started Free
          </button>
        </div>
      </div>

      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2025 SendGenie. Beta Program.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
