import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AcumbamailAPI } from '@/lib/acumbamail';

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

  const { listId, subject, htmlContent, campaignName } = await request.json();

  if (!listId || !subject || !htmlContent || !campaignName) {
    return NextResponse.json({ 
      success: false, 
      error: 'Alle felter er påkrævet for test email' 
    }, { status: 400 });
  }

  try {
    // Get the list to validate it exists and get subscribers
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

    // Get subscribers from the list
    const subscribers = await prisma.subscriber.findMany({
      where: { 
        listId: list.id,
        userId: session.user.id 
      }
    });

    if (subscribers.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Ingen abonnenter fundet i den valgte liste' 
      }, { status: 400 });
    }

    console.log(`Found ${subscribers.length} subscribers in list ${list.name}`);

    // Create test campaign in database
    const campaign = await prisma.emailCampaign.create({
      data: {
        acumbamailCampaignId: `test-${Date.now()}`, // Generate unique test campaign ID
        name: `TEST: ${campaignName}`,
        subject: `TEST: ${subject}`,
        status: 'draft', // Add required status field
        listId,
        templateId: null,
        targetAllSubscribers: true,
        targetSpecificSubscribers: null,
        targetFilters: null,
        userId: session.user.id
      }
    });

    // Send test campaign via Acumbamail API
    const acumbamail = new AcumbamailAPI(user.acumbamailAuthToken);
    
    const campaignResult = await acumbamail.createCampaign(
      list.acumbamailListId, // listId parameter
      `TEST: ${subject}`, // subject parameter
      htmlContent, // htmlContent parameter
      `TEST: ${campaignName}` // campaignName parameter
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
        message: campaignResult.data.message || `Test email oprettet succesfuldt til ${subscribers.length} abonnenter i listen "${list.name}"`,
        campaign: {
          ...campaign,
          status: wasSent ? 'sent' : 'draft',
          sentAt: wasSent ? new Date() : null
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: campaignResult.error || 'Kunne ikke sende test email via Acumbamail'
      });
    }

  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Der opstod en fejl under afsendelse af test email' 
    }, { status: 500 });
  }
}