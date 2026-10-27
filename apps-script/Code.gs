/** Private Google Sheets collector. Deploy as owner / access: Anyone.
 * No public endpoint returns contacts, sheet IDs, or owner information.
 */
function doGet() {
  return json_({ok:true, service:'042-release-reminders'});
}

function doPost(event) {
  var lock;
  try {
    var body = event && event.postData && event.postData.contents;
    if (!body || body.length > 2048) return json_({ok:false});
    var data = JSON.parse(body);
    if (!data || typeof data !== 'object' || data.website) return json_({ok:false});
    var channel = data.channel;
    if (channel !== 'whatsapp' && channel !== 'mail') return json_({ok:false});
    if (typeof data.contact !== 'string') return json_({ok:false});
    var contact = data.contact.trim();
    if (channel === 'whatsapp') {
      if (!/^\d{10}$/.test(contact)) return json_({ok:false});
    } else {
      contact = contact.toLowerCase();
      if (contact.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return json_({ok:false});
    }
    var sheetId = PropertiesService.getScriptProperties().getProperty('CONTACT_SHEET_ID');
    if (!sheetId) return json_({ok:false});
    // An atomic check/write keeps retries and simultaneous submissions idempotent.
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return json_({ok:false});
    var sheet = SpreadsheetApp.openById(sheetId).getSheetByName('Contactos');
    if (!sheet) return json_({ok:false});
    var key = channel + ':' + contact;
    var count = sheet.getLastRow();
    if (count > 1 && sheet.getRange(2,5,count-1,1).createTextFinder(key).matchEntireCell(true).useRegularExpression(false).findNext()) {
      return json_({ok:true});
    }
    var formatted = channel === 'whatsapp' ? contact.slice(0,2)+' '+contact.slice(2,6)+'-'+contact.slice(6) : contact;
    // User input is literal text, including addresses beginning with formula characters.
    var literal = /^[=+\-@']/.test(formatted) ? "'" + formatted : formatted;
    var row = sheet.getRange(count+1,1,1,5);
    row.setNumberFormats([['dd/MM/yyyy HH:mm:ss','@','@','@','@']]);
    row.setValues([[new Date(),channel === 'whatsapp'?'WhatsApp':'Mail',literal,'Pendiente',key]]);
    SpreadsheetApp.flush();
    return json_({ok:true});
  } catch (error) {
    // Do not return or log contact data, file identifiers, or exception details.
    return json_({ok:false});
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
