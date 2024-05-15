export async function handleConceptButtons(data) {
    const buttonContainer = document.querySelector('.button-container.pdf_utils');
    if (buttonContainer) {
        data.buttons.forEach(button => {
            // Create a temporary container to parse the button HTML string
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = button.trim();
            const btn = tempContainer.firstChild;
            buttonContainer.appendChild(btn);
        });
    } else {
        console.error("Button container not found");
    }
}
