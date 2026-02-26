-- Criar função que envia alerta de estoque baixo
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se o estoque ficou baixo ou igual ao mínimo
  IF NEW.quantity <= NEW.min_stock THEN
    -- Chama a edge function usando pg_net
    PERFORM net.http_post(
      url := 'https://zedfygdshvfigvxlekdp.supabase.co/functions/v1/check-low-stock',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZGZ5Z2RzaHZmaWd2eGxla2RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjgxMTEsImV4cCI6MjA3NzE0NDExMX0.dVXPaKah7OZZFkqD0sgeBF5YPHjNbdP6Rq3kUB8tFL4"}'::jsonb,
      body := json_build_object(
        'product_id', NEW.id,
        'product_name', NEW.name,
        'quantity', NEW.quantity,
        'min_stock', NEW.min_stock,
        'timestamp', NOW()
      )::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger que executa após atualização de produtos
CREATE TRIGGER check_low_stock_trigger
AFTER UPDATE OF quantity ON products
FOR EACH ROW
WHEN (NEW.quantity <= NEW.min_stock AND OLD.quantity > OLD.min_stock)
EXECUTE FUNCTION notify_low_stock();