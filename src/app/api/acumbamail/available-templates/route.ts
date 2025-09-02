import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { AcumbamailAPI } from '@/lib/acumbamail';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 });
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
    
    // Get templates from Acumbamail
    const templatesResult = await acumbamail.getTemplates();
    
    if (templatesResult.success && templatesResult.data) {
      const templatesData = templatesResult.data;
      
      // Filter only available templates and format them
      const availableTemplates = Array.isArray(templatesData) 
        ? templatesData
            .filter(template => template.available === true)
            .map(template => ({
              id: template.id,
              name: template.name,
              available: template.available
            }))
        : [];

      return NextResponse.json({
        success: true,
        templates: availableTemplates
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Kunne ikke hente templates fra Acumbamail'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Available templates error:', error);
    return NextResponse.json({ 
      error: "Der opstod en fejl under hentning af templates",
      details: error instanceof Error ? error.message : "Ukendt fejl"
    }, { status: 500 });
  }
}
