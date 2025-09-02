'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'authenticated') {
      router.push('/acumbamail');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Indlæser...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">Automatisk Email Generator</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Log ind
              </Link>
              <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                Opret konto
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Velkommen til Automatisk Email Generator
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            En komplet platform til email marketing med Acumbamail integration. 
            Opret kampagner, administrer templates og send professionelle emails til dine kunder.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-3xl mb-4">📧</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Kampagner</h3>
              <p className="text-gray-600">Opret og send professionelle email kampagner til dine kunder</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-3xl mb-4">🎨</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Templates</h3>
              <p className="text-gray-600">Brug færdige templates eller importer fra Acumbamail</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-3xl mb-4">🔗</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Acumbamail Integration</h3>
              <p className="text-gray-600">Fuld integration med Acumbamail for professionel email marketing</p>
            </div>
          </div>

          <div className="space-x-4">
            <Link 
              href="/register" 
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 inline-block"
            >
              Kom i gang nu
            </Link>
            <Link 
              href="/login" 
              className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-medium border-2 border-blue-600 hover:bg-blue-50 inline-block"
            >
              Log ind
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}