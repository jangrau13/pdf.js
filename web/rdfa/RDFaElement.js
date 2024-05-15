export class RDFaElement {
    constructor(tagName = 'div') {
        this.tagName = tagName;
        this.attributes = {};
        this.children = [];
        this.textContent = '';
    }

    setId(value) {
        this.setAttribute('id', value);
        this.setAttribute('data-wiser-id', value);
        return this;
    }

    setProperty(value){
        this.setAttribute('property', value)
        return this
    }

    setTextContent(value) {
        this.textContent = value;
        this.setAttribute('data-wiser-content', value);
        return this;
    }

    setResource(value) {
        this.setAttribute('resource', value);
        return this;
    }

    setTypeof(value) {
        this.setAttribute('typeof', value);
        return this;
    }

    setVocab(value) {
        this.setAttribute('vocab', value);
        return this;
    }

    setHref(value) {
        this.setAttribute('href', value);
        return this;
    }

    setAttribute(name, value) {
        this.attributes[name] = value;
        return this;
    }

    addChild(child) {
        this.children.push(child);
        return this;
    }

    build() {
        const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (match) => {
            const escape = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return escape[match];
        });

        const attributesString = Object.entries(this.attributes)
            .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
            .join(' ');

        const childrenHtml = this.children.map(child => child.build()).join('');
        const escapedTextContent = escapeHtml(this.textContent);

        return `<${this.tagName} ${attributesString}>${escapedTextContent}${childrenHtml}</${this.tagName}>`;
    }
}