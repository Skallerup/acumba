import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  try {
    const templates = await prisma.emailTemplate.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ 
      error: 'Der opstod en fejl under hentning af templates' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  const { name, description, htmlContent, category } = await request.json();

  if (!name || !htmlContent) {
    return NextResponse.json({ 
      success: false, 
      error: 'Navn og HTML indhold er påkrævet' 
    }, { status: 400 });
  }

  try {
    const template = await prisma.emailTemplate.create({
      data: {
        name,
        description: description || null,
        htmlContent,
        category: category || 'general',
        userId: session.user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Template oprettet succesfuldt',
      template
    });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Der opstod en fejl under oprettelse af template' 
    }, { status: 500 });
  }
}