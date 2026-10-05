/**
 * Lead intake for the free preview landing page (free-preview.html).
 *
 * Lives inside a Google Sheet (Extensions > Apps Script). Each lead is added to a tab
 * named after the day it arrived, and a notification email is sent for every lead.
 * Deploy as a web app (Execute as: Me, Who has access: Anyone) and put the /exec URL
 * in assets/js/preview-config.js as submissionEndpoint.
 */
const NOTIFY_EMAIL = 'thedeveloperdudesllc@gmail.com';
const TIME_ZONE = 'Europe/London';
// Column heading, and the field it comes from in the form's JSON (null = time received).
const COLUMNS = [
  ['Received', null],
  ['Trade', 'trade'],
  ['Business', 'business'],
  ['Website', 'website'],
  ['Name', 'name'],
  ['WhatsApp', 'whatsapp'],
  ['Email', 'email'],
  ['Source', 'source']
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const lead = readLead(e);
    const now = new Date();
    const received = Utilities.formatDate(now, TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
    const sheet = getDaySheet(now);
    sheet.appendRow(COLUMNS.map(([, field]) => asText(field ? lead[field] : received)));
    // The lead is saved at this point, so a mail problem must not make the form report a failure.
    try {
      notify(lead, received, sheet);
    } catch (mailError) {
      console.error('Lead saved but notification failed: ' + mailError);
    }
    return respond({ ok: true });
  } catch (error) {
    return respond({ ok: false, error: String((error && error.message) || error) });
  } finally {
    lock.releaseLock();
  }
}

// Opening the web app URL in a browser shows this, which confirms the deployment is live.
function doGet() {
  return respond({ ok: true, service: 'free-preview-leads' });
}

function readLead(e) {
  const data = JSON.parse(e.postData.contents);
  const lead = {};
  COLUMNS.forEach(([, field]) => {
    if (field) lead[field] = String(data[field] == null ? '' : data[field]).replace(/\s+/g, ' ').trim().slice(0, 300);
  });
  if (!lead.name || !lead.business || !lead.whatsapp || !lead.email) throw new Error('Missing required fields');
  return lead;
}

// One tab per day, newest first, created when the day's first lead arrives.
function getDaySheet(date) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const name = Utilities.formatDate(date, TIME_ZONE, 'yyyy-MM-dd');
  let sheet = book.getSheetByName(name);
  if (!sheet) {
    sheet = book.insertSheet(name, 0);
    sheet.getRange(1, 1, sheet.getMaxRows(), COLUMNS.length).setNumberFormat('@');
    sheet.appendRow(COLUMNS.map(([title]) => title));
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// The leading apostrophe makes Sheets store the value as plain text, so phone numbers keep
// their leading 0 and nothing a visitor types can run as a formula.
function asText(value) {
  return "'" + value;
}

function notify(lead, received, sheet) {
  const link = SpreadsheetApp.getActiveSpreadsheet().getUrl() + '#gid=' + sheet.getSheetId();
  const lines = COLUMNS.filter(([, field]) => field).map(([title, field]) => title + ': ' + (lead[field] || '-'));
  const message = {
    to: NOTIFY_EMAIL,
    subject: 'New free preview request: ' + lead.business,
    body: lines.join('\n') + '\n\nReceived: ' + received + ' (UK time)\nSheet: ' + link
  };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) message.replyTo = lead.email;
  MailApp.sendEmail(message);
}

function respond(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor: grants permissions, then adds a test row and sends a test email. */
function testLead() {
  const result = doPost({ postData: { contents: JSON.stringify({
    trade: 'Roofing', business: 'Test Roofing Co', website: '', name: 'Test Person',
    whatsapp: '07700 900123', email: 'test@example.com', source: 'manual-test'
  }) } });
  Logger.log(result.getContent());
}
