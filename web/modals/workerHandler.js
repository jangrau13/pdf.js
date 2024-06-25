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
        return name || 'workerHandler.js';
    },
    timestampFormatter(date) {
        return date.toISOString();
    },
});

export async function handleConceptButtons(data) {
    log.info('handleConceptButtons')
    const buttonContainer = document.querySelector('.button-container.pdf_utils');
    if (buttonContainer) {
        // Create a temporary container to parse the button HTML string
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = data.buttons.trim();
        const btn = tempContainer.firstChild;
        buttonContainer.appendChild(btn);
    } else {
        console.error("Button container not found");
    }
}


export async function handleUpdatePDFAfterKGAdd(data, document) {
    log.info('handleUpdatePDFAfterKGAdd')
    const potentialSaveCandidates = document.querySelectorAll('[data-wiser-potential-subject]')

    const updatedList = data.updatedElements

    // change from potential subject to tried subject
    for (const changeCandidate of potentialSaveCandidates) {
        const subject = changeCandidate.getAttribute("data-wiser-potential-subject")
        if (updatedList.includes(subject)) {
            // only update the ones which were really updated
            changeCandidate.removeAttribute("data-wiser-potential-subject")
            changeCandidate.setAttribute('data-wiser-subject', subject)
        }
    }
    // add the necessary state to the HTML
    const saveKGButton = document.getElementById("saveKnowledge")
    saveKGButton.setAttribute("saving-done", true)

    // trigger the saving in the lame way
    const savePDFButton = document.getElementById("download")
    savePDFButton.click()

    wiserEventBus.emit('knowledgeConfirmation', {updatedList})
}