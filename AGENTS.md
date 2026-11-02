
## Security architecture (do not regress)
- Admin identity pinning: `admins.user_id` binds each admin to their Supabase auth user; `requireAdmin`, admin-create, and admin-reset-password must keep requiring a session user-id match. Never bind by email alone.
- First-admin bootstrap requires the `ADMIN_SETUP_KEY` secret; never re-open an unauthenticated register path.
- Customer point spend/refund goes through the order-bound `spend_points_for_order` / `refund_points_for_order` RPCs; `increment_customer_points` is service-role only. Never call it from client code.
- Customer self-updates cannot change points/points_blocked/parent_id/position (DB trigger `guard_customer_self_update_trg`).
- Merchant access functions require `merchants.is_active = true`.
- Edge function logs must never contain emails, phone numbers, or customer names (PII).
