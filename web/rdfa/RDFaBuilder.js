export class RDFaBuilder {
    constructor() {
        this.elements = [];
    }

    addElement(element) {
        this.elements.push(element);
        return this;
    }

    build() {
        return this.elements.map(element => element.build()).join('');
    }
}
