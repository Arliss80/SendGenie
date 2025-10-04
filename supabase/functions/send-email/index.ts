import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

function generateSignatureHTML(profile: any, options: { includeLogo: boolean; logoUrl: string }): string {
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
    const logoSizes: Record<string, string> = {
      small: '100px',
      medium: '150px',
      large: '200px'
    };
    const logoPaddings: Record<string, string> = {
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { to, subject, body, campaignId, contactId, trackingPixelId, followUpCampaignId } = await req.json();

    if (!to || !subject || !body || !campaignId || !contactId || !trackingPixelId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: 'SMTP settings not configured. Please configure your email settings first.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let campaignSettings: any = null;
    if (followUpCampaignId) {
      const { data } = await supabase
        .from('follow_up_campaigns')
        .select('include_signature, include_logo')
        .eq('id', followUpCampaignId)
        .maybeSingle();
      campaignSettings = data;
    } else {
      const { data } = await supabase
        .from('campaigns')
        .select('include_signature, include_logo')
        .eq('id', campaignId)
        .maybeSingle();
      campaignSettings = data;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    let htmlBody = body.replace(/\n/g, '<br>');

    if (profile && campaignSettings && campaignSettings.include_signature && profile.signature_enabled) {
      const signatureHtml = generateSignatureHTML(profile, {
        includeLogo: campaignSettings.include_logo && profile.logo_enabled,
        logoUrl: profile.company_logo_url || '',
      });
      htmlBody += signatureHtml;
    }

    const emailContent = [
      `From: ${settings.smtp_from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlBody,
    ].join('\r\n');

    const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const nodemailer = await import('npm:nodemailer@6.9.7');

    const transporter = nodemailer.default.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.smtp_port === 465,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_pass,
      },
    });

    try {
      await transporter.sendMail({
        from: settings.smtp_from,
        to: to,
        subject: subject,
        html: htmlBody,
      });
    } catch (smtpError: any) {
      console.error('SMTP error:', smtpError);

      const logData: any = {
        campaign_id: campaignId,
        contact_id: contactId,
        user_id: user.id,
        recipient_email: to,
        subject,
        body,
        status: 'failed',
        error_message: `SMTP error: ${smtpError.message}`,
        tracking_pixel_id: trackingPixelId,
      };
      
      if (followUpCampaignId) {
        logData.follow_up_campaign_id = followUpCampaignId;
      }

      await supabase.from('email_logs').insert(logData);

      throw new Error(`Failed to send email via SMTP: ${smtpError.message}`);
    }

    const logData: any = {
      campaign_id: campaignId,
      contact_id: contactId,
      user_id: user.id,
      recipient_email: to,
      subject,
      body,
      status: 'sent',
      sent_at: new Date().toISOString(),
      tracking_pixel_id: trackingPixelId,
    };
    
    if (followUpCampaignId) {
      logData.follow_up_campaign_id = followUpCampaignId;
    }

    await supabase.from('email_logs').insert(logData);

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
