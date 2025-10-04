import { UserProfile } from './supabase';

export interface SignatureOptions {
  includeLogo: boolean;
  logoUrl?: string;
}

export function generateSignatureHTML(
  profile: UserProfile,
  options: SignatureOptions
): string {
  if (!profile.signature_enabled) {
    return '';
  }

  const hasAnyField =
    profile.signature_name ||
    profile.signature_title ||
    profile.signature_phone ||
    profile.signature_email ||
    profile.signature_website ||
    profile.signature_linkedin ||
    profile.signature_custom_text;

  if (!hasAnyField && !options.includeLogo) {
    return '';
  }

  const parts: string[] = [];

  parts.push('<div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-family: Arial, sans-serif; color: #374151; font-size: 14px; line-height: 1.6;">');

  if (options.includeLogo && options.logoUrl && profile.logo_enabled) {
    const logoSizes = {
      small: '100px',
      medium: '150px',
      large: '200px'
    };
    const logoPaddings = {
      none: '0px',
      small: '5px',
      medium: '10px',
      large: '15px'
    };
    const maxWidth = logoSizes[profile.logo_size || 'medium'];
    const padding = logoPaddings[profile.logo_padding || 'medium'];

    parts.push(
      `<div style="margin-bottom: 15px;">
        <img src="${options.logoUrl}" alt="Company Logo" style="max-width: ${maxWidth}; height: auto; padding: ${padding};" />
      </div>`
    );
  }

  if (profile.signature_name) {
    parts.push(
      `<div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px;">
        ${escapeHtml(profile.signature_name)}
      </div>`
    );
  }

  if (profile.signature_title) {
    parts.push(
      `<div style="color: #6b7280; margin-bottom: 8px;">
        ${escapeHtml(profile.signature_title)}
      </div>`
    );
  }

  if (profile.signature_custom_text) {
    parts.push(
      `<div style="margin-bottom: 12px; font-style: italic; color: #4b5563;">
        ${escapeHtml(profile.signature_custom_text)}
      </div>`
    );
  }

  const contactParts: string[] = [];

  if (profile.signature_phone) {
    contactParts.push(
      `<div style="margin-bottom: 4px;">
        <span style="color: #6b7280;">Phone:</span>
        <a href="tel:${escapeHtml(profile.signature_phone)}" style="color: #2563eb; text-decoration: none;">
          ${escapeHtml(profile.signature_phone)}
        </a>
      </div>`
    );
  }

  if (profile.signature_email) {
    contactParts.push(
      `<div style="margin-bottom: 4px;">
        <span style="color: #6b7280;">Email:</span>
        <a href="mailto:${escapeHtml(profile.signature_email)}" style="color: #2563eb; text-decoration: none;">
          ${escapeHtml(profile.signature_email)}
        </a>
      </div>`
    );
  }

  if (profile.signature_website) {
    const websiteUrl = profile.signature_website.startsWith('http')
      ? profile.signature_website
      : `https://${profile.signature_website}`;

    contactParts.push(
      `<div style="margin-bottom: 4px;">
        <span style="color: #6b7280;">Website:</span>
        <a href="${escapeHtml(websiteUrl)}" style="color: #2563eb; text-decoration: none;">
          ${escapeHtml(profile.signature_website)}
        </a>
      </div>`
    );
  }

  if (profile.signature_linkedin) {
    const linkedinUrl = profile.signature_linkedin.startsWith('http')
      ? profile.signature_linkedin
      : `https://linkedin.com/in/${profile.signature_linkedin}`;

    contactParts.push(
      `<div style="margin-bottom: 4px;">
        <span style="color: #6b7280;">LinkedIn:</span>
        <a href="${escapeHtml(linkedinUrl)}" style="color: #2563eb; text-decoration: none;">
          ${escapeHtml(profile.signature_linkedin)}
        </a>
      </div>`
    );
  }

  if (contactParts.length > 0) {
    parts.push(`<div style="margin-top: 10px;">${contactParts.join('')}</div>`);
  }

  parts.push('</div>');

  return parts.join('\n');
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
