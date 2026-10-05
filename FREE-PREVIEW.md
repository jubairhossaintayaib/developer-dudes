# Free homepage preview landing page

Open `/free-preview.html` on the existing static host. This is a separate UK offer page; the existing US homepage and its pricing are unchanged.

## Before accepting leads

Set these public values in `assets/js/preview-config.js`:

- `whatsappNumber`: your business WhatsApp number, including country code, digits only.
- `submissionEndpoint`: a public JSON lead intake URL. The form sends a POST and displays success only after an HTTP 2xx response. The endpoint must validate the request, deliver/store leads, rate-limit abuse, and allow this site's origin if cross-origin. Do not put secrets in browser code.

Without configuration, WhatsApp opens an email contact fallback and applications explain that the request has not been sent. Nothing silently discards a lead or claims a successful submission. No external form provider has been selected, no account created, and no test leads sent.

The JSON request includes `trade`, `business`, `website` (optional), `area`, `name`, `whatsapp`, `email`, `consent`, `consentVersion`, `offer`, and `source`. `whatsapp` preserves the applicant's input, so normalise it on the receiving service. The form keeps answers only in the current page, not local storage. Network errors preserve answers for retry; a 20-second timeout prevents a stuck submit button.

Confirm that the existing linked privacy policy and terms cover this UK £39/month offer before publishing. Domain registration costs, cancellation terms and delivery time guarantees have not been invented.

## Behaviour

- Hero screenshot: supplied Plumber Bro capture, optimised to WebP. Transform-only 34-second scroll in each direction, short holds at the ends, pause/play control, pauses off-screen, when hidden and on mouse hover. Reduced-motion visitors start with a static preview.
- Portfolio: four scrollable full-page images in a native dialog, with Escape dismissal and focus restoration.
- Application: seven steps including review; keyboard navigation, validation, back navigation and contact consent.
- No dependencies or build step added. Uses the existing brand stylesheet and page-scoped CSS/JS.

For a local preview, serve the repository with a static HTTP server and visit `/free-preview.html`.
