var AdmZip = require('adm-zip');
var iconv = require('iconv-lite');
var fetch = require('node-fetch');
var fs = require("fs");
var parserXml = require('xml2json');

async function parse_payments() {
  var hash = [];
  const save_path_zip = './pays.zip';
  const dir_name = "./pays/";
  try {
    const res = await fetch('http://www.cbr.ru/s/newbik');
    await new Promise(async (resolve, reject) => {
      const fileStream = fs.createWriteStream(save_path_zip);
      res.body.pipe(fileStream);
      res.body.on("error", (err) => {
          reject(err);
      });
      fileStream.on("finish", function () {
          resolve();
      });
    });
  } catch (e) {
    console.log("Err on download files ", e)
  }  

  var zip = new AdmZip(save_path_zip);
  zip.extractAllTo(dir_name, true);

  try {
    const files = fs.readdirSync(dir_name);
    files.forEach(file => {
      var xml = fs.readFileSync(dir_name + file);
      var encode_xml = iconv.decode(xml, 'win1251');
      var encode_json = JSON.parse(parserXml.toJson(encode_xml));

      encode_json.ED807.BICDirectoryEntry.forEach(entry => {
        var name_bank = entry.ParticipantInfo.NameP;
        var bic = entry.BIC;
        if(entry.hasOwnProperty("Accounts")) { 
          if(Array.isArray(entry.Accounts)) {
            entry.Accounts.forEach(account => {
              hash.push({"bic": bic, "name": name_bank, "corrAccount": account.Account});
            });
          } else {
            hash.push({"bic": bic, "name": name_bank, "corrAccount": entry.Accounts.Account});
          }
        }
      });
    });
  } catch (e) {
    console.log("Err on parse xml", e);
  }  
  return hash;
}

(async () => {
  console.log(await parse_payments());
})()