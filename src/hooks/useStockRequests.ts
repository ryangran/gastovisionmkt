import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface StockRequest {
  id: string;
  product_id: string | null;
  product_name: string;
  current_stock: number;
  unit: string;
  requested_by: string;
  status: "pending" | "approved" | "rejected" | "expired";
  approved_quantity: number | null;
  supervisor_email: string | null;
  notes: string | null;
  created_at: string;
  responded_at: string | null;
  expires_at: string | null;
}

export const useStockRequests = () => {
  const [pendingRequests, setPendingRequests] = useState<StockRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch pending requests
  const fetchPendingRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("stock_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPendingRequests((data as StockRequest[]) || []);
    } catch (error) {
      console.error("Error fetching stock requests:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    fetchPendingRequests();

    const channel = supabase
      .channel("stock-requests-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stock_requests",
        },
        (payload) => {
          console.log("Stock request change:", payload);
          
          if (payload.eventType === "INSERT") {
            const newRequest = payload.new as StockRequest;
            if (newRequest.status === "pending") {
              setPendingRequests((prev) => [...prev, newRequest]);
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedRequest = payload.new as StockRequest;
            if (updatedRequest.status !== "pending") {
              // Remove from pending if no longer pending
              setPendingRequests((prev) =>
                prev.filter((r) => r.id !== updatedRequest.id)
              );
            } else {
              // Update the request in the list
              setPendingRequests((prev) =>
                prev.map((r) =>
                  r.id === updatedRequest.id ? updatedRequest : r
                )
              );
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id;
            setPendingRequests((prev) =>
              prev.filter((r) => r.id !== deletedId)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingRequests]);

  // Create a new stock request
  const createRequest = async (
    productId: string,
    productName: string,
    currentStock: number,
    unit: string
  ): Promise<string | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData?.user?.email || "unknown";

      const { data, error } = await supabase
        .from("stock_requests")
        .insert({
          product_id: productId,
          product_name: productName,
          current_stock: currentStock,
          unit: unit,
          requested_by: userEmail,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      
      // Send push notification to supervisors
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            product_name: productName,
            current_stock: currentStock,
            unit: unit,
            requested_by: userEmail,
          }
        });
      } catch (pushError) {
        console.log("Push notification error (non-critical):", pushError);
      }
      
      return data?.id || null;
    } catch (error) {
      console.error("Error creating stock request:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a solicitação.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Approve a stock request
  const approveRequest = async (
    requestId: string,
    approvedQuantity: number,
    notes?: string
  ): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const supervisorEmail = userData?.user?.email || "unknown";

      const { error } = await supabase
        .from("stock_requests")
        .update({
          status: "approved",
          approved_quantity: approvedQuantity,
          supervisor_email: supervisorEmail,
          notes: notes || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error approving stock request:", error);
      toast({
        title: "Erro",
        description: "Não foi possível aprovar a solicitação.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Reject a stock request
  const rejectRequest = async (
    requestId: string,
    notes?: string
  ): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const supervisorEmail = userData?.user?.email || "unknown";

      const { error } = await supabase
        .from("stock_requests")
        .update({
          status: "rejected",
          supervisor_email: supervisorEmail,
          notes: notes || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error rejecting stock request:", error);
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar a solicitação.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Subscribe to a specific request (for operator waiting for approval)
  const subscribeToRequest = (
    requestId: string,
    onUpdate: (request: StockRequest) => void
  ) => {
    const channel = supabase
      .channel(`stock-request-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "stock_requests",
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          onUpdate(payload.new as StockRequest);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return {
    pendingRequests,
    isLoading,
    createRequest,
    approveRequest,
    rejectRequest,
    subscribeToRequest,
    refetch: fetchPendingRequests,
  };
};
