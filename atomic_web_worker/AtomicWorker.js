import {Agent, core, Resource, Store, CollectionBuilder} from "@tomic/lib";


const store = new Store();
const myAgent = new Agent(
    // gönnet eu de key, isch leider nur en Testuser, sorry
    "G3u3xjPMjecRCQ6eE/TBw8UKaKqUZDbFb0pndU30Bw8=",
    "https://wiser-atomic.tunnelto.dev/agents/LwgknNqeuvB6vVwjg1qtMgoqezce9nLh4RId5GKlQa4=",
);

function getComplementaryColor(hexColor) {
    // Remove the hash at the start if it's there
    hexColor = hexColor.replace(/^#/, '');

    // Parse the r, g, b values
    let r = parseInt(hexColor.substr(0, 2), 16);
    let g = parseInt(hexColor.substr(2, 2), 16);
    let b = parseInt(hexColor.substr(4, 2), 16);

    // Calculate the complementary color
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;

    // Convert back to hex
    let complementaryColor = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
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
        const complementaryColor = '#ffffff'

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
        case 'ping':
            if (!message.magic || !message.url) {
                postMessage({type: 'ping', status: 'error', error: 'magic and url is required'});
                return;
            }
            const gotRes = await store.getResourceAsync(message.url)
            let sn = 'no Concept found'
            if (gotRes) {
                sn = await gotRes.get("https://atomicdata.dev/properties/shortname");
            }
            postMessage({
                type: 'pong',
                magic: message.magic,
                content: sn
            });
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
