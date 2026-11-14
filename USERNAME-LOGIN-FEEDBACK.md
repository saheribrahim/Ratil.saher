# Username-only sign-in and feedback setup

The site now shows username/password fields only. Supabase Auth still needs an internal identifier, so regular usernames map to an address under the reserved `ratil.invalid` domain; the address is not displayed or used for email. The administrator signs in with the configured admin username (`saher`) and the existing admin password.

## Required Supabase setup

1. In Supabase Dashboard → **Authentication → Sign In / Providers → Email**, turn off **Confirm email**. The generated `ratil.invalid` address cannot receive confirmation messages. Without this setting, signup will not create a usable signed-in session.
2. In **SQL Editor**, run [`supabase-feedback.sql`](supabase-feedback.sql). It creates the feedback table and row-level security rules. Only authenticated users can submit; only the configured admin email can list feedback.
3. Publish the site changes.

Feedback is displayed in the signed-in site interface for the admin account, and the admin can refresh the latest 100 submissions. Usernames are limited to 3–30 English letters, digits, dots, underscores, or hyphens; passwords must be at least 8 characters.

Existing accounts created with real email addresses are not automatically migrated to username-derived identifiers. They will need a migration or new account; do not delete the existing Supabase users until the change has been tested. There is no email-based password recovery for the generated usernames.
