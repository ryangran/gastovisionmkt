import { supabase } from "@/integrations/supabase/client";

interface LogActivityParams {
  action: string;
  details?: string;
  page?: string;
}

// Cache IP address to avoid multiple requests
let cachedIp: string | null = null;

const getClientIp = async (): Promise<string> => {
  if (cachedIp) return cachedIp;
  
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    cachedIp = data.ip;
    return cachedIp;
  } catch (error) {
    console.error('Error fetching IP:', error);
    return 'unknown';
  }
};

export const logActivity = async ({ action, details, page }: LogActivityParams) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return;

    const ip = await getClientIp();
    const userAgent = navigator.userAgent;

    await supabase.from('activity_logs').insert({
      user_email: session.user.email,
      action,
      details: details || null,
      page: page || window.location.pathname,
      ip_address: ip,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// Pre-built helper functions for common actions
export const logNavigation = (pageName: string) => {
  logActivity({
    action: 'navegação',
    details: `Acessou: ${pageName}`,
    page: window.location.pathname,
  });
};

export const logClick = (elementName: string, page?: string) => {
  logActivity({
    action: 'clique',
    details: `Clicou em: ${elementName}`,
    page,
  });
};

export const logChange = (fieldName: string, oldValue?: string, newValue?: string, page?: string) => {
  let details = `Alterou: ${fieldName}`;
  if (oldValue !== undefined && newValue !== undefined) {
    details += ` (de "${oldValue}" para "${newValue}")`;
  }
  logActivity({
    action: 'alteração',
    details,
    page,
  });
};

export const logAction = (actionName: string, details?: string, page?: string) => {
  logActivity({
    action: actionName,
    details,
    page,
  });
};
