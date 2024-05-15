/**
 * @interface
 * @name IModal
 * @property {function(worker: Worker): Promise<string>} render - Renders the modal and returns a promise that resolves to the rendered content.
 * @property {function(worker: Worker): void} onSave - Handles the save operation.
 * @property {function(): void} onClose - Handles the close operation.
 */
const IModal = {
    render: async (worker) => {},
    onSave: async (worker) => {},
    onClose: () => {}
};
