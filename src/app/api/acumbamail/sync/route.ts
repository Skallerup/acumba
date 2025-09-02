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

  const acumbamail = new AcumbamailAPI(user.acumbamailAuthToken);

  try {
    const syncResults = {
      lists: { updated: 0, created: 0 },
      subscribers: { updated: 0, created: 0 },
      templates: { updated: 0, created: 0 },
      campaigns: { updated: 0, created: 0 }
    };

    // 1. Sync Lists
    console.log("Syncing lists...");
    try {
      const listsResult = await acumbamail.getLists();
      if (listsResult.success && listsResult.data) {
        const listsData = listsResult.data;
        
        // Convert object to array of lists
        const lists = Object.entries(listsData).map(([id, list]) => ({
          id: id,
          name: list.name,
          description: list.description || ''
        }));
        
        for (const list of lists) {
          // Check if list already exists
          const existingList = await prisma.acumbamailList.findFirst({
            where: { 
              userId: session.user.id,
              acumbamailListId: String(list.id)
            }
          });
          
          if (!existingList) {
            // Create new list
            await prisma.acumbamailList.create({
              data: {
                acumbamailListId: String(list.id),
                name: String(list.name),
                description: String(list.description),
                userId: session.user.id
              }
            });
            syncResults.lists.created++;
          }
        }
      }
    } catch (error) {
      console.error("Error syncing lists:", error);
      // Lists sync is optional, don't fail the whole sync
    }

    // 2. Sync Subscribers for each list
    console.log("Syncing subscribers...");
    try {
      // Get all lists from database
      const localLists = await prisma.acumbamailList.findMany({
        where: { userId: session.user.id }
      });

      for (const list of localLists) {
        console.log(`Syncing subscribers for list: ${list.name} (ID: ${list.acumbamailListId})`);
        
        // Get subscribers for this list from Acumbamail
        const subscribersResult = await acumbamail.getSubscribers(list.acumbamailListId);
        
        if (subscribersResult.success && subscribersResult.data) {
          const subscribersData = subscribersResult.data;
          
          // Convert object to array of subscribers
          const subscribers = Object.entries(subscribersData).map(([id, subscriber]) => ({
            id: id,
            email: subscriber.email,
            firstName: subscriber.first_name || null,
            lastName: subscriber.last_name || null,
            status: subscriber.status || 'active'
          }));
          
          for (const subscriber of subscribers) {
            // Check if subscriber already exists
            const existingSubscriber = await prisma.subscriber.findFirst({
              where: { 
                userId: session.user.id,
                acumbamailSubscriberId: String(subscriber.id)
              }
            });
            
            if (!existingSubscriber) {
              // Create new subscriber
              await prisma.subscriber.create({
                data: {
                  acumbamailSubscriberId: String(subscriber.id),
                  email: String(subscriber.email),
                  firstName: subscriber.firstName,
                  lastName: subscriber.lastName,
                  status: String(subscriber.status),
                  userId: session.user.id,
                  listId: list.id
                }
              });
              syncResults.subscribers.created++;
            } else {
              // Update existing subscriber
              await prisma.subscriber.update({
                where: { id: existingSubscriber.id },
                data: {
                  email: String(subscriber.email),
                  firstName: subscriber.firstName,
                  lastName: subscriber.lastName,
                  status: String(subscriber.status)
                }
              });
              syncResults.subscribers.updated++;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error syncing subscribers:", error);
    }

    // 3. Sync Templates (if Acumbamail API supports it)
    console.log("Syncing templates...");
    try {
      const templatesResult = await acumbamail.getTemplates();
      if (templatesResult.success && templatesResult.data) {
        const templatesData = templatesResult.data;
        console.log(`Raw templates data type: ${typeof templatesData}, isArray: ${Array.isArray(templatesData)}`);
        console.log(`Total templates received: ${Array.isArray(templatesData) ? templatesData.length : 'Not an array'}`);
        
        // Convert array of objects to array of templates (only available ones)
        const templates = Array.isArray(templatesData) 
          ? templatesData
              .filter(template => {
                const isAvailable = template.available === true;
                console.log(`Template ${template.name} (ID: ${template.id}) - available: ${template.available}`);
                return isAvailable;
              }) // Only import available templates
              .map(template => ({
                id: template.id,
                name: template.name,
                description: `Imported from Acumbamail: ${template.name}`,
                htmlContent: '', // We don't get HTML content from getTemplates
                category: 'imported'
              }))
          : [];
        
        console.log(`Filtered templates count: ${templates.length}`);
        
        for (const template of templates) {
          // Check if template already exists
          const existingTemplate = await prisma.emailTemplate.findFirst({
            where: { 
              userId: session.user.id,
              acumbamailTemplateId: String(template.id)
            }
          });
          
          // Try to get HTML content for this template
          let htmlContent = '';
          try {
            const templateResult = await acumbamail.getTemplate(String(template.id));
            if (templateResult.success && templateResult.data) {
              htmlContent = templateResult.data.html_content || templateResult.data.content || '';
              console.log(`Retrieved HTML content for template ${template.name}: ${htmlContent.length} characters`);
            }
          } catch (error) {
            console.log(`Could not retrieve HTML content for template ${template.name}:`, error);
          }
          
          if (!existingTemplate) {
            // Create new template
            await prisma.emailTemplate.create({
              data: {
                acumbamailTemplateId: String(template.id),
                name: String(template.name),
                description: String(template.description),
                htmlContent: htmlContent,
                category: String(template.category),
                userId: session.user.id
              }
            });
            syncResults.templates.created++;
          } else if (htmlContent && !existingTemplate.htmlContent) {
            // Update existing template with HTML content if it's missing
            await prisma.emailTemplate.update({
              where: { id: existingTemplate.id },
              data: { htmlContent: htmlContent }
            });
            syncResults.templates.updated++;
            console.log(`Updated template ${template.name} with HTML content`);
          }
        }
      }
    } catch (error) {
      console.error("Error syncing templates:", error);
      // Templates sync is optional, don't fail the whole sync
    }

    // 4. Sync Campaigns (if Acumbamail API supports it)
    console.log("Syncing campaigns...");
    try {
      const campaignsResult = await acumbamail.getCampaigns();
      if (campaignsResult.success && campaignsResult.data) {
        const campaignsData = campaignsResult.data;
        
        // Convert array of objects to array of campaigns
        // Acumbamail returns campaigns as array of objects like { "id": "name" }
        const campaigns = Array.isArray(campaignsData) ? campaignsData : [];
        
        for (const campaignObj of campaigns) {
          // Extract id and name from the object structure
          const campaignId = Object.keys(campaignObj)[0];
          const campaignName = Object.values(campaignObj)[0];
          
          // Check if campaign already exists
          const existingCampaign = await prisma.emailCampaign.findFirst({
            where: { 
              userId: session.user.id,
              acumbamailCampaignId: String(campaignId)
            }
          });
          
          if (!existingCampaign) {
            // Create new campaign
            await prisma.emailCampaign.create({
              data: {
                acumbamailCampaignId: String(campaignId),
                name: String(campaignName),
                subject: String(campaignName), // Use name as subject if no separate subject
                status: 'draft', // Default status
                sentAt: null,
                listId: null, // We don't have list relationship in this sync
                templateId: null,
                targetAllSubscribers: true,
                targetSpecificSubscribers: null,
                targetFilters: null,
                userId: session.user.id
              }
            });
            syncResults.campaigns.created++;
          }
        }
      }
    } catch (error) {
      console.error("Error syncing campaigns:", error);
      // Campaigns sync is optional, don't fail the whole sync
    }

    const totalCreated = syncResults.lists.created + syncResults.subscribers.created + syncResults.templates.created + syncResults.campaigns.created;
    const totalUpdated = syncResults.lists.updated + syncResults.subscribers.updated + syncResults.templates.updated + syncResults.campaigns.updated;

    return NextResponse.json({
      success: true,
      message: `Synkronisering fuldført. Oprettet: ${totalCreated} nye elementer. Opdateret: ${totalUpdated} eksisterende elementer.`,
      results: syncResults
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Der opstod en fejl under synkronisering' 
    }, { status: 500 });
  }
}