import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const TRANSPARENT_GIF = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0));

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const trackingPixelId = url.searchParams.get('id');

    if (!trackingPixelId) {
      return new Response(TRANSPARENT_GIF, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Expires': '0',
        },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: emailLog, error: logError } = await supabase
      .from('email_logs')
      .select('id, campaign_id, contact_id, user_id, opened_count, first_opened_at, follow_up_campaign_id')
      .eq('tracking_pixel_id', trackingPixelId)
      .maybeSingle();

    if (logError || !emailLog) {
      console.error('Email log not found:', logError);
      return new Response(TRANSPARENT_GIF, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Expires': '0',
        },
      });
    }

    const openedAt = new Date().toISOString();

    const emailOpenData: any = {
      email_log_id: emailLog.id,
      campaign_id: emailLog.campaign_id,
      contact_id: emailLog.contact_id,
      user_id: emailLog.user_id,
      opened_at: openedAt,
    };

    if (emailLog.follow_up_campaign_id) {
      emailOpenData.follow_up_campaign_id = emailLog.follow_up_campaign_id;
    }

    await supabase.from('email_opens').insert(emailOpenData);

    const updateData: any = {
      opened_count: (emailLog.opened_count || 0) + 1,
      last_opened_at: openedAt,
    };

    if (!emailLog.first_opened_at) {
      updateData.first_opened_at = openedAt;
    }

    await supabase
      .from('email_logs')
      .update(updateData)
      .eq('id', emailLog.id);

    return new Response(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('Error tracking email open:', error);
    return new Response(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Expires': '0',
      },
    });
  }
});