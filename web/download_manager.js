/* Copyright 2013 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** @typedef {import("./interfaces").IDownloadManager} IDownloadManager */

import { createValidAbsoluteUrl, isPdfFile } from "pdfjs-lib";
import log from 'loglevel'
import prefix from "loglevel-plugin-prefix";

log.noConflict()
prefix.reg(log);

prefix.apply(log, {
  template: '[%t] %l (%n):',
  levelFormatter(level) {
    return level.toUpperCase();
  },
  nameFormatter(name) {
    return name || 'download_manager.js';
  },
  timestampFormatter(date) {
    return date.toISOString();
  },
});

if (typeof PDFJSDev !== "undefined" && !PDFJSDev.test("CHROME || GENERIC")) {
  throw new Error(
    'Module "pdfjs-web/download_manager" shall not be used ' +
    "outside CHROME and GENERIC builds."
  );
}

function download(blobUrl, filename) {
  const a = document.createElement("a");
  if (!a.click) {
    throw new Error('DownloadManager: "a.click()" is not supported.');
  }
  a.href = blobUrl;
  a.target = "_parent";
  // Use a.download if available. This increases the likelihood that
  // the file is downloaded instead of opened by another PDF plugin.
  if ("download" in a) {
    a.download = filename;
  }
  // <a> must be in the document for recent Firefox versions,
  // otherwise .click() is ignored.
  (document.body || document.documentElement).append(a);
  a.click();
  a.remove();
}
/*
function saveToServer(blob, filename, savingDone) {
    log.info('saveToServer', 'saving it to Atomic')
    let method = 'POST'
    if(savingDone){
        method = 'PUT'
    }
    // Create a FormData object to send the blob
    const formData = new FormData();
    formData.append('file', blob, filename);

    fetch('/v1/api/pdf', {
        method,
        body: formData
    }).then(response => {
        if (response.ok) {
            log.info('download_manager.js', 'saveToServer', 'saving was successful', filename)
        } else {
            console.error('Failed to save the file.');
        }
    }).catch(error => {
        console.error('Error saving file:', error);
    });
}
    */

function saveToServer(blob, filename, savingDone) {
  log.info('saveToServer', 'saving it to Atomic');
  let method = 'POST';

  // Create a FormData object to send the blob
  const formData = new FormData();
  formData.append('file', blob, filename);

  const url = new URL('https://wiser-atomic.tunnelto.dev/upload');
  url.searchParams.append('parent', 'https://wiser-atomic.tunnelto.dev/files');

  fetch(url, {
    method,
    body: formData,
    headers: {
      // 'Content-Type': 'multipart/form-data' // This header should not be set, browser will set it automatically
    }
  }).then(response => {
    if (response.ok) {
      log.info('download_manager.js', 'saveToServer', 'saving was successful', filename);
      window.alert('The file was saved successfully.');
      window.location.href = window.location.href + '?timestamp=12345';
      window.location.reload();
    } else {
      console.error('Failed to save the file.');
    }
  }).catch(error => {
    console.error('Error saving file:', error);
  });
}

/**
 * @implements {IDownloadManager}
 */
class DownloadManager {
  #openBlobUrls = new WeakMap();

  downloadData(data, filename, contentType) {
    const blobUrl = URL.createObjectURL(
      new Blob([data], { type: contentType })
    );
    download(blobUrl, filename);
  }

  /**
   * @returns {boolean} Indicating if the data was opened.
   */
  openOrDownloadData(data, filename, dest = null) {
    const isPdfData = isPdfFile(filename);
    const contentType = isPdfData ? "application/pdf" : "";

    if (
      (typeof PDFJSDev === "undefined" || !PDFJSDev.test("COMPONENTS")) &&
      isPdfData
    ) {
      let blobUrl = this.#openBlobUrls.get(data);
      if (!blobUrl) {
        blobUrl = URL.createObjectURL(new Blob([data], { type: contentType }));
        this.#openBlobUrls.set(data, blobUrl);
      }
      let viewerUrl;
      if (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) {
        // The current URL is the viewer, let's use it and append the file.
        viewerUrl = "?file=" + encodeURIComponent(blobUrl + "#" + filename);
      } else if (PDFJSDev.test("CHROME")) {
        // In the Chrome extension, the URL is rewritten using the history API
        // in viewer.js, so an absolute URL must be generated.
        viewerUrl =
          // eslint-disable-next-line no-undef
          chrome.runtime.getURL("/content/web/viewer.html") +
          "?file=" +
          encodeURIComponent(blobUrl + "#" + filename);
      }
      if (dest) {
        viewerUrl += `#${escape(dest)}`;
      }

      try {
        window.open(viewerUrl);
        return true;
      } catch (ex) {
        console.error("openOrDownloadData:", ex);
        // Release the `blobUrl`, since opening it failed, and fallback to
        // downloading the PDF file.
        URL.revokeObjectURL(blobUrl);
        this.#openBlobUrls.delete(data);
      }
    }

    this.downloadData(data, filename, contentType);
    return false;
  }

  download(data, url, filename) {
    log.info('special download version for WISER')
    /*
    const saveKGButton = document.getElementById("saveKnowledge")
    let savingDone = saveKGButton.getAttribute("saving-done")
    let choice = false
    let finalFilename = filename
    // if saving-done is true, we don't have to ask, we go directly to update
    if(!savingDone){
      const finalFilename = prompt("Please enter the filename:", filename);
      // Ask user whether they want to save it to the server or download the PDF
      choice = confirm("Do you want to save it to the server? Click 'OK' to save to server, 'Cancel' to download the PDF.");
    }
    if (choice || savingDone) {
      // User chose to save it to the server
      saveToServer(new Blob([data], { type: "application/pdf" }), finalFilename, savingDone);
      // allow the saving of knowledge now
      const subTitleComponent = document.getElementById("myPDFTitle")
      if(subTitleComponent){
          subTitleComponent.textContent = subTitleComponent.textContent.replace("*","")
      }
      if(saveKGButton){
          // remove the saving done for sure
          saveKGButton.removeAttribute("saving-done")
      }
    }else{
      let blobUrl;
      if (data) {
          blobUrl = URL.createObjectURL(
              new Blob([data], { type: "application/pdf" })
          );
      } else {
          if (!createValidAbsoluteUrl(url, "http://example.com")) {
              console.error(`download - not a valid URL: ${url}`);
              return;
          }
          blobUrl = url + "#pdfjs.action=download";
      }
      download(blobUrl, filename);
    }
    */
    saveToServer(new Blob([data], { type: "application/pdf" }), filename, false);
  }

}

export { DownloadManager };
