import {Agent, core, Resource, Store, CollectionBuilder} from "@tomic/lib";
import * as cheerio from 'cheerio';


const store = new Store();
const myAgent = new Agent(
    // gönnet eu de key, isch leider nur en Testuser, sorry
    "G3u3xjPMjecRCQ6eE/TBw8UKaKqUZDbFb0pndU30Bw8=",
    "https://wiser-atomic.tunnelto.dev/agents/LwgknNqeuvB6vVwjg1qtMgoqezce9nLh4RId5GKlQa4=",
);

function slugify(text) {
    return text
        .toString()                          // Convert to string
        .toLowerCase()                       // Convert to lowercase
        .trim()                              // Trim leading and trailing whitespace
        .replace(/\s+/g, '-')                // Replace spaces with -
        .replace(/[^\w\-]+/g, '')            // Remove all non-word chars
        .replace(/\-\-+/g, '-');             // Replace multiple - with single -
}

function getComplementaryColor(hexColor) {
    // Remove the hash at the start if it's there
    hexColor = hexColor.replace(/^#/, '');

    // Parse the r, g, b values
    let r = parseInt(hexColor.substr(0, 2), 16);
    let g = parseInt(hexColor.substr(2, 2), 16);
    let b = parseInt(hexColor.substr(4, 2), 16);

    // Calculate the brightness (perceived luminance)
    // Using the formula: 0.299*R + 0.587*G + 0.114*B
    let brightness = 0.299 * r + 0.587 * g + 0.114 * b;

    // Determine the complementary color based on brightness
    let complementaryColor;
    if (brightness < 128) {
        // If the color is dark, return white
        complementaryColor = '#FFFFFF';
    } else {
        // If the color is bright, return black
        complementaryColor = '#000000';
    }

    return complementaryColor;
}


// Function to convert HEX to RGBA
function hexToRgba(hex, alpha) {
    // Remove the leading '#' if present
    hex = hex.replace('#', '');

    // Parse the red, green, blue values
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

async function handleRetrieveConcepts() {
    const concepts = await store.getResourceAsync("https://wiser-atomic.tunnelto.dev/collections/ontology/concept")
    const classes = concepts.get("https://atomicdata.dev/properties/classes");
    let buttons = []
    for (const buttonClass in classes) {
        const myFullClass = await store.getResourceAsync(classes[buttonClass])
        const shortname = myFullClass.get("https://atomicdata.dev/properties/shortname");
        let color = myFullClass.get("https://atomicdata.dev/properties/color")
        if (!color) {
            color = getRandomColor();
        }
        color = hexToRgba(color, 0.5);
        const complementaryColor = getComplementaryColor(color)

        const htmlButton = (shortname, color, complementaryColor) => `
            <button 
                style="background-color: ${color}; color: ${complementaryColor}; border: 2px solid ${complementaryColor}; font-weight: bold;" 
                onclick="conceptButtonFunction('${shortname}', '${color}')">
                ${shortname}
            </button>
        `;

        buttons.push(
            htmlButton(shortname, color, complementaryColor).trim()
        )
    }

    postMessage({
        type: 'conceptButtons',
        buttons
    })
}

async function handleTextArea(myVisual, container, selectedText = '', infoToLookFor) {
    const inputFor = myVisual.get("https://wiser-atomic.tunnelto.dev/collections/ontology/visuals/property/is-input-for");
    const inputInfos = await store.getResourceAsync(inputFor);
    const label = inputInfos.get("https://atomicdata.dev/properties/description");
    const placeholder = inputInfos.get("https://wiser-atomic.tunnelto.dev/property/placeholder");
    infoToLookFor.push(inputFor)
    // check for ID
    if (inputFor === "https://wiser-atomic.tunnelto.dev/property/th1piubjse") {
        container += `
            <div style="display: grid; grid-template-columns: 1fr; grid-gap: 8px;">
                <label for="${inputFor}">${label}</label>
                <input type="text" class="inputField" name="${inputFor}" id="${inputFor}" placeholder="${placeholder}" value="${slugify(selectedText)}">
            </div>
        `;
    } else {
        container += `
        <div style="display: grid; grid-template-columns: 1fr; grid-gap: 8px;">
            <label for="${inputFor}" >${label}</label>
            <textarea class="textareaField" name="${inputFor}" id="${inputFor}" placeholder="${placeholder}"></textarea>
        </div>
    `;
    }

    return container;
}

async function handleDropDown(myVisual, container, selectedText, infoToLookFor) {
    const inputFor = myVisual.get("https://wiser-atomic.tunnelto.dev/collections/ontology/visuals/property/is-input-for");
    const optionClass = myVisual.get("https://wiser-atomic.tunnelto.dev/collections/ontology/visuals/property/option-class");
    // retrieve the list of all the instances of the option class
    const optionClassResource = await store.getResourceAsync(optionClass);
    const listName = optionClassResource.get("https://atomicdata.dev/properties/shortname")
    const myClasses = optionClassResource.get("https://atomicdata.dev/properties/classes")
    infoToLookFor.push(inputFor)

    let dropdown = `
        <div>
            <label for="${inputFor}">${listName}</label>
            <select class="dropdown" name="${inputFor}" id="${inputFor}">
    `;

    // Populate the dropdown with options
    for (const key of myClasses) {
        const snResource = await store.getResourceAsync(key);
        const optionValue = snResource.get("https://atomicdata.dev/properties/shortname");
        dropdown += `<option value="${key}">${optionValue}</option>`;
    }

    // Close the dropdown
    dropdown += `
            </select>
        </div>
    `;

    // Add the dropdown to the container
    container += dropdown;

    return container
}

function getLastPartOfURL(url) {
    const parts = url.split('/');
    return parts[parts.length - 1];
}

async function createModal(url, magic, selectedText = '') {
    const concept = await store.getResourceAsync(url)
    const potentialSubject = store.createSubject(getLastPartOfURL(url))
    const description = concept.get("https://atomicdata.dev/properties/description")
    const shortName = concept.get("https://atomicdata.dev/properties/shortname")
    const visuals = concept.get("https://wiser-atomic.tunnelto.dev/collections/ontology/concept/property/has-visuals")
    let infoToLookFor = []
    let container = '<div>'
    container += `
                    <h2 class="title"> ${shortName} </h2>
                    <div class="textInfo">${description}</div>
                `
    for (const visualIndex in visuals) {
        const myVisual = await store.getResourceAsync(visuals[visualIndex])
        // only one class is allowed anyway
        const clazz = myVisual.getClasses()[0];
        // define container

        switch (clazz) {
            case "https://wiser-atomic.tunnelto.dev/collections/ontology/visuals/class/textarea":
                container = await handleTextArea(myVisual, container, selectedText, infoToLookFor);
                break;
            case "https://wiser-atomic.tunnelto.dev/collections/ontology/visuals/class/dropdown":
                container = await handleDropDown(myVisual, container, selectedText, infoToLookFor);
                break;
            //TODO: add required/recommended
            default:
                break;
        }
    }
    //close container
    container += '</div>'
    const myDiv = container
    postMessage({
        type: 'pong',
        magic,
        content: myDiv,
        infoToLookFor,
        potentialSubject
    })
}

async function handleKnowledgeUpdate(message) {
    // Retrieve elements with the class 'rdfa_content' and their children
    const $ = cheerio.load(message.document);
    const rdfasInHTML = $('.rdfa-content')
    const updatedElements = []
    for (const rdfaElement of rdfasInHTML) {
        const cheerioElement = $(rdfaElement);
        const childrenWithTypeof = cheerioElement.find('[typeof]');
        if (childrenWithTypeof.length > 0) {
            // only update the ones with a potential-wiser-id
            const potentialID =  $(childrenWithTypeof[0]).attr('data-wiser-potential-subject')
            if(potentialID){
                console.log("creating Element", potentialID)
                const newId = $(childrenWithTypeof[0]).attr('data-wiser-id')
                const className = $(childrenWithTypeof[0]).attr('typeof')
                const newSubject = potentialID
                //TODO: check for the same WISER-ID
                if (await store.checkSubjectTaken(newSubject)) {
                    console.log("subject already taken, react to it", newSubject)
                    return
                } else {
                    const newResource = new Resource(newSubject);
                    const reallyNewResource = await store.newResource(newResource)
                    if (newId) {
                        await reallyNewResource.set("https://wiser-atomic.tunnelto.dev/property/th1piubjse", newId, store);
                        await reallyNewResource.set(core.properties.shortname, newId, store);
                    }
                    await reallyNewResource.addClasses(store, className.toString());
                    for (const child of childrenWithTypeof[0].children) {
                        const prop = $(child).attr('property')
                        const val = $(child).attr('data-wiser-content')
                        await reallyNewResource.set(prop, val, store)
                    }
                    const commit = await reallyNewResource.save(store);
                    // TODO: make a better check, whether the element go really created
                    updatedElements.push(newSubject)
                }
            }
        }
    }
    // here I can give the infos I want to for the PDF save after everything is done
    postMessage({
        type: 'updatePDFAfterKGAdd',
        updatedElements
    })
}

onmessage = async (e) => {
    const message = e.data;

    if (!message || !message.type) {
        console.error("Received message without type:", message);
        postMessage({type: 'error', error: 'Message type is required'});
        return;
    }

    switch (message.type) {
        case 'getConcepts':
            await handleRetrieveConcepts();
            break
        case 'getResource':
            if (!message.url) {
                postMessage({type: 'getResource', status: 'error', error: 'URL is required'});
                return;
            }
            await handleGetResource(message.url);
            break;
        case 'addKnowledge':
            if (!message.document) {
                postMessage({type: 'addKnowledge', status: 'error', error: 'Document is required'});
                return
            }
            await handleKnowledgeUpdate(message)
            break;
        case 'ping':
            if (!message.magic || !message.url) {
                postMessage({type: 'ping', status: 'error', error: 'magic and url is required'});
                return;
            }
            const gotRes = await store.checkSubjectTaken(message.url)
            postMessage({
                type: 'pong',
                magic: message.magic,
                content: gotRes
            });
            break;
        case 'createModal':
            if (!message.url || !message.magic) {
                postMessage({type: 'createModal', status: 'error', error: 'I need to have a url and a magic word'})
                return;
            }
            if (message.selectedText) {
                await createModal(message.url, message.magic, message.selectedText)
            } else {
                await createModal(message.url, message.magic)
            }
            break;
        default:
            console.error("Unknown message type:", message.type);
            postMessage({type: 'error', error: 'Unknown message type'});
            break;
    }
};


async function init() {
    const serverURL = "https://wiser-atomic.tunnelto.dev";
    await store.setServerUrl(serverURL);
    await store.preloadPropsAndClasses();
    await store.setAgent(myAgent);
    console.log("Atomic Worker: Store initialized successfully");
}

async function handleGetResource(url) {
    try {
        const newResource = await store.getResourceAsync(url);
        const shortName = newResource.get("https://atomicdata.dev/properties/shortname");
        postMessage({type: 'getResource', status: 'success', shortName});
    } catch (error) {
        console.error("Error fetching resource:", error);
        postMessage({type: 'getResource', status: 'error', error: error.message});
    }
}


// Initialize the store
await init();
