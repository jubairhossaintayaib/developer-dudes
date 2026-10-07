/**
 * Lead handling for Developer Dudes. Lives inside a Google Sheet (Extensions > Apps Script)
 * and sends a notification email for every new lead.
 *
 * Meta instant-form leads: Meta's own Google Sheets connection writes them to FACEBOOK_TAB.
 * Run installFacebookSync once; from then on every new row there is emailed within a minute.
 *
 * Landing page leads (free-preview.html): the form posts here and each lead is added to
 * WEBSITE_TAB. Deploy as a web app (Execute as: Me, Who has access: Anyone) and put the
 * /exec URL in assets/js/preview-config.js as submissionEndpoint.
 *
 * Lead quality for Meta: each landing page lead has a Status. Run installMetaUpdates once;
 * from then on a new lead, and every change of Status, is reported to Meta so it can learn
 * which leads turn into customers. The access token is read from the script property
 * META_ACCESS_TOKEN and is never written in this file.
 */
const NOTIFY_EMAIL = 'thedeveloperdudesllc@gmail.com';
const TIME_ZONE = 'Europe/London';
// The tab Meta writes instant-form leads to. Only read from here: Meta owns its columns
// and reads lead_status back from it.
const FACEBOOK_TAB = 'Facebook Leads';
// How many runs to keep trying a row that can't be emailed before reporting it instead.
const FACEBOOK_ATTEMPTS = 5;
// Which instant-form column feeds each field: the first heading containing one of these wins.
const FACEBOOK_FIELDS = {
  trade: ['trade'],
  business: ['company', 'business'],
  website: ['website'],
  name: ['full_name', 'first_name'],
  whatsapp: ['whatsapp', 'phone'],
  email: ['email']
};
// Extra lines for the email, taken from Meta's own columns when they are filled in.
const FACEBOOK_EXTRAS = [['Ad', 'ad_name'], ['Ad set', 'adset_name'], ['Campaign', 'campaign_name'], ['Platform', 'platform']];
// The single tab landing page leads are added to.
const WEBSITE_TAB = 'Website Leads';
// Column heading, and the field it comes from in the form's JSON (null = time received).
const COLUMNS = [
  ['Received', null],
  ['Trade', 'trade'],
  ['Business', 'business'],
  ['Website', 'website'],
  ['Name', 'name'],
  ['WhatsApp', 'whatsapp'],
  ['Email', 'email'],
  ['Source', 'source'],
  // Quiz answers. New columns go on the end so rows already in the sheet stay lined up.
  // The quiz no longer asks for an email; the Email column stays for the same reason.
  ['Found on Google', 'findable'],
  ['Work comes from', 'work_source'],
  ['Extra jobs would mean', 'extra_jobs'],
  // Lead quality for Meta: the stage the lead has reached, when Meta was last told, and
  // Meta's own cookies from the visit, which let it match the lead to the ad that was clicked.
  ['Status', 'status'],
  ['Sent to Meta', 'meta_sent'],
  ['Meta click ID', 'fbc'],
  ['Meta browser ID', 'fbp']
];
// Stages a lead moves through, in order. The first is set when the lead arrives.
const STATUSES = ['New', 'Contacted', 'Qualified', 'Preview sent', 'Converted', 'Not qualified'];
// Fields kept in the sheet but left out of the notification email.
const NOT_IN_EMAIL = ['status', 'meta_sent', 'fbc', 'fbp'];
const META_DATASET_ID = '1133759729576559';
const META_API_VERSION = 'v26.0';

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const lead = readLead(e);
    const received = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
    const sheet = getWebsiteSheet();
    sheet.appendRow(COLUMNS.map(([, field]) => asText(field ? lead[field] : received)));
    // The lead is saved at this point, so a problem with the email or with Meta must not
    // make the form report a failure.
    try {
      notify(lead, received, sheet, []);
    } catch (mailError) {
      console.error('Lead saved but notification failed: ' + mailError);
    }
    try {
      const sent = sendStageToMeta(lead, lead.status);
      if (sent) sheet.getRange(sheet.getLastRow(), columnOf('meta_sent')).setValue(asText(sent));
    } catch (metaError) {
      console.error('Lead saved but not reported to Meta: ' + metaError);
    }
    return respond({ ok: true });
  } catch (error) {
    return respond({ ok: false, error: String((error && error.message) || error) });
  } finally {
    lock.releaseLock();
  }
}

// Opening the web app URL in a browser shows this, which confirms the deployment is live.
// The version says which copy of this script is deployed: 3 is the first that accepts a
// lead without an email address, which the landing page quiz relies on; 4 adds the Status
// column and reports lead stages to Meta.
function doGet() {
  return respond({ ok: true, service: 'free-preview-leads', version: 4 });
}

function readLead(e) {
  const data = JSON.parse(e.postData.contents);
  const lead = {};
  COLUMNS.forEach(([, field]) => {
    // Meta's click ID can be long, so it gets more room than a typed answer.
    const limit = field === 'fbc' || field === 'fbp' ? 1000 : 300;
    if (field) lead[field] = String(data[field] == null ? '' : data[field]).replace(/\s+/g, ' ').trim().slice(0, limit);
  });
  if (!lead.name || !lead.business || !lead.whatsapp) throw new Error('Missing required fields');
  // These two are ours to set, whatever the request says.
  lead.status = STATUSES[0];
  lead.meta_sent = '';
  return lead;
}

// Created after the existing tabs the first time a landing page lead arrives.
function getWebsiteSheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(WEBSITE_TAB);
  if (!sheet) {
    sheet = book.insertSheet(WEBSITE_TAB, book.getNumSheets());
    sheet.getRange(1, 1, sheet.getMaxRows(), COLUMNS.length).setNumberFormat('@');
    sheet.appendRow(COLUMNS.map(([title]) => title));
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else if (sheet.getLastColumn() < COLUMNS.length) {
    // The tab was made before the newest columns existed: extend its headings to match.
    sheet.getRange(1, 1, sheet.getMaxRows(), COLUMNS.length).setNumberFormat('@');
    sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS.map(([title]) => title)]).setFontWeight('bold');
  } else {
    return sheet;
  }
  // Status is picked from a list, though anything typed in is accepted and sent as it is.
  const choices = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(true).build();
  sheet.getRange(2, columnOf('status'), sheet.getMaxRows() - 1, 1).setDataValidation(choices);
  return sheet;
}

// Position in the sheet (1 = column A) of the column fed by a field.
function columnOf(field) {
  return COLUMNS.findIndex(column => column[1] === field) + 1;
}

// The leading apostrophe makes Sheets store the value as plain text, so phone numbers keep
// their leading 0 and nothing a visitor types can run as a formula.
function asText(value) {
  return "'" + value;
}

function notify(lead, received, sheet, extraLines) {
  const link = SpreadsheetApp.getActiveSpreadsheet().getUrl() + '#gid=' + sheet.getSheetId();
  const lines = COLUMNS.filter(([, field]) => field && lead[field] && NOT_IN_EMAIL.indexOf(field) === -1)
    .map(([title, field]) => title + ': ' + lead[field]);
  const message = {
    to: NOTIFY_EMAIL,
    subject: 'New lead: ' + (lead.business || lead.name || lead.whatsapp || lead.email),
    body: lines.concat(extraLines).join('\n') + '\n\nReceived: ' + received + ' (UK time)\nSheet: ' + link
  };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) message.replyTo = lead.email;
  MailApp.sendEmail(message);
}

function respond(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Emails every instant-form lead that has arrived in FACEBOOK_TAB since the last run.
 * Runs on a timer set up by installFacebookSync. The leads themselves stay where Meta put them.
 */
function syncFacebookLeads() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    const book = SpreadsheetApp.getActiveSpreadsheet();
    const source = book.getSheetByName(FACEBOOK_TAB);
    if (!source) {
      console.log('No "' + FACEBOOK_TAB + '" tab in this spreadsheet.');
      return;
    }
    const props = PropertiesService.getScriptProperties();
    const lastRow = source.getLastRow();
    // Rows already handled, counting the heading row. If rows were deleted, start from the end.
    let done = Number(props.getProperty('facebookRowsDone')) || 1;
    if (done > lastRow) done = lastRow;
    let emailed = 0;
    if (lastRow > done) {
      const width = source.getLastColumn();
      const headings = source.getRange(1, 1, 1, width).getDisplayValues()[0].map(h => h.toLowerCase());
      const columns = { created: headings.indexOf('created_time') };
      Object.keys(FACEBOOK_FIELDS).forEach(field => {
        columns[field] = -1;
        for (const part of FACEBOOK_FIELDS[field]) {
          const index = headings.findIndex(h => h.indexOf(part) !== -1);
          if (index !== -1) { columns[field] = index; break; }
        }
      });
      const extras = FACEBOOK_EXTRAS.map(([title, heading]) => [title, headings.indexOf(heading)]);

      const rows = source.getRange(done + 1, 1, lastRow - done, width).getDisplayValues();
      for (const row of rows) {
        const rowNumber = done + 1;
        try {
          emailFacebookLead(row, columns, extras, source);
          emailed += 1;
        } catch (error) {
          // Meta may still be filling the row in, or Google had a passing problem: leave the
          // row for the next few runs before giving up on it.
          const sameRow = Number(props.getProperty('facebookRetryRow')) === rowNumber;
          const attempts = (sameRow ? Number(props.getProperty('facebookRetries')) : 0) + 1;
          console.error('Row ' + rowNumber + ' not emailed (attempt ' + attempts + '): ' + error);
          if (attempts < FACEBOOK_ATTEMPTS) {
            props.setProperty('facebookRetryRow', String(rowNumber));
            props.setProperty('facebookRetries', String(attempts));
            break;
          }
          if (row.join('').trim()) reportSkippedRow(book, rowNumber, error);
        }
        // Saved row by row, so a later failure never emails an earlier lead twice.
        done = rowNumber;
        props.setProperty('facebookRowsDone', String(done));
      }
    }
    props.setProperty('facebookRowsDone', String(done));
    console.log('Emailed ' + emailed + ' new lead(s). Handled up to row ' + done + ' of ' + lastRow + '.');
  } finally {
    lock.releaseLock();
  }
}

function emailFacebookLead(row, columns, extras, sheet) {
  const lead = { source: 'facebook-form' };
  Object.keys(FACEBOOK_FIELDS).forEach(field => {
    lead[field] = columns[field] === -1 ? '' : row[columns[field]].replace(/\s+/g, ' ').trim().slice(0, 300);
  });
  if (!lead.name && !lead.whatsapp && !lead.email) throw new Error('No name, phone or email in this row yet');
  const stamp = columns.created === -1 ? NaN : new Date(row[columns.created]).getTime();
  const received = Utilities.formatDate(isNaN(stamp) ? new Date() : new Date(stamp), TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
  const extraLines = extras
    .filter(([, index]) => index !== -1 && row[index].trim())
    .map(([title, index]) => title + ': ' + row[index].trim());
  notify(lead, received, sheet, extraLines);
}

// A lead is never dropped silently: if a row can't be emailed properly, say so.
function reportSkippedRow(book, rowNumber, error) {
  try {
    MailApp.sendEmail(NOTIFY_EMAIL, 'A Facebook lead needs checking',
      'Row ' + rowNumber + ' of the "' + FACEBOOK_TAB + '" tab could not be read as a lead.\n\n' +
      'Reason: ' + error + '\n\nSheet: ' + book.getUrl());
  } catch (mailError) {
    console.error('Could not report row ' + rowNumber + ': ' + mailError);
  }
}

/** Run once from the editor: checks for new instant-form leads every minute from then on. */
function installFacebookSync() {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'syncFacebookLeads')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('syncFacebookLeads').timeBased().everyMinutes(1).create();
  syncFacebookLeads();
}

/**
 * Reports a lead's stage to Meta through the Conversions API, as a CRM event. Returns a
 * short note for the Sent to Meta column, or '' when no access token has been set up.
 */
function sendStageToMeta(lead, stage) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('META_ACCESS_TOKEN');
  if (!token || !stage) return '';
  // Meta matches on hashed details: lower case, no spaces, phone as digits with country code.
  const names = String(lead.name || '').toLowerCase().split(' ').filter(Boolean);
  const user = {};
  const phone = metaPhone(lead.whatsapp);
  if (phone) user.ph = [sha256(phone)];
  if (lead.email) user.em = [sha256(String(lead.email).toLowerCase())];
  if (names.length) user.fn = [sha256(names[0])];
  if (names.length > 1) user.ln = [sha256(names[names.length - 1])];
  if (lead.fbc) user.fbc = lead.fbc;
  if (lead.fbp) user.fbp = lead.fbp;
  const payload = { data: [{
    event_name: stage,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'system_generated',
    custom_data: { event_source: 'crm', lead_event_source: 'Google Sheets' },
    user_data: user
  }] };
  // Set META_TEST_EVENT_CODE while testing to see events in Events Manager's Test events tab.
  const testCode = props.getProperty('META_TEST_EVENT_CODE');
  if (testCode) payload.test_event_code = testCode;
  const response = UrlFetchApp.fetch(
    'https://graph.facebook.com/' + META_API_VERSION + '/' + META_DATASET_ID + '/events?access_token=' + encodeURIComponent(token),
    { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  const when = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd HH:mm');
  if (response.getResponseCode() === 200) return stage + ' sent ' + when;
  let reason = 'HTTP ' + response.getResponseCode();
  try {
    reason = JSON.parse(response.getContentText()).error.message;
  } catch (_) {}
  return stage + ' failed ' + when + ': ' + reason;
}

// 07700 900123 and +44 7700 900123 both become 447700900123.
function metaPhone(value) {
  const text = String(value || '').trim();
  const digits = text.replace(/\D/g, '');
  if (text.charAt(0) === '+') return digits;
  if (digits.indexOf('00') === 0) return digits.slice(2);
  return digits.charAt(0) === '0' ? '44' + digits.slice(1) : digits;
}

function sha256(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8)
    .map(byte => ('0' + ((byte + 256) % 256).toString(16)).slice(-2)).join('');
}

/**
 * Runs when a cell is edited by hand (set up by installMetaUpdates). A change in the Status
 * column of WEBSITE_TAB is reported to Meta, and the outcome is noted beside it.
 */
function reportStatusChange(e) {
  const sheet = e.range.getSheet();
  const status = columnOf('status');
  if (sheet.getName() !== WEBSITE_TAB || e.range.getColumn() > status || e.range.getLastColumn() < status) return;
  for (let row = Math.max(2, e.range.getRow()); row <= e.range.getLastRow(); row += 1) {
    const values = sheet.getRange(row, 1, 1, COLUMNS.length).getDisplayValues()[0];
    const lead = {};
    COLUMNS.forEach(([, field], index) => { if (field) lead[field] = values[index].trim(); });
    if (!lead.status || !lead.whatsapp) continue;
    let note;
    try {
      note = sendStageToMeta(lead, lead.status) || 'Not sent: no META_ACCESS_TOKEN set';
    } catch (error) {
      note = lead.status + ' failed: ' + error;
    }
    sheet.getRange(row, columnOf('meta_sent')).setValue(asText(note));
  }
}

/**
 * Run once from the editor, after saving the access token as the script property
 * META_ACCESS_TOKEN: adds the Status columns to WEBSITE_TAB and starts reporting changes.
 */
function installMetaUpdates() {
  if (!PropertiesService.getScriptProperties().getProperty('META_ACCESS_TOKEN')) {
    throw new Error('Add the script property META_ACCESS_TOKEN first (Project Settings > Script properties).');
  }
  getWebsiteSheet();
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'reportStatusChange')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('reportStatusChange').forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet()).onEdit().create();
  console.log('Ready. Change a Status in the "' + WEBSITE_TAB + '" tab and watch the Sent to Meta column.');
}

/** Run from the editor to check the landing page path: adds a test row and sends a test email. */
function testLead() {
  const result = doPost({ postData: { contents: JSON.stringify({
    trade: 'Roofing', business: 'Test Roofing Co', website: '', name: 'Test Person',
    whatsapp: '07700 900123', source: 'manual-test'
  }) } });
  Logger.log(result.getContent());
}
