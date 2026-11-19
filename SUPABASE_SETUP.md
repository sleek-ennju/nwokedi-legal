# Supabase setup — Nwokedi Legal

The code is ready. Supabase needs a project created in the dashboard (it's an account,
so a person has to do it). About 10 minutes.

## 1. Create the project
1. Sign in at **supabase.com** → **New project**.
2. **Organization:** ideally one owned by the client (or transfer it to her later).
3. **Name:** `nwokedi-legal`.
4. **Database password:** generate a strong one and store it in a password manager.
   You won't need it day to day.
5. **Region:** click **"Need a specific region?"** → **West EU (London)**. Supabase has
   no African region, and London is the lowest-latency choice for Lagos and Abuja.
6. **Data access:**
   - ✅ **Enable Data API**: on (the site talks to the database through it)
   - ⬜ **Grant API access to new tables automatically**: **off** (safer; the migration
     grants exactly what's needed, explicitly)
   - ✅ **Enable RLS on new tables automatically**: on (a safety net for future tables)
7. **Plan:** Free is fine while building. ⚠ Free projects **pause after 7 days without
   activity**. Move to **Pro** before launch so the store never goes to sleep.

## 2. Create the tables (one paste)
1. In the project, open **SQL Editor** → **New query**.
2. Paste the whole of `supabase/migrations/20261118120000_init.sql` and click **Run**.
3. You should see "Success. No rows returned". This creates:
   - tables: `orders`, `download_tokens`, `events`, `enquiries`, `books`, `admins`
   - the `consume_download` function (atomically validates and uses a download link)
   - a **private** storage bucket called `books` for the full book files

Everything has Row Level Security on, with no public access. Only the website's server
(via the service-role key) can write. Admins will be able to read through the dashboard
in Phase 3.

## 3. Give the website its keys
1. Open **Project Settings → API**.
2. Copy the **Project URL** and the **`service_role` secret key**.
   *(Not the `anon` key: the site doesn't need it yet.)*
3. Put them in `web/.env.local`. Create the file if it doesn't exist; it's git-ignored:

```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

⚠ The service-role key bypasses all security rules. It must **never** be committed, shared
in chat or screenshots, or given a `NEXT_PUBLIC_` prefix. The code only loads it on the server
(`src/lib/db/supabase.ts` is marked `server-only`, so the build fails if anything tries to
send it to the browser).

## 4. Check it
Restart the dev server, then open **http://localhost:3000/api/health/db**. You should see:

```json
{ "ok": true, "message": "Connected. 6 tables present; private \"books\" bucket ready." }
```

If something's missing, the message says exactly what (for example: the migration wasn't run,
or the bucket is public).

## What starts working immediately
| Where | What gets saved |
|---|---|
| Book checkout | a `pending` order (reference, book, name, email, amount, currency) before the buyer goes to Paystack |
| Store pages | every funnel event (`store_view` → `payment_success`) in `events` |
| Consultation form | every enquiry in `enquiries`, even if the email alert fails |

## Next (2b, once Paystack test keys are in)
- `/api/paystack/webhook`: verifies Paystack's signature, re-checks the payment with Paystack,
  marks the order `paid` (it's safe if Paystack sends the same event twice), and issues a download token.
- Email with the download link (Resend), valid for **72 hours / 5 downloads**.
- `/download/[token]`: validates the token with `consume_download` and redirects to a 60-second
  signed URL for the private file.

---

# 2b — Payment confirmation & delivery (built)

**Flow:** Paystack → `/api/paystack/webhook` (signature checked, payment re-verified with
Paystack, amount and currency matched) → order marked **paid** → a delivery is claimed exactly
once → a download token is issued (only its SHA-256 fingerprint is stored) → **email** with
`/download/<token>` → the token is validated and one use consumed atomically → a **60-second
signed URL** for the private file.
The thank-you page runs the same fulfilment as a fallback, so a slow webhook never delays the book.

### To switch it on
1. **Paystack:** Settings → API Keys & Webhooks
   - copy the **Test Secret Key** (`sk_test_…`) into `PAYSTACK_SECRET_KEY` in `web/.env.local`
   - set **Test Webhook URL** to `https://<your-domain>/api/paystack/webhook`
     (it must be a public URL; on localhost, test through the thank-you page fallback, or use a tunnel)
2. **Resend:** resend.com → add and **verify her domain** (DNS records) → create an API key →
   `RESEND_API_KEY`, and set `BOOKS_FROM="Nwokedi Legal <books@her-domain>"`.
   Without these, development prints the email to the server log instead.
3. **Book files:** upload each PDF to the private **books** bucket as `<book-slug>.pdf`
   (Supabase → Storage → books). The admin dashboard will do this in Phase 3.

### Dev helpers (404 in production)
- `GET /api/health/db`: checks the database connection
- `GET /api/dev/email-preview`: shows the delivery email
