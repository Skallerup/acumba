import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { AcumbamailAPI } from '@/lib/acumbamail';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 });
    }

    const { templateIds } = await request.json();

    if (!templateIds || !Array.isArray(templateIds) || templateIds.length === 0) {
      return NextResponse.json({ 
        error: 'Ingen template IDs angivet' 
      }, { status: 400 });
    }

    // Get user with auth token
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { acumbamailAuthToken: true }
    });

    if (!user?.acumbamailAuthToken) {
      return NextResponse.json({ 
        error: "Acumbamail ikke konfigureret" 
      }, { status: 400 });
    }

    const acumbamail = new AcumbamailAPI(user.acumbamailAuthToken);
    
    // Get templates from Acumbamail to get their names
    const templatesResult = await acumbamail.getTemplates();
    
    if (!templatesResult.success || !templatesResult.data) {
      return NextResponse.json({
        success: false,
        error: 'Kunne ikke hente templates fra Acumbamail'
      }, { status: 500 });
    }

    const templatesData = templatesResult.data;
    const allTemplates = Array.isArray(templatesData) ? templatesData : [];
    
    let importedCount = 0;
    const errors: string[] = [];

    for (const templateId of templateIds) {
      try {
        // Find the template in Acumbamail data
        const acumbamailTemplate = allTemplates.find(t => t.id.toString() === templateId.toString());
        
        if (!acumbamailTemplate) {
          errors.push(`Template med ID ${templateId} ikke fundet`);
          continue;
        }

        // Check if template already exists locally
        const existingTemplate = await prisma.emailTemplate.findFirst({
          where: { 
            userId: session.user.id,
            name: acumbamailTemplate.name
          }
        });
        
        if (existingTemplate) {
          errors.push(`Template "${acumbamailTemplate.name}" eksisterer allerede`);
          continue;
        }

        // Try to get HTML content for this template
        let htmlContent = '';
        try {
          const templateResult = await acumbamail.getTemplate(templateId);
          if (templateResult.success && templateResult.data) {
            htmlContent = templateResult.data.html_content || templateResult.data.content || '';
            console.log(`Retrieved HTML content for template ${acumbamailTemplate.name}: ${htmlContent.length} characters`);
          }
        } catch (error) {
          console.log(`Could not retrieve HTML content for template ${acumbamailTemplate.name}:`, error);
        }

        // Create new template
        await prisma.emailTemplate.create({
          data: {
            acumbamailTemplateId: templateId,
            name: acumbamailTemplate.name,
            description: `Importeret fra Acumbamail: ${acumbamailTemplate.name}`,
            htmlContent: htmlContent,
            category: 'imported',
            userId: session.user.id
          }
        });
        
        importedCount++;
      } catch (error) {
        console.error(`Error importing template ${templateId}:`, error);
        errors.push(`Fejl ved import af template ${templateId}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Importeret ${importedCount} templates succesfuldt${errors.length > 0 ? ` (${errors.length} fejl)` : ''}`
    });

  } catch (error) {
    console.error('Import templates error:', error);
    return NextResponse.json({ 
      error: "Der opstod en fejl under import af templates",
      details: error instanceof Error ? error.message : "Ukendt fejl"
    }, { status: 500 });
  }
}
