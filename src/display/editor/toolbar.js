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

import { noContextMenu } from "../display_utils.js";

class EditorToolbar {
  #toolbar = null;

  #colorPicker = null;

  #editor;

  #buttons = null;

  constructor(editor) {
    this.#editor = editor;
  }

  render() {
    const editToolbar = (this.#toolbar = document.createElement("div"));
    editToolbar.className = "editToolbar";
    editToolbar.setAttribute("role", "toolbar");
    editToolbar.addEventListener("contextmenu", noContextMenu);
    editToolbar.addEventListener("pointerdown", EditorToolbar.#pointerDown);

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

  static #pointerDown(e) {
    e.stopPropagation();
  }

  #focusIn(e) {
    this.#editor._focusEventsAllowed = false;
    e.preventDefault();
    e.stopPropagation();
  }

  #focusOut(e) {
    this.#editor._focusEventsAllowed = true;
    e.preventDefault();
    e.stopPropagation();
  }

  #addListenersToElement(element) {
    // If we're clicking on a button with the keyboard or with
    // the mouse, we don't want to trigger any focus events on
    // the editor.
    element.addEventListener("focusin", this.#focusIn.bind(this), {
      capture: true,
    });
    element.addEventListener("focusout", this.#focusOut.bind(this), {
      capture: true,
    });
    element.addEventListener("contextmenu", noContextMenu);
  }

  hide() {
    this.#toolbar.classList.add("hidden");
    this.#colorPicker?.hideDropdown();
  }

  show() {
    this.#toolbar.classList.remove("hidden");
  }

  #addDeleteButton() {
    const button = document.createElement("button");
    button.className = "delete";
    button.tabIndex = 0;
    button.setAttribute(
      "data-l10n-id",
      `pdfjs-editor-remove-${this.#editor.editorType}-button`
    );
    this.#addListenersToElement(button);
    button.addEventListener("click", e => {
      this.#editor._uiManager.delete();
    });
    this.#buttons.append(button);
  }

  get #divider() {
    const divider = document.createElement("div");
    divider.className = "divider";
    return divider;
  }

  addAltTextButton(button) {
    this.#addListenersToElement(button);
    this.#buttons.prepend(button, this.#divider);
  }

  addColorPicker(colorPicker) {
    this.#colorPicker = colorPicker;
    const button = colorPicker.renderButton();
    this.#addListenersToElement(button);
    this.#buttons.prepend(button, this.#divider);
  }

  addJanEditorTool() {
    // I am in the right toolbar, but only for editing
    const button = document.createElement("button");
    button.className = "janTester";
    button.tabIndex = 0;
    button.setAttribute("data-l10n-id", `pdfjs-editor-janTester-button`);
    const img = document.createElement("img");
    img.src = "images/annotation-key.svg"; // Path to the SVG file
    img.style.width = "50%"; // Set width to 50% of its original size
    img.style.height = "auto"; // Maintain the aspect ratio
    img.alt = "Annotation Note"; // Alternative text for accessibility
    button.append(img);
    this.#addListenersToElement(button);
    button.addEventListener("click", e => {
      const userInput = prompt(
        "Thanks for editing me, do you have additional information I don't have yet?"
      );
      if (userInput !== null) {
        // Check if the user clicked "OK"
        console.log("user input edit: ", userInput);
      }
    });
    this.#buttons.append(button);
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
    editToolbar.addEventListener("contextmenu", noContextMenu);

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
    button.addEventListener("contextmenu", noContextMenu);

    // Create dialog element
    const dialog = document.createElement("dialog");
    dialog.setAttribute("id", "userInputDialog");
    dialog.style.width = '300px'; // Set the width of the dialog
    dialog.style.border = '1px solid #ccc'; // Set the border of the dialog
    dialog.style.borderRadius = '10px'; // Rounded corners for the dialog
    dialog.style.padding = '20px'; // Padding inside the dialog
    dialog.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'; // Drop shadow for 3D effect
    dialog.style.backgroundColor = '#fff'; // Background color of the dialog
    dialog.innerHTML = `
        <form method="dialog">
            <h1 style="margin-bottom: 20px; color: black;" data-l10n-id="pdfjs-editor-janTester-title">Knowledge Annotator</h1>
            <label for="input" style="display: block; margin-bottom: 10px; color: black;" data-l10n-id="pdfjs-editor-janTester-label">Please give me your knowledge:</label>
            <input type="text" id="input" name="userinput" style="width: 100%; margin-bottom: 20px;">
            <menu style="display: flex; justify-content: space-between;">
                <button value="cancel" style="flex: 1; margin-right: 10px;">Cancel</button>
                <button id="confirmBtn" value="default" style="flex: 1;">OK</button>
            </menu>
        </form>`;

    document.body.appendChild(dialog); // Append dialog to body

    button.addEventListener("click", () => {
      // Save the current selection before opening the dialog
      const selection = window.getSelection();
      const selectedRange = selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

      dialog.showModal(); // Display the modal dialog

      dialog.addEventListener('close', () => {
        const userInput = document.getElementById("input").value ? document.getElementById("input").value : null;
        console.log("User input: ", userInput);
        if (userInput !== null) {
          // Store the user input somewhere for further use
          document.getElementById('rdfa-tmp-storage').setAttribute('data-user-input', userInput);
          document.getElementById("input").value = ""; // Clear the input field
        }

        // Check if there was a saved selection
        if (selectedRange) {
          // Restore the selection
          if (selection.rangeCount > 0) selection.removeAllRanges();
          selection.addRange(selectedRange);
        }

        // Execute the highlight action if needed
        this.#uiManager.highlightSelection("floating_button");

        // Optionally, remove the dialog listener if not needed anymore
        dialog.removeEventListener('close', this);
      }, { once: true }); // Ensures the listener is removed automatically after execution
    });

    this.#buttons.append(button);
  }

}

export { EditorToolbar, HighlightToolbar };
