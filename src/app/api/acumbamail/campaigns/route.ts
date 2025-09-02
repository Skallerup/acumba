import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AcumbamailAPI } from '@/lib/acumbamail';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  try {
    const campaigns = await prisma.emailCampaign.findMany({
      where: { userId: session.user.id },
      include: {
        list: true,
        template: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ 
      error: 'Der opstod en fejl under hentning af kampagner' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || !user.acumbamailAuthToken) {
    return NextResponse.json({ 
      success: false, 
      error: 'Acumbamail ikke konfigureret' 
    }, { status: 400 });
  }

  const { 
    name, 
    subject, 
    htmlContent, 
    listId, 
    templateId, 
    targetAllSubscribers,
    targetSpecificSubscribers,
    targetFilters 
  } = await request.json();

  if (!name || !subject || !listId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Navn, emne og liste er påkrævet' 
    }, { status: 400 });
  }

  if (!htmlContent && !templateId) {
    return NextResponse.json({ 
      success: false, 
      error: 'HTML indhold eller template er påkrævet' 
    }, { status: 400 });
  }

  try {
    // Get the list to validate it exists
    const list = await prisma.acumbamailList.findFirst({
      where: { 
        id: listId,
        userId: session.user.id 
      }
    });

    if (!list) {
      return NextResponse.json({ 
        success: false, 
        error: 'Liste ikke fundet' 
      }, { status: 404 });
    }

    // Get template content if templateId is provided
    let finalHtmlContent = htmlContent;
    console.log(`Campaign creation - templateId: ${templateId}, htmlContent length: ${htmlContent?.length || 0}`);
    
    if (templateId) {
      const template = await prisma.emailTemplate.findFirst({
        where: { 
          id: templateId,
          userId: session.user.id 
        }
      });
      
      if (template) {
        finalHtmlContent = template.htmlContent;
        console.log(`Using template: ${template.name} with content length: ${template.htmlContent.length}`);
        console.log(`Template HTML content preview: ${template.htmlContent.substring(0, 100)}...`);
      } else {
        console.log(`Template not found with ID: ${templateId}`);
      }
    } else {
      console.log('No templateId provided, using htmlContent');
    }

    console.log('Original HTML content:', htmlContent);

    // Ensure we have valid HTML content - provide fallback if empty
    if (!finalHtmlContent || finalHtmlContent.trim() === '') {
      console.log('HTML content is empty, using fallback template');
      finalHtmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #2c3e50;">${subject}</h1>
              <p>Dette er en test email fra Bandageshoppen.</p>
              <p>Hvis du modtager denne email, fungerer systemet korrekt.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #666; text-align: center;">
                Sendt fra Bandageshoppen - kontakt@bandageshoppen.dk<br>
                <a href="*|UNSUB|*" style="color: #666; text-decoration: underline;">Afmeld mig</a>
              </p>
            </div>
          </body>
        </html>
      `;
    }

    console.log('Final HTML content being sent:', finalHtmlContent);

    // Create campaign in database
    const campaign = await prisma.emailCampaign.create({
      data: {
        acumbamailCampaignId: `temp-${Date.now()}`, // Temporary ID, will be updated after Acumbamail creation
        name,
        subject,
        status: 'draft', // Required field
        listId,
        templateId: templateId || null,
        targetAllSubscribers: targetAllSubscribers || false,
        targetSpecificSubscribers: targetSpecificSubscribers || null, // Should be String, not Boolean
        targetFilters: targetFilters ? JSON.stringify(targetFilters) : null,
        userId: session.user.id
      }
    });

    // Send campaign via Acumbamail API
    const acumbamail = new AcumbamailAPI(user.acumbamailAuthToken);
    
    const campaignResult = await acumbamail.createCampaign(
      list.acumbamailListId, // listId parameter
      subject, // subject parameter
      finalHtmlContent, // htmlContent parameter
      name // campaignName parameter
    );

    if (campaignResult.success) {
      // Update campaign status based on whether it was actually sent
      const wasSent = !campaignResult.data.requiresManualSend;
      
      await prisma.emailCampaign.update({
        where: { id: campaign.id },
        data: { 
          status: wasSent ? 'sent' : 'draft',
          sentAt: wasSent ? new Date() : null,
          acumbamailCampaignId: campaignResult.data.campaignId
        }
      });

      return NextResponse.json({
        success: true,
        message: campaignResult.data.message || 'Kampagne oprettet succesfuldt',
        campaign: {
          ...campaign,
          status: wasSent ? 'sent' : 'draft',
          sentAt: wasSent ? new Date() : null
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: campaignResult.error || 'Kunne ikke sende kampagne via Acumbamail'
      });
    }

  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Der opstod en fejl under oprettelse af kampagne' 
    }, { status: 500 });
  }
}