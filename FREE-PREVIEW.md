# Free homepage preview landing page

Open `/free-preview.html` on the existing static host. This is a separate UK offer page; the existing US homepage and its pricing are unchanged.

## Before accepting leads

Set these public values in `assets/js/preview-config.js`:

- `whatsappNumber`: your business WhatsApp number, including country code, digits only.
- `submissionEndpoint`: the `/exec` URL of the Google Apps Script web app set up below. Do not put secrets in browser code.

Without an endpoint, applications explain that the request has not been sent. Nothing silently discards a lead or claims a successful submission. Visitors reach `free-preview-thank-you.html` only after the endpoint replies `{ "ok": true }`.

The form POSTs JSON (as `text/plain`, so no CORS preflight is needed) with `trade`, `business`, `website` (optional), `name`, `whatsapp`, `email`, `offer`, and `source`. `whatsapp` is sent as displayed (`07700 900123`, `+44 7700 900123`, or `+` and up to 15 digits for other countries). The form keeps answers only in the current page; the thank-you page reads the first name from session storage. Network errors preserve answers for retry; a 45-second timeout prevents a stuck submit button.

### Leads to Google Sheets and email

`apps-script/lead-sheet.gs` adds each lead to a tab named after the day it arrived (UK time, created with the day's first lead) and emails `thedeveloperdudesllc@gmail.com`.

1. Signed in to Google as the account that should own the leads, create a Google Sheet.
2. In the sheet, open Extensions > Apps Script, replace the sample code with the contents of `apps-script/lead-sheet.gs`, and save.
3. Choose the `testLead` function and press Run. Approve the permission prompt. A tab with today's date and a test row should appear, and a test email should arrive.
4. Press Deploy > New deployment, choose type Web app, set Execute as: Me and Who has access: Anyone, then Deploy.
5. Copy the web app URL (it ends in `/exec`) into `submissionEndpoint`. Opening that URL in a browser should show `{"ok":true,"service":"free-preview-leads"}`.

After editing the script later, use Deploy > Manage deployments > Edit > New version so the same URL serves the new code.

Confirm that the existing linked privacy policy and terms cover this UK £39/month offer before publishing. Domain registration costs, cancellation terms and delivery time guarantees have not been invented.

## Behaviour

- Hero screenshot: supplied Plumber Bro capture, optimised to WebP. Transform-only 34-second scroll in each direction, short holds at the ends, pause/play control, pauses off-screen, when hidden and on mouse hover. Reduced-motion visitors start with a static preview.
- Portfolio: four scrollable full-page images in a native dialog, with Escape dismissal and focus restoration.
- Application: six steps including review; keyboard navigation, validation and back navigation. There is no consent checkbox.
- No dependencies or build step added. Uses the existing brand stylesheet and page-scoped CSS/JS.

For a local preview, serve the repository with a static HTTP server and visit `/free-preview.html`.
