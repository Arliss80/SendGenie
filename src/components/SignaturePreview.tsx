import { UserProfile } from '../lib/supabase';
import { generateSignatureHTML } from '../lib/signatureGenerator';
import { Eye } from 'lucide-react';

interface SignaturePreviewProps {
  profile: Partial<UserProfile>;
}

export function SignaturePreview({ profile }: SignaturePreviewProps) {
  const hasSignatureFields =
    profile.signature_name ||
    profile.signature_title ||
    profile.signature_phone ||
    profile.signature_email ||
    profile.signature_website ||
    profile.signature_linkedin ||
    profile.signature_custom_text;

  const hasLogo = profile.company_logo_url && profile.logo_enabled;

  const signatureHTML = generateSignatureHTML(profile as UserProfile, {
    includeLogo: true,
    logoUrl: profile.company_logo_url || '',
  });

  if (!profile.signature_enabled || (!hasSignatureFields && !hasLogo)) {
    return (
      <div className="mt-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-5 h-5 text-gray-600" />
          <h4 className="text-sm font-semibold text-gray-900">Signature Preview</h4>
        </div>
        <p className="text-sm text-gray-500 italic">
          {!profile.signature_enabled
            ? 'Enable signature above to see preview'
            : 'Add signature fields above to see preview'}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-5 h-5 text-gray-600" />
        <h4 className="text-sm font-semibold text-gray-900">Signature Preview</h4>
      </div>
      <div className="bg-white p-4 rounded border border-gray-200">
        <div className="text-sm text-gray-700 mb-2">
          This is your email content...
        </div>
        <div dangerouslySetInnerHTML={{ __html: signatureHTML }} />
      </div>
      <p className="text-xs text-gray-500 mt-3">
        This is how your signature will appear at the end of campaign emails
      </p>
    </div>
  );
}
