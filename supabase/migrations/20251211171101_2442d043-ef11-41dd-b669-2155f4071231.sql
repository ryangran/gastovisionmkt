-- Remove the old check constraint and add a new one that includes all types
ALTER TABLE public.movements DROP CONSTRAINT IF EXISTS movements_type_check;

ALTER TABLE public.movements ADD CONSTRAINT movements_type_check 
CHECK (type IN ('add', 'remove', 'entrada', 'saida', 'cadastro', 'estorno'));