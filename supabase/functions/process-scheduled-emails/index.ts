import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date().toISOString();

    const { data: scheduledCampaigns, error: campaignsError } = await supabaseClient
      .from("campaigns")
      .select("*")
      .eq("status", "scheduled")
      .eq("is_scheduled", true)
      .lte("scheduled_send_date", now);

    if (campaignsError) throw campaignsError;

    const { data: scheduledFollowUps, error: followUpsError } = await supabaseClient
      .from("follow_up_campaigns")
      .select("*")
      .eq("status", "scheduled")
      .eq("is_scheduled", true)
      .lte("scheduled_send_date", now);

    if (followUpsError) throw followUpsError;

    const results = {
      campaigns: [],
      followUps: [],
    };

    for (const campaign of scheduledCampaigns || []) {
      try {
        await supabaseClient
          .from("campaigns")
          .update({ status: "sending" })
          .eq("id", campaign.id);

        const { data: contacts, error: contactsError } = await supabaseClient
          .from("contacts")
          .select("*")
          .eq("campaign_id", campaign.id);

        if (contactsError) throw contactsError;

        const { data: userProfile, error: profileError } = await supabaseClient
          .from("user_profiles")
          .select("*")
          .eq("user_id", campaign.user_id)
          .maybeSingle();

        if (profileError) throw profileError;

        let sentCount = 0;
        let failedCount = 0;

        for (const contact of contacts || []) {
          try {
            const trackingPixelId = crypto.randomUUID();

            let personalizedBody = campaign.body
              .replace(/\[First Name\]/g, contact.first_name)
              .replace(/\[Company\]/g, contact.company || "your company");

            let personalizedSubject = campaign.subject
              .replace(/\[First Name\]/g, contact.first_name)
              .replace(/\[Company\]/g, contact.company || "your company");

            if (userProfile) {
              personalizedBody = personalizedBody
                .replace(/\[Your Name\]/g, userProfile.full_name || "")
                .replace(/\[Your Title\]/g, userProfile.job_title || "")
                .replace(/\[Your Company\]/g, userProfile.company_name || "")
                .replace(/\[Your Bio\]/g, userProfile.bio || "")
                .replace(/\[Your Phone\]/g, userProfile.phone || "")
                .replace(/\[Your Website\]/g, userProfile.website || "");

              personalizedSubject = personalizedSubject
                .replace(/\[Your Name\]/g, userProfile.full_name || "")
                .replace(/\[Your Title\]/g, userProfile.job_title || "")
                .replace(/\[Your Company\]/g, userProfile.company_name || "")
                .replace(/\[Your Bio\]/g, userProfile.bio || "")
                .replace(/\[Your Phone\]/g, userProfile.phone || "")
                .replace(/\[Your Website\]/g, userProfile.website || "");
            }

            const trackingPixelUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/track-email-open?id=${trackingPixelId}`;
            const trackingPixelHtml = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;" />`;

            personalizedBody = personalizedBody + trackingPixelHtml;

            const sendEmailUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`;
            const sendResponse = await fetch(sendEmailUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                to: contact.email,
                subject: personalizedSubject,
                body: personalizedBody,
                campaignId: campaign.id,
                contactId: contact.id,
                trackingPixelId: trackingPixelId,
              }),
            });

            if (sendResponse.ok) {
              sentCount++;
            } else {
              failedCount++;
            }
          } catch (error) {
            failedCount++;
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        await supabaseClient
          .from("campaigns")
          .update({
            status: failedCount === (contacts?.length || 0) ? "failed" : "completed",
            sent_count: sentCount,
            failed_count: failedCount,
          })
          .eq("id", campaign.id);

        (results.campaigns as any).push({ id: campaign.id, sent: sentCount, failed: failedCount });
      } catch (error) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
      }
    }

    for (const followUp of scheduledFollowUps || []) {
      try {
        await supabaseClient
          .from("follow_up_campaigns")
          .update({ status: "sending" })
          .eq("id", followUp.id);

        const { data: contacts, error: contactsError } = await supabaseClient
          .from("contacts")
          .select("*")
          .eq("campaign_id", followUp.campaign_id);

        if (contactsError) throw contactsError;

        const { data: exclusions, error: exclusionsError } = await supabaseClient
          .from("contact_exclusions")
          .select("contact_id")
          .eq("follow_up_campaign_id", followUp.id);

        if (exclusionsError) throw exclusionsError;

        const excludedIds = new Set((exclusions || []).map(e => e.contact_id));
        const selectedContacts = (contacts || []).filter(c => !excludedIds.has(c.id));

        const { data: userProfile, error: profileError } = await supabaseClient
          .from("user_profiles")
          .select("*")
          .eq("user_id", followUp.user_id)
          .maybeSingle();

        if (profileError) throw profileError;

        let sentCount = 0;
        let failedCount = 0;

        for (const contact of selectedContacts) {
          try {
            const trackingPixelId = crypto.randomUUID();

            let personalizedBody = followUp.body
              .replace(/\[First Name\]/g, contact.first_name)
              .replace(/\[Company\]/g, contact.company || "your company");

            let personalizedSubject = followUp.subject
              .replace(/\[First Name\]/g, contact.first_name)
              .replace(/\[Company\]/g, contact.company || "your company");

            if (userProfile) {
              personalizedBody = personalizedBody
                .replace(/\[Your Name\]/g, userProfile.full_name || "")
                .replace(/\[Your Title\]/g, userProfile.job_title || "")
                .replace(/\[Your Company\]/g, userProfile.company_name || "")
                .replace(/\[Your Bio\]/g, userProfile.bio || "")
                .replace(/\[Your Phone\]/g, userProfile.phone || "")
                .replace(/\[Your Website\]/g, userProfile.website || "");

              personalizedSubject = personalizedSubject
                .replace(/\[Your Name\]/g, userProfile.full_name || "")
                .replace(/\[Your Title\]/g, userProfile.job_title || "")
                .replace(/\[Your Company\]/g, userProfile.company_name || "")
                .replace(/\[Your Bio\]/g, userProfile.bio || "")
                .replace(/\[Your Phone\]/g, userProfile.phone || "")
                .replace(/\[Your Website\]/g, userProfile.website || "");
            }

            const trackingPixelUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/track-email-open?id=${trackingPixelId}`;
            const trackingPixelHtml = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;" />`;

            personalizedBody = personalizedBody + trackingPixelHtml;

            const sendEmailUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`;
            const sendResponse = await fetch(sendEmailUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                to: contact.email,
                subject: personalizedSubject,
                body: personalizedBody,
                campaignId: followUp.campaign_id,
                contactId: contact.id,
                trackingPixelId: trackingPixelId,
                followUpCampaignId: followUp.id,
              }),
            });

            if (sendResponse.ok) {
              sentCount++;
            } else {
              failedCount++;
            }
          } catch (error) {
            failedCount++;
          }

          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        await supabaseClient
          .from("follow_up_campaigns")
          .update({
            status: failedCount === selectedContacts.length ? "failed" : "completed",
            sent_count: sentCount,
            failed_count: failedCount,
          })
          .eq("id", followUp.id);

        (results.followUps as any).push({ id: followUp.id, sent: sentCount, failed: failedCount });
      } catch (error) {
        console.error(`Error processing follow-up ${followUp.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: {
          campaigns: (scheduledCampaigns || []).length,
          followUps: (scheduledFollowUps || []).length,
        },
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error processing scheduled emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});