import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 });
    }

    const { prompt } = await request.json();
    console.log('AI Template Generation Request:', { prompt });

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ 
        error: 'Beskrivelse af template er påkrævet' 
      }, { status: 400 });
    }

    // Check if OpenAI API key is configured
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ 
        error: 'OpenAI API nøgle er ikke konfigureret' 
      }, { status: 500 });
    }

    // Create the system prompt for email template generation
    const systemPrompt = `Du er en ekspert i HTML email template design. Din opgave er at generere komplet HTML kode for email templates baseret på brugerens beskrivelse.

VIGTIGE RETNINGSLINJER:
1. Generer kun HTML kode - ingen forklaringer eller markdown
2. Brug inline CSS styling (email klienter understøtter ikke eksterne stylesheets)
3. Sørg for at HTML'en er responsiv og fungerer i alle email klienter
4. Inkluder altid en proper HTML struktur med <html>, <head>, og <body> tags
5. Brug table-baseret layout for bedre email klient kompatibilitet
6. Inkluder altid Bandageshoppen branding (kontakt@bandageshoppen.dk)
7. Gør designet professionelt og moderne
8. Inkluder call-to-action knapper med proper styling
9. Brug dansk sprog i indholdet
10. Sørg for at farver og styling matcher Bandageshoppen's brand
11. AFMELD LINK: Acumbamail tilføjer automatisk afmeld links, men du skal inkludere "Afmeld mig" tekst i footeren. Acumbamail erstatter automatisk denne tekst med det rigtige afmeld link når emailen sendes.

EKSEMPEL PÅ GOD HTML STRUKTUR:
\`\`\`html
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 20px;">
              <!-- Email content here -->
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #666; text-align: center;">
                Sendt fra Bandageshoppen - kontakt@bandageshoppen.dk<br>
                <a href="#" style="color: #666; text-decoration: underline;">Afmeld mig</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
\`\`\`

Generer nu HTML kode baseret på denne beskrivelse:`;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Using GPT-4o (latest model)
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      console.error('OpenAI Response status:', openaiResponse.status);
      console.error('OpenAI Response headers:', openaiResponse.headers);
      return NextResponse.json({ 
        error: `OpenAI API fejl: ${errorData.error?.message || 'Ukendt fejl'}` 
      }, { status: 500 });
    }

    const openaiData = await openaiResponse.json();
    console.log('OpenAI Response:', openaiData);
    
    const rawContent = openaiData.choices[0]?.message?.content?.trim();
    console.log('Raw AI Content:', rawContent);
    
    // Remove markdown code block markers if present
    let htmlContent = rawContent;
    if (htmlContent.startsWith('```html')) {
      htmlContent = htmlContent.replace(/^```html\s*/, '');
    }
    if (htmlContent.startsWith('```')) {
      htmlContent = htmlContent.replace(/^```\s*/, '');
    }
    if (htmlContent.endsWith('```')) {
      htmlContent = htmlContent.replace(/\s*```$/, '');
    }
    
    htmlContent = htmlContent.trim();
    console.log('Cleaned HTML Content:', htmlContent);

    if (!htmlContent) {
      return NextResponse.json({ 
        error: 'AI kunne ikke generere HTML kode' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      htmlContent: htmlContent,
      message: 'HTML template genereret succesfuldt'
    });

  } catch (error) {
    console.error('AI template generation error:', error);
    return NextResponse.json({ 
      error: "Der opstod en fejl under AI generering",
      details: error instanceof Error ? error.message : "Ukendt fejl"
    }, { status: 500 });
  }
}
