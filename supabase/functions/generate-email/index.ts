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
    const { description, profile } = await req.json();

    if (!description) {
      return new Response(
        JSON.stringify({ error: 'Description is required' }),
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
      contextSection += `\n\nUse this context to write a more relevant and personalized email.`;
      
      if (profile.full_name) availableTags.push('[Your Name]');
      if (profile.job_title) availableTags.push('[Your Title]');
      if (profile.company_name) availableTags.push('[Your Company]');
      if (profile.phone) availableTags.push('[Your Phone]');
      if (profile.website) availableTags.push('[Your Website]');
    }

    const tagsInstruction = availableTags.length > 2 
      ? `\n  ONLY use these placeholders (DO NOT use any others):\n  ${availableTags.join(', ')}`
      : `\n  ONLY use [First Name] and [Company] for recipient info (DO NOT use any sender placeholders)`;

    const prompt = `You are an expert email writer. Write a professional, personalized sales email based on the following description:

${description}${contextSection}

PROVEN HIGH-PERFORMANCE RULES (strictly follow these):

1. SUBJECT LINE:
   - Keep under 50 characters (23% higher open rates)
   - Be specific and relevant, avoid generic phrases

2. EMAIL STRUCTURE (best-performing format):
   - Line 1: Personalized observation about their company (1 sentence)
   - Lines 2-3: Relevant pain point or opportunity (1-2 sentences)
   - Line 4: Brief value statement (1 sentence)
   - Line 5: Soft question-based CTA (1 sentence)
   - TOTAL: Keep under 125 words (performance drops after this)

3. WHAT TO AVOID (low performance patterns):
   - NEVER use "I hope this email finds you well" or similar generic openings (2% reply rate)
   - NO multiple asks in one email (stick to ONE clear ask)
   - NO emails over 150 words
   - Avoid lengthy explanations

4. OPTIMIZATION TACTICS:
   - Mention specific pain points (18% more replies)
   - Personalize the first sentence (31% higher engagement)
   - Use questions as CTAs instead of statements (15% better performance)
   - Example: "Would you be open to..." instead of "Let's schedule..."

5. PERSONALIZATION:
   - Use placeholders:${tagsInstruction}
   - CRITICAL: Only use the placeholders listed above. Do not invent or use placeholders that are not in the list.

6. GENERAL:
   - DO NOT include a signature (the user will add their own)
   - Write like a real person, not a marketing robot
   - DO NOT ask for more information or refuse to write the email. Write the best email you can with the information provided.

Return your response as JSON with two fields:
1. "subject": A compelling subject line (under 50 characters)
2. "body": The email body (under 125 words, no signature)

Example format:
{
  "subject": "Quick question about [Company]'s growth",
  "body": "Hi [First Name],\\n\\nI noticed [Company] recently expanded into new markets - impressive growth.\\n\\nMany companies at this stage struggle with scaling their customer outreach while maintaining personalization. It becomes a major bottleneck.\\n\\nWe help companies like yours automate personalized outreach, typically seeing 3x more qualified conversations.\\n\\nWould you be open to a quick 15-minute call to explore if this could help [Company]?"
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
      throw new Error('Failed to generate email');
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
        subject: 'Follow-up',
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