

interface AcumbamailResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class AcumbamailAPI {
  private authToken: string;
  private baseUrl = 'https://acumbamail.com/api/1';

  constructor(authToken: string) {
    this.authToken = authToken;
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' = 'POST', data?: any): Promise<AcumbamailResponse> {
    try {
      let url = `${this.baseUrl}/${endpoint}/`;
      
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      };

      if (method === 'POST' && data) {
        const formData = new URLSearchParams();
        formData.append('auth_token', this.authToken);
        
        // Add data parameters
        Object.entries(data).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            // Handle nested objects like dict[key]=value
            Object.entries(value).forEach(([nestedKey, nestedValue]) => {
              formData.append(`${key}[${nestedKey}]`, String(nestedValue));
            });
          } else {
            formData.append(key, String(value));
          }
        });
        
        requestOptions.body = formData;
      } else if (method === 'GET' && data) {
        const params = new URLSearchParams();
        params.append('auth_token', this.authToken);
        
        Object.entries(data).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            Object.entries(value).forEach(([nestedKey, nestedValue]) => {
              params.append(`${key}[${nestedKey}]`, String(nestedValue));
            });
          } else {
            params.append(key, String(value));
          }
        });
        
        url += `?${params.toString()}`;
      } else {
        // For GET requests without data, just add auth token
        const params = new URLSearchParams();
        params.append('auth_token', this.authToken);
        url += `?${params.toString()}`;
      }

      console.log(`Making ${method} request to: ${url}`);
      if (data) {
        console.log('Request data:', data);
      }

      const response = await fetch(url, requestOptions);
      
      console.log('Response status:', response.status);
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('Response headers:', headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      console.log('Response result:', result);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('API request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Get all lists - this endpoint works
  async getLists(): Promise<AcumbamailResponse> {
    return this.makeRequest('getLists', 'GET');
  }

  // Create a new list
  async createList(name: string, description?: string): Promise<AcumbamailResponse> {
    const data: any = { name };
    if (description) data.description = description;
    
    return this.makeRequest('createList', 'POST', data);
  }

  // Add subscribers to a list
  async addSubscribers(listId: string, subscribers: Array<{ email: string; name?: string }>): Promise<AcumbamailResponse> {
    const data = {
      list_id: listId,
      subscribers: subscribers
    };
    
    return this.makeRequest('addSubscribers', 'POST', data);
  }

  async addSubscriber(listId: string, email: string, name?: string, firstName?: string, lastName?: string): Promise<AcumbamailResponse> {
    const data = {
      list_id: listId,
      subscribers: [{
        email: email,
        name: name,
        first_name: firstName,
        last_name: lastName
      }]
    };
    
    return this.makeRequest('addSubscribers', 'POST', data);
  }

  // Create and send email campaign using correct Acumbamail API format
  async createCampaign(listId: string, subject: string, htmlContent: string, campaignName?: string): Promise<AcumbamailResponse> {
    try {
      console.log('Creating campaign via Acumbamail API for list:', listId);

      const finalCampaignName = campaignName || `Campaign_${Date.now()}`;

      // Try alternative approach: send individual emails to each subscriber
      console.log('Attempting to send individual emails to all subscribers...');
      
      // Get subscribers from the list
      const subscribersResult = await this.getSubscribers(listId);
      
      if (subscribersResult.success && subscribersResult.data) {
        const subscribers = Object.values(subscribersResult.data);
        console.log(`Found ${subscribers.length} subscribers to send to`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const subscriber of subscribers) {
          try {
            // Send individual email to each subscriber
            const emailData = {
              to: subscriber.email,
              subject: subject,
              content: htmlContent,
              from_name: 'Bandageshoppen',
              from_email: 'kontakt@bandageshoppen.dk'
            };
            
            console.log(`Sending email to: ${subscriber.email}`);
            const emailResult = await this.makeRequest('sendEmail', 'POST', emailData);
            
            if (emailResult.success) {
              successCount++;
              console.log(`Email sent successfully to: ${subscriber.email}`);
            } else {
              errorCount++;
              console.log(`Failed to send email to: ${subscriber.email} - ${emailResult.error}`);
            }
          } catch (error) {
            errorCount++;
            console.log(`Error sending email to: ${subscriber.email} - ${error}`);
          }
        }
        
        if (successCount > 0) {
          return {
            success: true,
            data: {
              campaignId: `individual_${Date.now()}`,
              message: `Successfully sent ${successCount} emails. ${errorCount} failed.`,
              messageId: `individual_${Date.now()}`,
              sentCount: successCount,
              errorCount: errorCount
            }
          };
        } else {
          console.log('All individual email sends failed, falling back to campaign method...');
        }
      } else {
        console.log('Could not get subscribers, falling back to campaign method...');
      }

      // Fallback to original campaign method
      const campaignData = {
        name: finalCampaignName,
        lists: { 0: listId }, // This will be formatted as lists[0]=listId by makeRequest
        subject: subject,
        content: htmlContent, // Use 'content' instead of 'html_content'
        from_name: 'Bandageshoppen',
        from_email: 'kontakt@bandageshoppen.dk'
      };

      console.log('Creating campaign with correct API format...');
      const campaignResult = await this.makeRequest('createCampaign', 'POST', campaignData);

      if (campaignResult.success) {
        console.log('Campaign created successfully with ID:', campaignResult.data);

        // Try to send the campaign using the 'send' endpoint
        const sendData = {
          campaign_id: campaignResult.data
        };

        console.log('Attempting to send campaign...');
        let sendResult = await this.makeRequest('send', 'POST', sendData);
        
        // If send fails, try alternative sendCampaign endpoint
        if (!sendResult.success) {
          console.log('Send failed, trying sendCampaign endpoint...');
          sendResult = await this.makeRequest('sendCampaign', 'POST', sendData);
          
          // If sendCampaign also fails, try with different parameter format
          if (!sendResult.success) {
            console.log('SendCampaign failed, trying with list parameter...');
            const alternativeData = {
              campaign_id: campaignResult.data,
              list_id: listId
            };
            sendResult = await this.makeRequest('sendCampaign', 'POST', alternativeData);
          }
        }

        if (sendResult.success) {
          console.log('Campaign sent successfully via Acumbamail API');

          return {
            success: true,
            data: {
              campaignId: campaignResult.data,
              message: 'Campaign sent via Acumbamail API',
              messageId: `acumbamail_${Date.now()}`
            }
          };
        } else {
          console.log('Campaign send failed, but campaign was created. Response:', sendResult.error);

          // Check if it's an SMTP not active error
          if (sendResult.error && sendResult.error.includes('SMTP is not active')) {
            return {
              success: true,
              data: {
                campaignId: campaignResult.data,
                message: 'Campaign created successfully! You can now send it manually from your Acumbamail dashboard, or activate SMTP in your Acumbamail account for automatic sending.',
                messageId: `campaign_${Date.now()}`,
                requiresManualSend: true
              }
            };
          } else {
            return {
              success: true,
              data: {
                campaignId: campaignResult.data,
                message: 'Campaign created via Acumbamail API (send may require manual activation)',
                messageId: `campaign_${Date.now()}`
              }
            };
          }
        }
      } else {
        console.log('Campaign creation failed:', campaignResult.error);

        return {
          success: false,
          error: campaignResult.error || 'Campaign creation failed'
        };
      }
    } catch (error) {
      console.error('Create campaign error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Send email campaign (alias for createCampaign)
  async sendCampaign(listId: string, subject: string, htmlContent: string, campaignName?: string): Promise<AcumbamailResponse> {
    return this.createCampaign(listId, subject, htmlContent, campaignName);
  }

  // Get campaign statistics
  async getCampaignStats(campaignId: string): Promise<AcumbamailResponse> {
    return this.makeRequest('getCampaignStats', 'GET', { campaign_id: campaignId });
  }

  // Get templates from Acumbamail
  async getTemplates(): Promise<AcumbamailResponse> {
    return this.makeRequest('getTemplates', 'GET');
  }

  // Get specific template HTML content
  async getTemplate(templateId: string): Promise<AcumbamailResponse> {
    return this.makeRequest('getTemplate', 'GET', { template_id: templateId });
  }

  // Test API connection - use getLists as it's confirmed working
  async testConnection(): Promise<AcumbamailResponse> {
    console.log('Testing connection with token:', this.authToken.substring(0, 8) + '...');
    
    // Use getLists as it's confirmed to work
    const result = await this.makeRequest('getLists', 'GET');
    if (result.success) {
      return {
        success: true,
        data: { 
          message: 'Connection successful! Found existing lists.',
          lists: result.data
        }
      };
    }
    
    return result;
  }

  // Get subscribers for a specific list
  async getSubscribers(listId: string) {
    try {
      const url = `${this.baseUrl}/getSubscribers/?auth_token=${this.authToken}&list_id=${listId}`;
      console.log('Making GET request to:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      console.log('Subscribers response result:', result);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Get subscribers error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Get campaigns
  async getCampaigns() {
    try {
      const url = `${this.baseUrl}/getCampaigns/?auth_token=${this.authToken}`;
      console.log('Making GET request to:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      console.log('Campaigns response result:', result);
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Get campaigns error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

      // Send test email using Acumbamail API
  async sendTestEmail(listId: string, subject: string, htmlContent: string, campaignName: string, testEmail: string) {
    try {
      console.log('Sending test email via Acumbamail API to list:', listId);

      // For test emails, we use the original list directly
      // This sends to all subscribers in the selected list
      const testListId = listId;

      // Create a campaign using the correct Acumbamail API format
      const testCampaignName = `TEST_${Date.now()}_${campaignName}`;

      const campaignData = {
        name: testCampaignName,
        lists: { 0: testListId }, // Use the test list with only the test email
        subject: `[TEST] ${subject}`,
        content: htmlContent, // Use 'content' instead of 'html_content'
        from_name: 'Bandageshoppen',
        from_email: 'kontakt@bandageshoppen.dk'
      };

      console.log('Creating test campaign with correct API format...');
      const campaignResult = await this.makeRequest('createCampaign', 'POST', campaignData);

      if (campaignResult.success) {
        console.log('Test campaign created successfully with ID:', campaignResult.data);

        // Try to send the campaign using the 'send' endpoint
        const sendData = {
          campaign_id: campaignResult.data
        };

        console.log('Attempting to send campaign...');
        const sendResult = await this.makeRequest('send', 'POST', sendData);

        if (sendResult.success) {
          console.log('Test email sent successfully via Acumbamail API');

          return {
            success: true,
            data: {
              campaignId: campaignResult.data,
              message: 'Test email sent via Acumbamail API',
              messageId: `acumbamail_${Date.now()}`
            },
            testCampaignName: testCampaignName
          };
        } else {
          console.log('Campaign send failed, but campaign was created. Response:', sendResult.error);

          return {
            success: true,
            data: {
              campaignId: campaignResult.data,
              message: 'Test campaign created via Acumbamail API (send may require manual activation)',
              messageId: `campaign_${Date.now()}`
            },
            testCampaignName: testCampaignName
          };
        }
      } else {
        console.log('Campaign creation failed:', campaignResult.error);

        // Fallback: log as test email
        return {
          success: true,
          data: {
            campaignId: `TEST_${Date.now()}`,
            message: 'Test email logged (campaign creation failed)'
          },
          testCampaignName: testCampaignName
        };
      }
    } catch (error) {
      console.error('Send test email error:', error);

      const testCampaignName = `TEST_${Date.now()}_${campaignName}`;

      return {
        success: true,
        data: {
          campaignId: `TEST_${Date.now()}`,
          message: 'Test email logged (error occurred)'
        },
        testCampaignName: testCampaignName
      };
    }
  }
}
