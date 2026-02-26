/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// VAPID public key - this is safe to expose in frontend
const VAPID_PUBLIC_KEY = 'BHhU1ZxHDkTFAI24dt3jqfieNiV9_w0124VlbIknlnPoMBnU7OQXK1hnyTerAs0WiOxzJ7SFoe84g8e351ORUJ0';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const { toast } = useToast();

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window;
      
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        
        // Check existing subscription - first try to get existing registration
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          const existingRegistration = registrations.find(r => r.active?.scriptURL.includes('sw.js'));
          
          if (existingRegistration) {
            const subscription = await (existingRegistration as any).pushManager.getSubscription();
            setIsSubscribed(!!subscription);
          } else {
            // No existing registration, not subscribed
            setIsSubscribed(false);
          }
        } catch (error) {
          console.error("Error checking subscription:", error);
          setIsSubscribed(false);
        }
      }
      
      setIsLoading(false);
    };

    checkSupport();
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Workers not supported');
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Não suportado",
        description: "Seu navegador não suporta notificações push.",
        variant: "destructive",
      });
      return false;
    }

    // iOS Safari: Web Push only works for installed web apps (Add to Home Screen)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      // @ts-expect-error - iOS Safari legacy
      (navigator.standalone === true);

    if (isIOS && !isStandalone) {
      toast({
        title: "Instale o app no iPhone",
        description:
          "No iPhone, push só funciona se você adicionar à Tela de Início e abrir por lá (Safari → Compartilhar → Adicionar à Tela de Início).",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== "granted") {
        toast({
          title: "Permissão negada",
          description: "Você precisa permitir notificações para receber alertas.",
          variant: "destructive",
        });
        return false;
      }

      // Register service worker
      await registerServiceWorker();

      // Wait for service worker to be ready
      const readyRegistration = await navigator.serviceWorker.ready;

      // Reuse existing subscription if present (common when we reset the DB)
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      let subscription = await (readyRegistration as any).pushManager.getSubscription();

      if (!subscription) {
        subscription = await (readyRegistration as any).pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as BufferSource,
        });
      }

      // Get the keys
      const keys = subscription.toJSON().keys;
      if (!keys?.p256dh || !keys?.auth) {
        throw new Error("Failed to get subscription keys");
      }

      // Get user email
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email;

      if (!userEmail) {
        throw new Error("User not authenticated");
      }

      // Save subscription to database
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            user_email: userEmail,
            endpoint: subscription.endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
          {
            onConflict: "endpoint",
          },
        );

      if (error) throw error;

      setIsSubscribed(true);
      toast({
        title: "✅ Notificações ativadas!",
        description: "Você receberá alertas mesmo com o app fechado.",
      });

      return true;
    } catch (error: any) {
      console.error("Error subscribing to push:", error);
      const detail = `${error?.name ? `${error.name}: ` : ""}${error?.message || ""}`.trim();

      toast({
        title: "Erro ao ativar push",
        description: detail ? `Não foi possível ativar notificações push. ${detail}` : "Não foi possível ativar notificações push.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, registerServiceWorker, toast]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.email) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint);
        }
      }

      setIsSubscribed(false);
      toast({
        title: "Notificações desativadas",
        description: "Você não receberá mais alertas push.",
      });

      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast({
        title: "Erro",
        description: "Não foi possível desativar notificações.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  };
};
