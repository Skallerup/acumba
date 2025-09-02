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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || !user.acumbamailAuthToken) {
    return NextResponse.json({ error: 'Acumbamail ikke konfigureret' }, { status: 400 });
  }

  const acumbamail = new AcumbamailAPI(user.acumbamailAuthToken);

  try {
    const result = await acumbamail.testConnection();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Der opstod en fejl under test af forbindelse' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Ikke autoriseret' }, { status: 401 });
  }

  const { authToken } = await request.json();

  if (!authToken) {
    return NextResponse.json({ 
      success: false, 
      error: 'Auth token er påkrævet' 
    }, { status: 400 });
  }

  const acumbamail = new AcumbamailAPI(authToken);

  try {
    const result = await acumbamail.testConnection();
    
    if (result.success) {
      // Save the auth token to the user
      try {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { acumbamailAuthToken: authToken }
        });
      } catch (error) {
        console.error('Error saving auth token:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Forbindelse testet, men kunne ikke gemme token' 
        }, { status: 500 });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Test connection error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Der opstod en fejl under test af forbindelse' 
    }, { status: 500 });
  }
}