/* Copyright 2023 Mozilla Foundation
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

import { noContextMenu, stopEvent } from "../display_utils.js";
import { RDFaBuilder } from "../../../web/rdfa/RDFaBuilder.js";
import { RDFaElement } from "../../../web/rdfa/RDFaElement.js";

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
    return name || 'toolbar.js';
  },
  timestampFormatter(date) {
    return date.toISOString();
  },
});

class EditorToolbar {
  #toolbar = null;

  #colorPicker = null;

  #editor;

  #buttons = null;

  #altText = null;

  static #l10nRemove = null;

  constructor(editor) {
    this.#editor = editor;

    EditorToolbar.#l10nRemove ||= Object.freeze({
      freetext: "pdfjs-editor-remove-freetext-button",
      highlight: "pdfjs-editor-remove-highlight-button",
      ink: "pdfjs-editor-remove-ink-button",
      stamp: "pdfjs-editor-remove-stamp-button",
    });
  }

  render() {
    const editToolbar = (this.#toolbar = document.createElement("div"));
    editToolbar.classList.add("editToolbar", "hidden");
    editToolbar.setAttribute("role", "toolbar");
    const signal = this.#editor._uiManager._signal;
    editToolbar.addEventListener("contextmenu", noContextMenu, { signal });
    editToolbar.addEventListener("pointerdown", EditorToolbar.#pointerDown, {
      signal,
    });

    const buttons = (this.#buttons = document.createElement("div"));
    buttons.className = "buttons";
    editToolbar.append(buttons);

    const position = this.#editor.toolbarPosition;
    if (position) {
      const { style } = editToolbar;
      const x =
        this.#editor._uiManager.direction === "ltr"
          ? 1 - position[0]
          : position[0];
      style.insetInlineEnd = `${100 * x}%`;
      style.top = `calc(${100 * position[1]
        }% + var(--editor-toolbar-vert-offset))`;
    }

    this.#addDeleteButton();

    return editToolbar;
  }

  get div() {
    return this.#toolbar;
  }

  static #pointerDown(e) {
    e.stopPropagation();
  }

  #focusIn(e) {
    this.#editor._focusEventsAllowed = false;
    stopEvent(e);
  }

  #focusOut(e) {
    this.#editor._focusEventsAllowed = true;
    stopEvent(e);
  }

  #addListenersToElement(element) {
    // If we're clicking on a button with the keyboard or with
    // the mouse, we don't want to trigger any focus events on
    // the editor.
    const signal = this.#editor._uiManager._signal;
    element.addEventListener("focusin", this.#focusIn.bind(this), {
      capture: true,
      signal,
    });
    element.addEventListener("focusout", this.#focusOut.bind(this), {
      capture: true,
      signal,
    });
    element.addEventListener("contextmenu", noContextMenu, { signal });
  }

  hide() {
    this.#toolbar.classList.add("hidden");
    this.#colorPicker?.hideDropdown();
  }

  show() {
    this.#toolbar.classList.remove("hidden");
    this.#altText?.shown();
  }

  #addDeleteButton() {
    const { editorType, _uiManager } = this.#editor;

    const button = document.createElement("button");
    button.className = "delete";
    button.tabIndex = 0;
    button.setAttribute("data-l10n-id", EditorToolbar.#l10nRemove[editorType]);
    this.#addListenersToElement(button);
    button.addEventListener(
      "click",
      e => {
        _uiManager.delete();
      },
      { signal: _uiManager._signal }
    );
    this.#buttons.append(button);
  }

  get #divider() {
    const divider = document.createElement("div");
    divider.className = "divider";
    return divider;
  }

  async addAltText(altText) {
    const button = await altText.render();
    this.#addListenersToElement(button);
    this.#buttons.prepend(button, this.#divider);
    this.#altText = altText;
  }

  addColorPicker(colorPicker) {
    this.#colorPicker = colorPicker;
    const button = colorPicker.renderButton();
    this.#addListenersToElement(button);
    this.#buttons.prepend(button, this.#divider);
  }

  addJanEditorTool() {
    log.info('create your own toolbar-element here')
    // I am in the right toolbar, but only for editing
    const button = document.createElement("button");
    button.className = "janTester";
    button.tabIndex = 0;
    button.setAttribute("data-l10n-id", "pdfjs-editor-janTester-button");

    const svgData = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="m3.99 16.854-1.314 3.504a.75.75 0 0 0 .966.965l3.503-1.314a3 3 0 0 0 1.068-.687L18.36 9.175s-.354-1.061-1.414-2.122c-1.06-1.06-2.122-1.414-2.122-1.414L4.677 15.786a3 3 0 0 0-.687 1.068zm12.249-12.63 1.383-1.383c.248-.248.579-.406.925-.348.487.08 1.232.322 1.934 1.025.703.703.945 1.447 1.025 1.934.058.346-.1.677-.348.925L19.774 7.76s-.353-1.06-1.414-2.12c-1.06-1.062-2.121-1.415-2.121-1.415z" fill="currentColor"/>
        </svg>
    `;
    const encodedSvg = encodeURIComponent(svgData);
    const img = document.createElement("img");
    img.src = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
    img.alt = "Edit"; // Alternative text for accessibility

    // Applying theme-dependent CSS directly
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme(mediaQuery) {
      img.style.filter = mediaQuery.matches ? 'invert(100%)' : 'invert(0%)';
    }

    applyTheme(mediaQuery); // Apply based on current theme
    mediaQuery.addListener(applyTheme); // Add listener to re-apply on theme changes

    button.append(img);
    this.#addListenersToElement(button);
    button.addEventListener("click", e => {
      const userInput = prompt("Thanks for editing me, do you have additional information I don't have yet?");
      if (userInput !== null) {
        console.log("user input edit: ", userInput);
      }
    });
    this.#buttons.append(button);
    this.#buttons.prepend(button, this.#divider);
  }

  remove() {
    this.#toolbar.remove();
    this.#colorPicker?.destroy();
    this.#colorPicker = null;
  }
}

class HighlightToolbar {
  #buttons = null;

  #toolbar = null;

  #uiManager;

  constructor(uiManager) {
    this.#uiManager = uiManager;
  }

  #render() {
    const editToolbar = (this.#toolbar = document.createElement("div"));
    editToolbar.className = "editToolbar";
    editToolbar.setAttribute("role", "toolbar");
    editToolbar.addEventListener("contextmenu", noContextMenu, {
      signal: this.#uiManager._signal,
    });

    const buttons = (this.#buttons = document.createElement("div"));
    buttons.className = "buttons";
    editToolbar.append(buttons);

    this.#addHighlightButton();

    return editToolbar;
  }

  #getLastPoint(boxes, isLTR) {
    let lastY = 0;
    let lastX = 0;
    for (const box of boxes) {
      const y = box.y + box.height;
      if (y < lastY) {
        continue;
      }
      const x = box.x + (isLTR ? box.width : 0);
      if (y > lastY) {
        lastX = x;
        lastY = y;
        continue;
      }
      if (isLTR) {
        if (x > lastX) {
          lastX = x;
        }
      } else if (x < lastX) {
        lastX = x;
      }
    }
    return [isLTR ? 1 - lastX : lastX, lastY];
  }

  show(parent, boxes, isLTR) {
    const [x, y] = this.#getLastPoint(boxes, isLTR);
    const { style } = (this.#toolbar ||= this.#render());
    parent.append(this.#toolbar);
    style.insetInlineEnd = `${100 * x}%`;
    style.top = `calc(${100 * y}% + var(--editor-toolbar-vert-offset))`;
  }

  hide() {
    this.#toolbar.remove();
  }

  #addHighlightButton() {
    const button = document.createElement("button");
    button.className = "highlightButton";
    button.tabIndex = 0;
    button.setAttribute("data-l10n-id", `pdfjs-highlight-floating-button1`);
    const span = document.createElement("span");
    button.append(span);
    span.className = "visuallyHidden";
    span.setAttribute("data-l10n-id", "pdfjs-highlight-floating-button-label");
    const signal = this.#uiManager._signal;
    button.addEventListener("contextmenu", noContextMenu, { signal });
    const myHide = () => this.hide()
    console.log('change the highlight button to WISER')

    button.addEventListener(
      "click",
      async () => {
        const selection = window.getSelection();
        const selectedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
        const uiManager = this.#uiManager
        //change for atomic
        //const myFreshModal = await setupModal(selectedRange, selection, uiManager, myHide);
        //window.wiserEventBus.emit('showModal', myFreshModal);
        document.dispatchEvent(new CustomEvent('wiserShowModal', { detail: { selectedRange, selection, uiManager, myHide } }));
        //after we release the work to react, we can hide the highlight button
        uiManager._eventBus.dispatch("switchannotationeditormode",
          {
            source: this,
            mode: 0,
          });
        myHide();
        //window.getSelection().removeAllRanges();
      },
      { signal }
    );


    this.#buttons.append(button);
  }

}

function getLastPartOfUrl(url) {
  // Split the URL by the '/' character
  const parts = url.split('/');
  // Return the last part of the array
  return parts[parts.length - 1];
}


async function setupModal(selectedRange, selection, uiManager, myHide) {
  // lame, but like this I don't have to do round-trips
  log.info('setup modal')
  let currentMessage = null;
  const selectedText = selection.toString();
  let infoToLookFor = []
  let appliedConcept = null
  let potentialSubject = null
  return {
    async render(myWorker) {
      log.info('render modal')
      const magicWord = 'magic_onSave_' + new Date().toISOString();
      const current_concept = document.getElementById("current-concept-holder").getAttribute("data-current-concept")
      const renderURL = current_concept
      appliedConcept = renderURL

      myWorker.postMessage({
        type: 'createModal',
        magic: magicWord,
        url: renderURL,
        selectedText
      });

      const reactionPromise = new Promise((resolve) => {
        const reaction = (msg) => {
          currentMessage = msg;
          //TODO: here I should receive the whole container such as
          // const container = msg.container
          window.wiserEventBus.off(magicWord, reaction);
          const myDiv = currentMessage.content;
          infoToLookFor = currentMessage.infoToLookFor
          potentialSubject = currentMessage.potentialSubject

          // Create a container for the content
          const container = document.createElement('div');
          container.className = "wiserModal";

          container.innerHTML = myDiv;
          if (currentMessage.laScript) {
            //add additional script to the DOM
            const scriptElement = document.createElement("script")
            scriptElement.type = "text/javascript"; // Ensure the script type is set
            scriptElement.textContent = currentMessage.laScript
            document.body.appendChild(scriptElement)
          }
          // Append the container to the document body or a specific element
          resolve(container.outerHTML);
        };
        window.wiserEventBus.on(magicWord, reaction);
      });

      return await reactionPromise;
    },

    //TODO: set the information on the save option in the AtomicWorker as well and use it here
    async onSave(myWorker) {
      //TODO: save it to the store
      log.info('modal onSave is still being called somehow')
      /*
        const current_concept = document.getElementById("current-concept-holder").getAttribute("data-current-concept")
        const rdfaBuilder = new RDFaBuilder();
        const container = new RDFaElement('div')
            .setVocab('http://schema.org/')
            .setTypeof(appliedConcept)
            .setAttribute('data-wiser-type', current_concept)
        for (const infoIndex of infoToLookFor) {
            const importantInfo = document.getElementById(infoIndex)
            if (infoIndex === "https://wiser-sp4.interactions.ics.unisg.ch/property/wiser-id") {
                container.setId(importantInfo.value)
                container.setAttribute('data-wiser-potential-subject', potentialSubject)
            } else if (
                infoIndex === "https://wiser-sp4.interactions.ics.unisg.ch/property/wiser-recommended" ||
                infoIndex === "https://wiser-sp4.interactions.ics.unisg.ch/property/wiser-required"
            ) {
                const infoSpan = new RDFaElement('span')
                    .setAttribute('property', infoIndex)
                    .setTextContent(importantInfo.checked);
                container.addChild(infoSpan)
            } else if (
                infoIndex === "https://wiser-sp4.interactions.ics.unisg.ch/property/wiser-image"
            ) {
                let dataImage = importantInfo.getAttribute('data-image');
                let description = importantInfo.getAttribute('data-description')
                let markdownImage = `![${description}](${dataImage})`;
                let markdownVariable = markdownImage;
                if (markdownVariable) {
                    const imageSpan = new RDFaElement('span')
                        .setAttribute('property', infoIndex)
                        .setTextContent(markdownVariable);
                    container.addChild(imageSpan)
                }
            } else {
                if (importantInfo && importantInfo.value && importantInfo.value.length > 1) {
                    const infoSpan = new RDFaElement('span')
                        .setAttribute('property', infoIndex)
                        .setTextContent(importantInfo.value);
                    container.addChild(infoSpan)
                }
            }
        }

        // this takes it from the PDF document, which might not align with the actual document
        // if it is aligned
        let viewer = document.getElementById("viewer")
        let viewerPager = viewer.getElementsByClassName("page").item(0)
        let page = viewerPager.getAttribute("data-page-number")
        // always set pdf id and page
        let pdf_name = getLastPartOfUrl(window.location.href)

        const pdfSpan = new RDFaElement('span')
            .setAttribute('property', 'https://wiser-sp4.interactions.ics.unisg.ch/property/has-pdf-id')
            .setTextContent(pdf_name)
        container.addChild(pdfSpan);

        const numberSpan = new RDFaElement('span')
            .setAttribute('property', 'https://wiser-sp4.interactions.ics.unisg.ch/property/pdf-page-number')
            .setTextContent(page)
        container.addChild(numberSpan)

        let url = window.location.href + "#page=" + page;

        const urlSpan = new RDFaElement('span')
            .setAttribute('property', 'https://wiser-sp4.interactions.ics.unisg.ch/property/wiser-url')
            .setTextContent(url)
        container.addChild(urlSpan);

        rdfaBuilder.addElement(container);

        const builtHtml = rdfaBuilder.build()
        //console.log("adding knowledge", builtHtml)

        document.getElementById('rdfa-tmp-storage').setAttribute('data-user-input', builtHtml)

        // Check if there was a saved selection
        if (selectedRange) {
            // Restore the selection
            if (selection.rangeCount > 0) selection.removeAllRanges();
            selection.addRange(selectedRange);
        }
        log.info('actually highlighting the text is done here')
        // Execute the highlight action if needed
        uiManager.highlightSelection("floating_button");

        // remove the highlight state from the tool
        uiManager._eventBus.dispatch("switchannotationeditormode",
            {
                source: this,
                mode: 0,
            });
            */

    },

    /**
     * Handles the close operation.
     */
    onClose() {
      log.info('modal onClose is still being called somehow')
      /*
        uiManager._eventBus.dispatch("switchannotationeditormode",
            {
                source: this,
                mode: 0,
            });
        myHide()
        */
    }
  };
}

export {
  EditorToolbar,
  HighlightToolbar
};
