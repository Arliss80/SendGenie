import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { originalCampaign, userInstructions, engagementThreshold, selectedCount, profile } = await req.json();

    if (!userInstructions || !originalCampaign) {
      return new Response(
        JSON.stringify({ error: 'User instructions and original campaign are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let contextSection = '';
    const availableTags: string[] = ['[First Name]', '[Company]'];
    
    if (profile) {
      contextSection = `\n\nCONTEXT ABOUT THE SENDER:`;
      if (profile.what_you_do) contextSection += `\nWhat they do: ${profile.what_you_do}`;
      if (profile.product_description) contextSection += `\nProduct/Service: ${profile.product_description}`;
      if (profile.value_proposition) contextSection += `\nValue Proposition: ${profile.value_proposition}`;
      if (profile.target_audience) contextSection += `\nTarget Audience: ${profile.target_audience}`;
      if (profile.campaign_goals) contextSection += `\nCampaign Goals: ${profile.campaign_goals}`;
      contextSection += `\n\nUse this context to write a more relevant and personalized follow-up email.`;
      
      if (profile.full_name) availableTags.push('[Your Name]');
      if (profile.job_title) availableTags.push('[Your Title]');
      if (profile.company_name) availableTags.push('[Your Company]');
      if (profile.phone) availableTags.push('[Your Phone]');
      if (profile.website) availableTags.push('[Your Website]');
    }

    const tagsInstruction = availableTags.length > 2 
      ? `\n  ONLY use these placeholders (DO NOT use any others):\n  ${availableTags.join(', ')}`
      : `\n  ONLY use [First Name] and [Company] for recipient info (DO NOT use any sender placeholders)`;

    const prompt = `You are an expert email writer. Write a professional follow-up email based on the following context:

ORIGINAL CAMPAIGN:
- Campaign Name: ${originalCampaign.name}
- Original Subject: ${originalCampaign.subject}
- Original Message Preview: ${originalCampaign.body.substring(0, 300)}...

FOLLOW-UP CONTEXT:
- These ${selectedCount} recipients opened the original email at least ${engagementThreshold} times
- This indicates strong interest and engagement

USER INSTRUCTIONS FOR THIS FOLLOW-UP:
${userInstructions}${contextSection}

IMPORTANT REQUIREMENTS:
- Write like a real person following up naturally on the previous email
- Reference their engagement/interest without being too salesy
- Be concise and conversational (3-4 short paragraphs max)
- Work with whatever context is available - if you have sender context, use it to make the email more relevant. If not, write a good follow-up email anyway.
- Use placeholders for personalization:${tagsInstruction}
- Follow the user's specific instructions above
- Include a clear call-to-action
- DO NOT include a signature (the user will add their own)
- CRITICAL: Only use the placeholders listed above. Do not invent or use placeholders that are not in the list.
- DO NOT ask for more information or refuse to write the email. Write the best follow-up you can with the information provided.

Return your response as JSON with two fields:
1. "subject": A compelling subject line that relates to the original email (5-8 words)
2. "body": The email body (without signature)

Example format:
{
  "subject": "Following up on [Company]'s growth",
  "body": "Hi [First Name],\\n\\nI noticed you opened my email about...\\n\\nWould you be open to a quick call?"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Anthropic API error:', error);
      throw new Error('Failed to generate follow-up email');
    }

    const data = await response.json();
    const content = data.content[0].text;

    let emailData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        emailData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      emailData = {
        subject: 'Following up',
        body: content,
      };
    }

    return new Response(
      JSON.stringify(emailData),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});