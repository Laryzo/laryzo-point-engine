-- Create trigger to automatically delete point history when transaction is deleted
CREATE TRIGGER delete_point_history_trigger
  AFTER DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_point_history_on_transaction_delete();