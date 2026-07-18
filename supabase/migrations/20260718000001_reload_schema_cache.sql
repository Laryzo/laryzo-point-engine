-- Force reload schema cache to fix missing 'category' column error in merchant_products
-- This notifies PostgREST to reload the schema information from the database
NOTIFY pgrst, 'reload schema';
