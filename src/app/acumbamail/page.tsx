'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AcumbamailList {
  id: string;
  name: string;
  description: string | null;
  listId: string;
  createdAt: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  htmlContent: string;
}

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  status: string;
  tags: string | null;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  list: AcumbamailList;
}

export default function AcumbamailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('config');
  const [authToken, setAuthToken] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [connectionMessage, setConnectionMessage] = useState('');
  
  const [lists, setLists] = useState<AcumbamailList[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [importingTemplates, setImportingTemplates] = useState(false);
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [templatePage, setTemplatePage] = useState(1);
  const [templatesPerPage] = useState(20);
  
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  
  // Form states
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('general');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignSubject, setNewCampaignSubject] = useState('');
  const [newCampaignListId, setNewCampaignListId] = useState('');
  const [newCampaignTemplateId, setNewCampaignTemplateId] = useState('');
  const [newCampaignContent, setNewCampaignContent] = useState('');
  const [newCampaignTargetAll, setNewCampaignTargetAll] = useState(true);
  const [newCampaignTargetSpecific, setNewCampaignTargetSpecific] = useState(false);
  const [newCampaignFilters, setNewCampaignFilters] = useState('');
  
  // Test email states
  const [testEmailListId, setTestEmailListId] = useState('');
  const [testEmailSubject, setTestEmailSubject] = useState('');
  const [testEmailContent, setTestEmailContent] = useState(`<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        h1 { margin: 0; font-size: 28px; }
        h2 { color: #667eea; margin-top: 0; }
        p { margin-bottom: 15px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Test Email</h1>
        <p>Dette er en test email fra Automatisk Email Generator</p>
    </div>
    
    <div class="content">
        <h2>Hej der!</h2>
        <p>Dette er en test email for at verificere at email systemet fungerer korrekt.</p>
        
        <p><strong>Test detaljer:</strong></p>
        <ul>
            <li>✅ Email blev sendt via Acumbamail API</li>
            <li>✅ HTML indhold vises korrekt</li>
            <li>✅ Kun test-email modtager denne besked</li>
            <li>✅ Platformen fungerer som forventet</li>
        </ul>
        
        <p>Hvis du kan læse denne email, så fungerer test-email funktionaliteten perfekt!</p>
        
        <a href="#" class="button">Test Knap</a>
        
        <p><em>Denne email blev sendt den ${new Date().toLocaleDateString('da-DK')} kl. ${new Date().toLocaleTimeString('da-DK')}</em></p>
    </div>
    
    <div class="footer">
        <p>Automatisk Email Generator - Test Email System</p>
        <p>Denne email er kun sendt til test-email adressen for sikkerhed</p>
    </div>
</body>
</html>`);
  const [testEmailName, setTestEmailName] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    // Check if user has Acumbamail configured
    checkConnectionStatus();
  }, [status, router]);

  const checkConnectionStatus = async () => {
    try {
      // Check if user already has a stored auth token by testing connection
      console.log('Checking connection status...');
      const response = await fetch('/api/acumbamail/test-connection');
      console.log('Connection test response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Connection check successful:', data);
        setConnectionStatus('connected');
        setConnectionMessage('Forbindelse til Acumbamail er etableret');
        // Load data immediately since we're connected
        await loadData();
      } else {
        const errorText = await response.text();
        console.log('Connection check failed:', response.status, errorText);
        setConnectionStatus('disconnected');
        setConnectionMessage('Ingen forbindelse til Acumbamail');
      }
    } catch (error) {
      console.error('Connection check error:', error);
      setConnectionStatus('disconnected');
      setConnectionMessage('Ingen forbindelse til Acumbamail');
    }
  };

  const loadData = async () => {
    try {
      // Load lists (still needed for campaign creation)
      const listsResponse = await fetch('/api/acumbamail/lists');
      if (listsResponse.ok) {
        const listsData = await listsResponse.json();
        console.log('Lists data:', listsData);
        setLists(listsData.lists || []);
      } else {
        console.error('Lists response error:', listsResponse.status, await listsResponse.text());
      }
      
      // Load templates
      const templatesResponse = await fetch('/api/acumbamail/templates');
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        console.log('Templates data:', templatesData);
        setTemplates(templatesData.templates || []);
      } else {
        console.error('Templates response error:', templatesResponse.status, await templatesResponse.text());
      }
      
      // Load campaigns
      const campaignsResponse = await fetch('/api/acumbamail/campaigns');
      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        console.log('Campaigns data:', campaignsData);
        setCampaigns(campaignsData.campaigns || []);
      } else {
        console.error('Campaigns response error:', campaignsResponse.status, await campaignsResponse.text());
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const testConnection = async () => {
    if (!authToken.trim()) {
      setMessage('Indtast venligst dit auth token');
      return;
    }

    setLoading(true);
    setConnectionStatus('connecting');
    setMessage('Tester forbindelse...');

    try {
      const response = await fetch('/api/acumbamail/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authToken })
      });

      const result = await response.json();

      if (result.success) {
        setConnectionStatus('connected');
        setConnectionMessage('Forbindelse etableret succesfuldt!');
        setMessage(result.message);
        setAuthToken(''); // Clear the input field after successful connection
        await loadData();
      } else {
        setConnectionStatus('error');
        setConnectionMessage('Forbindelse fejlede');
        setMessage(result.error || 'Ukendt fejl');
      }
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage('Forbindelse fejlede');
      setMessage('Der opstod en fejl under test af forbindelse');
    } finally {
      setLoading(false);
    }
  };

  const syncIntegration = async () => {
    if (connectionStatus !== 'connected') {
      setMessage('Du skal først oprette forbindelse til Acumbamail');
      return;
    }

    setSyncing(true);
    setMessage('Synkroniserer integration...');

    try {
      const response = await fetch('/api/acumbamail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        setMessage(result.message);
        // Reload all data after sync
        await loadData();
        
        // Show detailed results
        const results = result.results;
        const summary = `Opdateret: ${results.lists.updated} lister, ${results.subscribers.updated} abonnenter, ${results.templates.updated} templates, ${results.campaigns.updated} kampagner. Oprettet: ${results.lists.created} nye lister, ${results.subscribers.created} nye abonnenter, ${results.templates.created} nye templates, ${results.campaigns.created} nye kampagner.`;
        setMessage(summary);
      } else {
        setMessage(result.error || 'Ukendt fejl under synkronisering');
      }
    } catch (error) {
      setMessage('Der opstod en fejl under synkronisering af integration');
    } finally {
      setSyncing(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmailListId || !testEmailSubject || !testEmailContent || !testEmailName) {
      setMessage('Alle felter er påkrævet for test email');
      return;
    }

    setSendingTestEmail(true);
    setMessage('Sender test email...');

    try {
      const response = await fetch('/api/acumbamail/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: testEmailListId,
          subject: testEmailSubject,
          htmlContent: testEmailContent,
          campaignName: testEmailName,
          testEmail: 'test@example.com' // This will be overridden by the API to use the first email in the selected list
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(result.message);
        // Clear form
        setTestEmailListId('');
        setTestEmailSubject('');
        setTestEmailContent('');
        setTestEmailName('');
        // Reload data
        await loadData();
      } else {
        setMessage(result.error || 'Ukendt fejl under afsendelse af test email');
      }
    } catch (error) {
      setMessage('Der opstod en fejl under afsendelse af test email');
    } finally {
      setSendingTestEmail(false);
    }
  };



  const initTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/acumbamail/init-templates', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        setMessage(result.message);
        await loadData();
      } else {
        setMessage(result.error || 'Ukendt fejl');
      }
    } catch (error) {
      setMessage('Der opstod en fejl under oprettelse af templates');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/acumbamail/available-templates');
      if (response.ok) {
        const data = await response.json();
        setAvailableTemplates(data.templates || []);
        setMessage(`Fundet ${data.templates?.length || 0} tilgængelige templates`);
      } else {
        setMessage('Kunne ikke hente tilgængelige templates');
      }
    } catch (error) {
      setMessage('Der opstod en fejl under hentning af templates');
    } finally {
      setLoading(false);
    }
  };

  const importSelectedTemplates = async () => {
    if (selectedTemplates.length === 0) {
      setMessage('Vælg mindst én template at importere');
      return;
    }

    setImportingTemplates(true);
    try {
      const response = await fetch('/api/acumbamail/import-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateIds: selectedTemplates })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`Importeret ${result.imported} templates succesfuldt`);
        setSelectedTemplates([]);
        await loadData(); // Reload local templates
        await loadAvailableTemplates(); // Reload available templates
      } else {
        setMessage(result.error || 'Fejl ved import af templates');
      }
    } catch (error) {
      setMessage('Der opstod en fejl under import af templates');
    } finally {
      setImportingTemplates(false);
    }
  };

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplates(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  // Filter and paginate templates
  const filteredTemplates = availableTemplates.filter(template =>
    template.name.toLowerCase().includes(templateSearchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTemplates.length / templatesPerPage);
  const startIndex = (templatePage - 1) * templatesPerPage;
  const endIndex = startIndex + templatesPerPage;
  const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex);

  const handleTemplateSearch = (searchTerm: string) => {
    setTemplateSearchTerm(searchTerm);
    setTemplatePage(1); // Reset to first page when searching
  };

  const handleTemplatePageChange = (page: number) => {
    setTemplatePage(page);
  };

  const createTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      setMessage('Navn og HTML indhold er påkrævet');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/acumbamail/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName,
          description: newTemplateDescription,
          htmlContent: newTemplateContent,
          category: newTemplateCategory
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(result.message);
        setNewTemplateName('');
        setNewTemplateDescription('');
        setNewTemplateCategory('general');
        setNewTemplateContent('');
        await loadData();
      } else {
        setMessage(result.error || 'Ukendt fejl');
      }
    } catch (error) {
      setMessage('Der opstod en fejl under oprettelse af template');
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!newCampaignName.trim() || !newCampaignSubject.trim() || !newCampaignListId) {
      setMessage('Navn, emne og liste er påkrævet');
      return;
    }

    if (!newCampaignTemplateId && !newCampaignContent.trim()) {
      setMessage('Vælg en template eller indtast HTML indhold');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/acumbamail/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCampaignName,
          subject: newCampaignSubject,
          htmlContent: newCampaignContent,
          listId: newCampaignListId,
          templateId: newCampaignTemplateId || null,
          targetAllSubscribers: newCampaignTargetAll,
          targetSpecificSubscribers: newCampaignTargetSpecific,
          targetFilters: newCampaignFilters ? JSON.parse(newCampaignFilters) : null
        })
      });

      const result = await response.json();

      if (result.success) {
        setMessage(result.message);
        setNewCampaignName('');
        setNewCampaignSubject('');
        setNewCampaignListId('');
        setNewCampaignTemplateId('');
        setNewCampaignContent('');
        setNewCampaignTargetAll(true);
        setNewCampaignTargetSpecific(false);
        setNewCampaignFilters('');
        await loadData();
      } else {
        setMessage(result.error || 'Ukendt fejl');
      }
    } catch (error) {
      setMessage('Der opstod en fejl under oprettelse af kampagne');
    } finally {
      setLoading(false);
    }
  };



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
              <Link href="/" className="text-xl font-bold text-gray-900">
                Email Generator
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Acumbamail Integration</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/profile" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Profil
              </Link>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                connectionStatus === 'error' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {connectionMessage}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message Display */}
        {message && (
          <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-blue-800">{message}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'config', name: 'Konfiguration' },
              { id: 'templates', name: 'Templates' },
              { id: 'campaigns', name: 'Kampagner' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Configuration Tab */}
        {activeTab === 'config' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Acumbamail Konfiguration</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Auth Token
                </label>
                <input
                  type="password"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Indtast dit Acumbamail auth token"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Du kan finde dit auth token i din Acumbamail konto under API indstillinger
                </p>
              </div>

              <button
                onClick={testConnection}
                disabled={loading || !authToken.trim()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Tester forbindelse...' : 'Test Forbindelse'}
              </button>
            </div>
          </div>
        )}

        {/* Sync Integration Button - Only show when connected */}
        {connectionStatus === 'connected' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🔄 Opdater Integration</h3>
            <p className="text-gray-600 mb-4">
              Synkroniser alle nye lister, abonnenter og kampagner fra Acumbamail til denne platform.
            </p>
            <button
              onClick={syncIntegration}
              disabled={syncing}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {syncing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Synkroniserer...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Opdater Integration
                </>
              )}
            </button>
          </div>
        )}



        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Email Templates</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create New Template */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Opret ny template</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template navn
                  </label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Indtast template navn"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori
                  </label>
                  <select
                    value={newTemplateCategory}
                    onChange={(e) => setNewTemplateCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="general">Generel</option>
                    <option value="newsletter">Nyhedsbrev</option>
                    <option value="promotion">Promotion</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beskrivelse (valgfrit)
                  </label>
                  <textarea
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                    placeholder="Indtast beskrivelse"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HTML Indhold
                  </label>
                  <textarea
                    value={newTemplateContent}
                    onChange={(e) => setNewTemplateContent(e.target.value)}
                    placeholder="Indtast HTML indhold"
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
                <button
                  onClick={createTemplate}
                  disabled={loading || !newTemplateName.trim() || !newTemplateContent.trim()}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Opretter...' : 'Opret Template'}
                </button>
              </div>

              {/* Template Management */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Eksisterende templates</h3>
                  <button
                    onClick={initTemplates}
                    disabled={loading}
                    className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Opretter...' : 'Opret Standard Templates'}
                  </button>
                </div>
                
                {templates.length === 0 ? (
                  <p className="text-gray-500">Ingen templates fundet</p>
                ) : (
                  <div className="space-y-3">
                    {templates.map((template) => (
                      <div key={template.id} className="p-3 border border-gray-200 rounded-lg">
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full mt-1">
                          {template.category}
                        </span>
                        {template.description && (
                          <p className="text-sm text-gray-600 mt-2">{template.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Template Import Section */}
            <div className="mt-8 bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Importer Templates fra Acumbamail</h3>
              
              <div className="flex gap-4 mb-4">
                <button
                  onClick={loadAvailableTemplates}
                  disabled={loading}
                  className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Henter...' : 'Hent Alle Templates'}
                </button>
                
                {selectedTemplates.length > 0 && (
                  <button
                    onClick={importSelectedTemplates}
                    disabled={importingTemplates}
                    className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importingTemplates ? 'Importerer...' : `Importer ${selectedTemplates.length} Templates`}
                  </button>
                )}
              </div>

              {/* Search and Pagination Controls */}
              {availableTemplates.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Søg i templates..."
                        value={templateSearchTerm}
                        onChange={(e) => handleTemplateSearch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="text-sm text-gray-600">
                      Viser {startIndex + 1}-{Math.min(endIndex, filteredTemplates.length)} af {filteredTemplates.length} templates
                    </div>
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTemplatePageChange(templatePage - 1)}
                        disabled={templatePage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Forrige
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => handleTemplatePageChange(page)}
                          className={`px-3 py-1 text-sm border rounded-md ${
                            page === templatePage
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => handleTemplatePageChange(templatePage + 1)}
                        disabled={templatePage === totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Næste
                      </button>
                    </div>
                  )}
                </div>
              )}

              {availableTemplates.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedTemplates.map((template) => (
                    <div 
                      key={template.id} 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedTemplates.includes(template.id.toString()) 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleTemplateSelection(template.id.toString())}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{template.name}</h4>
                        <input
                          type="checkbox"
                          checked={selectedTemplates.includes(template.id.toString())}
                          onChange={() => toggleTemplateSelection(template.id.toString())}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-3">
                        ID: {template.id}
                      </div>
                      
                      {/* Template Preview */}
                      <div className="bg-white border rounded p-3 text-xs text-gray-500 h-20 overflow-hidden">
                        {template.available ? (
                          <div className="text-green-600 font-medium">✓ Tilgængelig</div>
                        ) : (
                          <div className="text-red-600 font-medium">✗ Ikke tilgængelig</div>
                        )}
                        <div className="mt-1">
                          {template.name.includes('test') && 'Test template'}
                          {template.name.includes('velkomst') && 'Velkomst template'}
                          {template.name.includes('fb_lead') && 'Facebook Lead template'}
                          {template.name.includes('easter') && 'Påske template'}
                          {!template.name.includes('test') && !template.name.includes('velkomst') && 
                           !template.name.includes('fb_lead') && !template.name.includes('easter') && 
                           'Nyhedsbrev template'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {availableTemplates.length === 0 && !loading && (
                <p className="text-gray-500 text-center py-8">
                  Klik "Hent Alle Templates" for at se templates fra Acumbamail
                </p>
              )}

              {availableTemplates.length > 0 && paginatedTemplates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Ingen templates matcher din søgning "{templateSearchTerm}"
                </div>
              )}
            </div>
          </div>
        )}



        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Email Kampagner</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create New Campaign */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Opret ny kampagne</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kampagne navn
                  </label>
                  <input
                    type="text"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    placeholder="Indtast kampagne navn"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emne
                  </label>
                  <input
                    type="text"
                    value={newCampaignSubject}
                    onChange={(e) => setNewCampaignSubject(e.target.value)}
                    placeholder="Indtast email emne"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vælg liste
                  </label>
                  <select
                    value={newCampaignListId}
                    onChange={(e) => setNewCampaignListId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Vælg en liste</option>
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>{list.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vælg template (valgfrit)
                  </label>
                  <select
                    value={newCampaignTemplateId}
                    onChange={(e) => setNewCampaignTemplateId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Ingen template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HTML Indhold (hvis ingen template)
                  </label>
                  <textarea
                    value={newCampaignContent}
                    onChange={(e) => setNewCampaignContent(e.target.value)}
                    placeholder="Indtast HTML indhold"
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
                
                {/* Targeting Options */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900">Målretting</h4>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newCampaignTargetAll}
                        onChange={(e) => {
                          setNewCampaignTargetAll(e.target.checked);
                          if (e.target.checked) setNewCampaignTargetSpecific(false);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Send til alle abonnenter i listen</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newCampaignTargetSpecific}
                        onChange={(e) => {
                          setNewCampaignTargetSpecific(e.target.checked);
                          if (e.target.checked) setNewCampaignTargetAll(false);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Målret specifikke abonnenter</span>
                    </label>
                  </div>
                  
                  {newCampaignTargetSpecific && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Filtrer (JSON format)
                      </label>
                      <textarea
                        value={newCampaignFilters}
                        onChange={(e) => setNewCampaignFilters(e.target.value)}
                        placeholder='{"status": "active", "tags": ["vip"]}'
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Eksempel: Filtrer på status, tags, eller andre felter
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={createCampaign}
                  disabled={loading || !newCampaignName.trim() || !newCampaignSubject.trim() || !newCampaignListId}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Opretter...' : 'Opret og Send Kampagne'}
                </button>
              </div>

              {/* Test Email Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">🧪 Test Email</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-green-800">✅ SIKKER TEST-EMAIL</h4>
                      <p className="text-sm text-green-700 mt-1">
                        <strong>Test email sendes til ALLE abonnenter i den valgte liste</strong>
                      </p>
                                      <p className="text-sm text-green-600 mt-1">
                  Bruger Acumbamail API til at sende til alle abonnenter i den valgte liste.
                  Dette er en test-email til alle subscribers.
                </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vælg liste (skal være "test" listen)
                  </label>
                  <select
                    value={testEmailListId}
                    onChange={(e) => setTestEmailListId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Vælg en liste</option>
                    {lists.filter(list => list.name === 'test').map((list) => (
                      <option key={list.id} value={list.id}>{list.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test kampagne navn
                  </label>
                  <input
                    type="text"
                    value={testEmailName}
                    onChange={(e) => setTestEmailName(e.target.value)}
                    placeholder="Indtast test kampagne navn"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test email emne
                  </label>
                  <input
                    type="text"
                    value={testEmailSubject}
                    onChange={(e) => setTestEmailSubject(e.target.value)}
                    placeholder="Indtast test email emne"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Test email indhold (HTML)
                    </label>
                    <button
                      type="button"
                      onClick={() => setTestEmailContent(`<!DOCTYPE html>
<html lang="da">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        h1 { margin: 0; font-size: 28px; }
        h2 { color: #667eea; margin-top: 0; }
        p { margin-bottom: 15px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Test Email</h1>
        <p>Dette er en test email fra Automatisk Email Generator</p>
    </div>
    
    <div class="content">
        <h2>Hej der!</h2>
        <p>Dette er en test email for at verificere at email systemet fungerer korrekt.</p>
        
        <p><strong>Test detaljer:</strong></p>
        <ul>
            <li>✅ Email blev sendt via Acumbamail API</li>
            <li>✅ HTML indhold vises korrekt</li>
            <li>✅ Kun test-email modtager denne besked</li>
            <li>✅ Platformen fungerer som forventet</li>
        </ul>
        
        <p>Hvis du kan læse denne email, så fungerer test-email funktionaliteten perfekt!</p>
        
        <a href="#" class="button">Test Knap</a>
        
        <p><em>Denne email blev sendt den ${new Date().toLocaleDateString('da-DK')} kl. ${new Date().toLocaleTimeString('da-DK')}</em></p>
    </div>
    
    <div class="footer">
        <p>Automatisk Email Generator - Test Email System</p>
        <p>Denne email er kun sendt til test-email adressen for sikkerhed</p>
    </div>
</body>
</html>`)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded border"
                    >
                      🔄 Indlæs Template
                    </button>
                  </div>
                  <textarea
                    value={testEmailContent}
                    onChange={(e) => setTestEmailContent(e.target.value)}
                    placeholder="HTML indhold er pre-fyldt med en test template. Klik 'Indlæs Template' for at genindlæse den."
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>

                <button
                  onClick={sendTestEmail}
                  disabled={sendingTestEmail || !testEmailListId || !testEmailSubject || !testEmailContent || !testEmailName}
                  className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {sendingTestEmail ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sender test email...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send Test Email
                    </>
                  )}
                </button>
              </div>

              {/* Existing Campaigns */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Eksisterende kampagner</h3>
                {campaigns.length === 0 ? (
                  <p className="text-gray-500">Ingen kampagner fundet</p>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} className="p-3 border border-gray-200 rounded-lg">
                        <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{campaign.subject}</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                            campaign.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {campaign.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {campaign.sentAt ? 
                              new Date(campaign.sentAt).toLocaleDateString('da-DK') :
                              new Date(campaign.createdAt).toLocaleDateString('da-DK')
                            }
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Liste: {campaign.list ? campaign.list.name : 'Ingen liste'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
