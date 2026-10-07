# Free homepage preview landing page

Open `/free-preview.html` on the existing static host. This is a separate offer page from the main site's homepage.

## Before accepting leads

Set these public values in `assets/js/preview-config.js`:

- `whatsappNumber`: your business WhatsApp number, including country code, digits only.
- `submissionEndpoint`: the `/exec` URL of the Google Apps Script web app set up below. Do not put secrets in browser code.

Meta's pixel snippet (dataset "DD", ID 1133759729576559) is pasted in the `<head>` of `free-preview.html` and `free-preview-thank-you.html`, and sends PageView on both. Meta's Lead event code sits in the `<head>` of the thank-you page, so Lead is sent every time that page loads. There is no cookie consent banner; the pixel loads for every visitor.

Without an endpoint, applications explain that the request has not been sent. With one, the form sends the lead and opens `free-preview-thank-you.html` about a second later without waiting for Google's reply, so the Lead event is not lost to the wait. A connection failure inside that second keeps the visitor on the form with an error; a failure after it is not seen by the visitor.

The form POSTs JSON (as `text/plain`, so no CORS preflight is needed) with the quiz answers (`trade`, `website`, `findable`, `work_source`, `extra_jobs`), the contact details (`business`, `name`, `whatsapp`), `offer`, and `source`. No email is collected, so the deployed script must be version 3 or later: an older deployment rejects a lead without an email, and the page would not see that rejection. `whatsapp` is sent as displayed (`07700 900123`, `+44 7700 900123`, or `+` and up to 15 digits for other countries). The form keeps answers only in the current page; the thank-you page reads the first name from session storage. An immediate network error preserves the answers for retry.

### Leads to Google Sheets and email

`apps-script/lead-sheet.gs` adds each landing page lead to the `Website Leads` tab (created with the first lead) and emails `thedeveloperdudesllc@gmail.com`.

1. Signed in to Google as the account that should own the leads, create a Google Sheet.
2. In the sheet, open Extensions > Apps Script, replace the sample code with the contents of `apps-script/lead-sheet.gs`, and save.
3. Choose the `testLead` function and press Run. Approve the permission prompt. A `Website Leads` tab with a test row should appear, and a test email should arrive.
4. Press Deploy > New deployment, choose type Web app, set Execute as: Me and Who has access: Anyone, then Deploy.
5. Copy the web app URL (it ends in `/exec`) into `submissionEndpoint`. Opening that URL in a browser should show `{"ok":true,"service":"free-preview-leads","version":3}`.

After editing the script later, use Deploy > Manage deployments > Edit > New version so the same URL serves the new code.

### Meta instant-form leads

Meta's own Google Sheets connection (Business Suite > Instant Forms > CRM Setup) writes instant-form leads to the `Facebook Leads` tab and reads `lead_status` back from it. Run `installFacebookSync` once from the Apps Script editor: every minute it emails any new row in that tab. The leads stay where Meta put them. A row that can't be emailed is retried for a few minutes and then reported rather than dropped. The script only reads the `Facebook Leads` tab, so keep that tab's name and row order as Meta leaves them.

Confirm that the existing linked privacy policy and terms cover this UK £39/month offer before publishing. Domain registration costs, cancellation terms and delivery time guarantees have not been invented.

## Behaviour

- Hero screenshot: supplied Plumber Bro capture, optimised to WebP. Transform-only 34-second scroll in each direction, short holds at the ends, pause/play control, pauses off-screen, when hidden and on mouse hover. Reduced-motion visitors start with a static preview.
- Portfolio: four scrollable full-page images in a native dialog, with Escape dismissal and focus restoration.
- Quiz: five questions answered with one tap each, which moves straight to the next question, then a result written from the answers with the three contact fields and the submit button. Letter keys and Enter work on the answers; Back keeps earlier answers. There is no consent checkbox.
- No dependencies or build step added. Uses the existing brand stylesheet and page-scoped CSS/JS.

For a local preview, serve the repository with a static HTTP server and visit `/free-preview.html`.
