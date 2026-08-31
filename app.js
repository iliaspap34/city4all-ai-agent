Ναι — αυτό είναι το καθαρισμένο `app.js`, έτοιμο για copy-paste. Βάλ’ το ολόκληρο στο `app.js` και αντικατάστησε το παλιό.

````text
/* ============================================================
CITY4ALL AI APP
============================================================ */

const API_BASE =
"https://city4allfinalai.ilias-pap-net.workers.dev";

const CHAT_URL =
`${API_BASE}/chat`;

/* ============================================================
STATE
============================================================ */

let conversation = [];

let previousFeatures = [];

let isLoading = false;

let recognition = null;

let voiceMode = false;

let listening = false;

let voiceRestartTimer = null;

let isSpeaking = false;

/* ============================================================
MAP READY
============================================================ */

let resolveMapReady;

let mapReadyResolved = false;

const mapReadyPromise =
new Promise(resolve => {


resolveMapReady = () => {

  if (mapReadyResolved) {
    return;
  }

  mapReadyResolved = true;

  resolve();

};


});

function tryResolveExistingMap() {

if (!window.city4allMap?.view) {
return;
}

try {


if (window.city4allMap.view.when) {

  window.city4allMap.view.when()
    .then(() => {
      resolveMapReady();
    })
    .catch(() => {
      resolveMapReady();
    });

} else {

  resolveMapReady();

}


} catch {


resolveMapReady();


}

}

tryResolveExistingMap();

/* ============================================================
DOM
============================================================ */

const messagesEl =
document.getElementById("messages");

const inputEl =
document.getElementById("messageInput");

const sendButton =
document.getElementById("sendButton");

const voiceButton =
document.getElementById("voiceButton");

/* ============================================================
INITIALIZATION
============================================================ */

document.addEventListener(
"DOMContentLoaded",
() => {


setupQuickActions();

setupInput();

setupVoice();

setupMobileViewport();

tryResolveExistingMap();


console.log(
  "City4All AI frontend loaded."
);


}
);

/* ============================================================
QUICK ACTIONS
============================================================ */

function setupQuickActions() {

document
.querySelectorAll(".quick-button")
.forEach(button => {


  button.addEventListener(
    "click",
    () => {

      const question =
        button.dataset.question;

      if (
        !question ||
        isLoading ||
        !inputEl
      ) {

        return;

      }

      inputEl.value =
        question;

      inputEl.dispatchEvent(
        new Event("input")
      );

      sendMessage();

    }
  );

});


}

/* ============================================================
INPUT
============================================================ */

function setupInput() {

if (!inputEl) {
return;
}

inputEl.addEventListener(
"keydown",
event => {


  if (
    event.key === "Enter" &&
    !event.shiftKey
  ) {

    event.preventDefault();

    sendMessage();

  }

}


);

inputEl.addEventListener(
"input",
resizeInput
);

sendButton?.addEventListener(
"click",
sendMessage
);

resizeInput();

}

function resizeInput() {

if (!inputEl) {
return;
}

inputEl.style.height =
"43px";

const newHeight =
Math.min(
inputEl.scrollHeight,
100
);

inputEl.style.height =
`${Math.max(
      43,
      newHeight
    )}px`;

}

/* ============================================================
SEND MESSAGE
============================================================ */

async function sendMessage(
options = {}
) {

const {
fromVoice = false
} = options;

if (isLoading) {
return;
}

const message =
inputEl?.value?.trim() || "";

if (!message) {
return;
}

stopSpeaking();

addMessage(
"user",
message
);

if (inputEl) {


inputEl.value = "";

inputEl.style.height =
  "43px";


}

setLoading(true);

const loadingMessage =
addLoadingMessage();

const controller =
new AbortController();

const timeoutId =
setTimeout(
() => {
controller.abort();
},
20000
);

try {


const response =
  await fetch(
    CHAT_URL,
    {

      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body:
        JSON.stringify({

          message,

          conversation,

          previousFeatures

        }),

      signal:
        controller.signal

    }
  );


clearTimeout(
  timeoutId
);


let data;


try {

  data =
    await response.json();

} catch {

  throw new Error(
    "Ο Worker επέστρεψε μη έγκυρη απάντηση."
  );

}


removeLoadingMessage(
  loadingMessage
);


if (
!response.ok ||
!data.success
) {

  throw new Error(
    data?.error ||
    "Η αναζήτηση απέτυχε."
  );

}


console.log(
"City4All response:",
data
);


/* ======================================================
   ANSWER
====================================================== */

const answer =
data.answer ||
"Δεν μπόρεσα να δημιουργήσω απάντηση.";


const messageElement =
addMessage(
"ai",
answer,
data.externalInfo
);


updateConversation(
message,
answer
);


/* ======================================================
   PREVIOUS RESULTS
====================================================== */

const features =
Array.isArray(
data.features
)
? data.features
: [];


previousFeatures =
features;


/* ======================================================
   MAP RESULTS
====================================================== */

const mapFeatures =
Array.isArray(
data.mapFeatures
)
? data.mapFeatures
: features;


const mapCommand =
data.mapCommand ||
null;


/* ======================================================
   ACTIONS
====================================================== */

addChatActions(
messageElement,
features,
mapFeatures,
mapCommand,
data.totalMatches
);


/* ======================================================
   MAP
====================================================== */

await updateMap(
mapFeatures,
mapCommand
);


/* ======================================================
   VOICE
====================================================== */

if (
voiceMode &&
fromVoice
) {

speakAnswer(
answer
);

}


}

catch (error) {


clearTimeout(
timeoutId
);


console.error(
"City4All AI error:",
error
);


removeLoadingMessage(
loadingMessage
);


let errorMessage =
"⚠️ Κάτι πήγε στραβά. Δεν μπόρεσα να επικοινωνήσω με το City4All AI.";


if (
error?.name === "AbortError"
) {

errorMessage =
"⚠️ Η αναζήτηση άργησε υπερβολικά. Δοκίμασε ξανά.";

}


addMessage(
"ai",
errorMessage
);


if (voiceMode) {
stopVoiceMode();
}


}

finally {


setLoading(false);


}

}

/* ============================================================
CONVERSATION
============================================================ */

function updateConversation(
userMessage,
assistantMessage
) {

conversation.push({


role: "user",

content:
userMessage


});

conversation.push({


role: "assistant",

content:
assistantMessage


});

if (
conversation.length > 20
) {


conversation =
conversation.slice(-20);


}

}

/* ============================================================
ADD MESSAGE
============================================================ */

function addMessage(
role,
text,
externalInfo = null
) {

if (!messagesEl) {
return null;
}

const wrapper =
document.createElement("div");

wrapper.className =
`message ${role}`;

if (role === "ai") {


const meta =
document.createElement("div");


meta.className =
"message-meta";


meta.innerHTML = `
<div class="message-meta-icon">
✦
</div>
<span>City4All AI</span>
`;


wrapper.appendChild(
meta
);


}

const bubble =
document.createElement("div");

bubble.className =
"bubble";

if (role === "ai") {


bubble.innerHTML =
renderMarkdown(text);


} else {


bubble.textContent =
text;


}

wrapper.appendChild(
bubble
);

if (
role === "ai" &&
externalInfo
) {


const externalCard =
createExternalInfoCard(
externalInfo
);


if (externalCard) {

wrapper.appendChild(
externalCard
);

}


}

messagesEl.appendChild(
wrapper
);


scrollMessages();

return wrapper;

}

/* ============================================================
   MARKDOWN RENDERER
============================================================ */

function renderMarkdown(markdown) {

if (!markdown) {
return "";
}

let text =
String(markdown)
.replace(
/
/\r\n/g,
"\n"
)
.replace(
/
/\r/g,
"\n"
);

const codeBlocks = [];

text =
text.replace(
/```([\w-]*)\s*\n([\s\S]*?)```/g,
(match, language, code) => {

const index =
codeBlocks.length;

codeBlocks.push({
language:
String(
language ||
""
).toLowerCase(),

code:
code.trim()
});

return `@@CODEBLOCK_${index}@@`;

}
);

text =
escapeHTML(
text
);

text =
renderMarkdownTables(
text
);

text =
text.replace(
/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
(match, label, url) =>
`<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
);

text =
text.replace(
/(^|[\s>])(https?:\/\/[^\s<]+)/g,
(match, prefix, url) => {

const cleanUrl =
url.replace(
/[),.;!?]+$/,
""
);

return (
`${prefix}` +
`<a href="${escapeAttribute(cleanUrl)}" target="_blank" rel="noopener noreferrer">` +
`${escapeHTML(cleanUrl)}` +
`</a>`
);

}
);

text =
text.replace(
/\*\*(.+?)\*\*/g,
"<strong>$1</strong>"
);

text =
text.replace(
/(^|[^*])\*([^*\n]+)\*(?!\*)/g,
"$1<em>$2</em>"
);

text =
text.replace(
/`([^`\n]+)`/g,
"<code>$1</code>"
);

text =
text.replace(
/^###### (.*)$/gm,
"<h4>$1</h4>"
);

text =
text.replace(
/^##### (.*)$/gm,
"<h4>$1</h4>"
);

text =
text.replace(
/^#### (.*)$/gm,
"<h4>$1</h4>"
);

text =
text.replace(
/^### (.*)$/gm,
"<h3>$1</h3>"
);

text =
text.replace(
/^## (.*)$/gm,
"<h2>$1</h2>"
);

text =
text.replace(
/^# (.*)$/gm,
"<h1>$1</h1>"
);

text =
text.replace(
/^>\s?(.*)$/gm,
"<blockquote>$1</blockquote>"
);

text =
text.replace(
/(?:^|\n)((?:[-*]\s+.*(?:\n|$))+)/g,
(match, block) => {

const items =
block
.trim()
.split("\n")
.map(
line =>
line.replace(
/^[-*]\s+/,
""
)
)
.filter(Boolean);

return (
"\n<ul>" +
items
.map(
item =>
`<li>${item}</li>`
)
.join("") +
"</ul>\n"
);

}
);

text =
text.replace(
/(?:^|\n)((?:\d+\.\s+.*(?:\n|$))+)/g,
(match, block) => {

const items =
block
.trim()
.split("\n")
.map(
line =>
line.replace(
/^\d+\.\s+/,
""
)
)
.filter(Boolean);

return (
"\n<ol>" +
items
.map(
item =>
`<li>${item}</li>`
)
.join("") +
"</ol>\n"
);

}
);

text =
convertPlainTextParagraphs(
text
);

codeBlocks.forEach(
(block, index) => {

const token =
`@@CODEBLOCK_${index}@@`;

const replacement =
`
<div class="code-block">
<code>${escapeHTML(block.code)}</code>
</div>
`;

text =
text.replace(
token,
replacement
);

}
);

return text;

}

/* ============================================================
MARKDOWN TABLES
============================================================ */

function renderMarkdownTables(
text
) {

const lines =
text.split(
"\n"
);

const output = [];

let i = 0;

while (
i < lines.length
) {

const current =
lines[i];

const next =
lines[i + 1];

if (
current &&
next &&
current.includes("|") &&
/^\s*\|?\s*:?-{3,}/.test(next)
) {

const headers =
splitMarkdownRow(
current
);

i += 2;

const rows = [];

while (
i < lines.length &&
lines[i].includes("|") &&
lines[i].trim() !== ""
) {

rows.push(
splitMarkdownRow(
lines[i]
)
);

i++;

}

let html =
`<div class="markdown-table-wrap">` +
`<table class="markdown-table">` +
`<thead><tr>`;

headers.forEach(
header => {

html +=
`<th>${header}</th>`;

}
);

html +=
"</tr></thead><tbody>";

rows.forEach(
row => {

html +=
"<tr>";

headers.forEach(
(
header,
columnIndex
) => {

html +=
`<td>${row[columnIndex] || ""}</td>`;

}
);

html +=
"</tr>";

}
);

html +=
"</tbody></table></div>";

output.push(
html
);

continue;

}

output.push(
current
);

i++;

}

return output.join(
"\n"
);

}

function splitMarkdownRow(
line
) {

let cleaned =
line.trim();

if (
cleaned.startsWith("|")
) {

cleaned =
cleaned.slice(1);

}

if (
cleaned.endsWith("|")
) {

cleaned =
cleaned.slice(
0,
-1
);

}

return cleaned
.split("|")
.map(
cell =>
cell.trim()
);

}

/* ============================================================
PARAGRAPHS
============================================================ */

function convertPlainTextParagraphs(
text
) {

const blocks =
text.split(
/\n{2,}/
);

return blocks
.map(
block => {

const trimmed =
block.trim();

if (!trimmed) {
return "";
}

if (
/^<(h\d|ul|ol|blockquote|div|table|pre)/i.test(
trimmed
)
) {

return trimmed;

}

if (
trimmed.includes(
"<br>"
)
) {

return trimmed;

}

return (
"<p>" +
trimmed.replace(
/
/\n/g,
"<br>"
) +
"</p>"
);

}
)
.join(
""
);

}

/* ============================================================
EXTERNAL INFO CARD
============================================================ */

function createExternalInfoCard(
externalInfo
) {

if (
!externalInfo ||
typeof externalInfo !==
"object"
) {

return null;

}

const wiki =
externalInfo.wikipedia;

const image =
externalInfo.wikimediaImage;

if (
!wiki &&
!image
) {

return null;

}

const card =
document.createElement(
"div"
);

card.className =
"external-card";

if (
image?.url
) {

const img =
document.createElement(
"img"
);

img.className =
"external-image";

img.src =
image.url;

img.alt =
externalInfo?.feature?.name ||
"Wikimedia image";

img.loading =
"lazy";

img.referrerPolicy =
"no-referrer";

img.onerror =
() => {
img.remove();
};

card.appendChild(
img
);

}

const body =
document.createElement(
"div"
);

body.className =
"external-body";

const label =
document.createElement(
"div"
);

label.className =
"external-label";

label.textContent =
"ℹ️ Εξωτερική πληροφορία";

body.appendChild(
label
);

if (
wiki?.title
) {

const title =
document.createElement(
"div"
);

title.className =
"external-title";

title.textContent =
wiki.title;

body.appendChild(
title
);

}

if (
wiki?.description
) {

const description =
document.createElement(
"div"
);

description.className =
"external-description";

description.textContent =
wiki.description;

body.appendChild(
description
);

}

if (
wiki?.page
) {

const link =
document.createElement(
"a"
);

link.className =
"external-link";

link.href =
wiki.page;

link.target =
"_blank";

link.rel =
"noopener noreferrer";

link.textContent =
"🔗 Δες περισσότερα στη Wikipedia";

body.appendChild(
link
);

}

card.appendChild(
body
);

return card;

}

/* ============================================================
LOADING
============================================================ */

function addLoadingMessage() {

if (!messagesEl) {
return null;
}

const wrapper =
document.createElement(
"div"
);

wrapper.className =
"message ai";

wrapper.dataset.loading =
"true";

const meta =
document.createElement(
"div"
);

meta.className =
"message-meta";

meta.innerHTML = `
<div class="message-meta-icon">
✦
</div>
<span>City4All AI</span>
`;

wrapper.appendChild(
meta
);

const bubble =
document.createElement(
"div"
);

bubble.className =
"bubble";

bubble.innerHTML = `
<div class="loading-bubble">

<div class="loading-icon">
✦
</div>

<div class="loading-dots">
Αναζητώ<span>.</span><span>.</span><span>.</span>
</div>

</div>
`;

wrapper.appendChild(
bubble
);

messagesEl.appendChild(
wrapper
);

scrollMessages();

return wrapper;

}

function removeLoadingMessage(
element
) {

if (
element
) {

element.remove();

}

}

/* ============================================================
SCROLL
============================================================ */

function scrollMessages() {

requestAnimationFrame(
() => {

if (
messagesEl
) {

messagesEl.scrollTop =
messagesEl.scrollHeight;

}

}
);

}

/* ============================================================
LOADING STATE
============================================================ */

function setLoading(
loading
) {

isLoading =
loading;

if (
sendButton
) {

sendButton.disabled =
loading;

sendButton.textContent =
loading
? "..."
: "Αποστολή";

}

if (
inputEl
) {

inputEl.disabled =
loading ||
voiceMode;

}

if (
voiceButton
) {

voiceButton.disabled =
false;

}

}

/* ============================================================
CHAT ACTIONS
============================================================ */

function addChatActions(
messageElement,
features,
mapFeatures = features,
mapCommand = null,
totalMatches = null
) {

if (
!Array.isArray(features) ||
!features.length ||
!messageElement
) {

return;

}

const actions =
document.createElement(
"div"
);

actions.className =
"message-actions";

/* ==========================================================
ONE RESULT
========================================================== */

if (
features.length ===
1
) {

const feature =
features[0];

const mapButton =
createMapActionButton(
feature,
"🗺️ Προβολή στον χάρτη",
true
);

if (
mapButton
) {

actions.appendChild(
mapButton
);

}

const routeButton =
createRouteButton(
feature
);

if (
routeButton
) {

actions.appendChild(
routeButton
);

}

}

/* ==========================================================
MANY RESULTS
========================================================== */

else {

const allButton =
document.createElement(
"button"
);

allButton.type =
"button";

allButton.className =
"chat-action primary";

const mapCount =
Array.isArray(mapFeatures)
? mapFeatures.length
: features.length;

const totalLabel =
Number.isFinite(
Number(totalMatches)
) &&
Number(totalMatches) >
mapCount
? ` από ${totalMatches}`
: "";

allButton.textContent =
`🗺️ Προβολή ${mapCount} σημείων${totalLabel}`;

allButton.addEventListener(
"click",
async () => {

allButton.disabled =
true;

const originalText =
allButton.textContent;

allButton.textContent =
"🗺️ Φόρτωση...";

try {

await updateMap(
mapFeatures,
{
mode:
"all",
autoZoom:
true,
autoOpenPopup:
false,
targetCount:
mapCount
}
);

}

finally {

allButton.disabled =
false;

allButton.textContent =
originalText;

}

}
);

actions.appendChild(
allButton
);

const firstMapButton =
createMapActionButton(
features[0],
"📍 Πρώτο σημείο",
false
);

if (
firstMapButton
) {

actions.appendChild(
firstMapButton
);

}

const routeButton =
createRouteButton(
features[0],
"🧭 Οδηγίες για το πρώτο"
);

if (
routeButton
) {

actions.appendChild(
routeButton
);

}

}

if (
actions.children.length
) {

messageElement.appendChild(
actions
);

scrollMessages();

}

}

/* ============================================================
MAP ACTION
============================================================ */

function createMapActionButton(
feature,
label,
primary = false
) {

if (
!hasCoordinates(
feature
)
) {

return null;

}

const button =
document.createElement(
"button"
);

button.type =
"button";

button.className =
primary
? "chat-action primary"
: "chat-action";

button.textContent =
label;

button.addEventListener(
"click",
async () => {

button.disabled =
true;

try {

await ensureFeatureOnMap(
feature
);

await focusMapFeature(
feature,
{
openPopup:
true
}
);

}

finally {

button.disabled =
false;

}

}
);

return button;

}

/* ============================================================
GOOGLE MAPS
============================================================ */

function createRouteButton(
feature,
label = "🧭 Οδηγίες"
) {

const url =
feature?.googleMapsUrl ||
createGoogleMapsUrl(
feature
);

if (
!url
) {

return null;

}

const button =
document.createElement(
"button"
);

button.type =
"button";

button.className =
"chat-action primary";

button.textContent =
label;

button.addEventListener(
"click",
event => {

event.preventDefault();

window.open(
url,
"_blank",
"noopener,noreferrer"
);

}
);

return button;

}

/* ============================================================
WAIT MAP
============================================================ */

async function waitForMapReady(
timeoutMs = 8000
) {

if (
window.city4allMap?.view
) {

try {

if (
window.city4allMap.view.when
) {

await window.city4allMap
.view
.when();

}

return true;

}

catch (
error
) {

console.warn(
"Existing map is not ready:",
error
);

}

}

await Promise.race([

mapReadyPromise,

new Promise(
resolve =>
setTimeout(
resolve,
timeoutMs
)
)

]);

return Boolean(
window.city4allMap?.view
);

}

/* ============================================================
MAP DIAGNOSTICS
============================================================ */

function getMapDiagnostics() {

const map =
window.city4allMap;

return {

exists:
Boolean(map),

view:
Boolean(map?.view),

resultsLayer:
Boolean(map?.resultsLayer),

Graphic:
Boolean(map?.Graphic),

graphicsCount:
map?.resultsLayer
?.graphics
?.length ??
0

};

}

/* ============================================================
ENSURE FEATURE
============================================================ */

async function ensureFeatureOnMap(
feature
) {

if (
!hasCoordinates(feature)
) {

return false;

}

const ready =
await waitForMapReady();

if (
!ready
) {

console.warn(
"Map not ready."
);

return false;

}

const map =
window.city4allMap;

if (
!map?.resultsLayer ||
!map?.Graphic
) {

console.warn(
"Incomplete map object:",
getMapDiagnostics()
);

return false;

}

const existing =
findGraphicForFeature(
feature
);

if (
existing
) {

return true;

}

try {

const graphic =
createGraphicForFeature(
feature,
0,
getFeatureKey(
feature,
0
),
map.Graphic
);

map.resultsLayer.add(
graphic
);

await new Promise(
resolve =>
requestAnimationFrame(
resolve
)
);

map.lastGraphics =
map.resultsLayer
?.graphics
?.toArray?.() ||
[];

map.lastFeatures =
[
feature
];

return true;

}

catch (
error
) {

console.warn(
"Could not ensure feature:",
error
);

return false;

}

}

/* ============================================================
UPDATE MAP
============================================================ */

async function updateMap(
features,
mapCommand = null
) {

try {

const ready =
await waitForMapReady(
8000
);

if (
!ready
) {

return false;

}

const map =
window.city4allMap;

if (
!map?.view ||
!map?.resultsLayer ||
!map?.Graphic
) {

return false;

}

const {
view,
resultsLayer,
Graphic
} =
map;

try {

view.closePopup();

}

catch {}


resultsLayer.removeAll();

const validFeatures =
Array.isArray(
features
)
? features.filter(
hasCoordinates
)
: [];

map.lastFeatures =
validFeatures;

map.lastGraphics =
[];

if (
!validFeatures.length
) {

return false;

}

const graphics =
validFeatures.map(
(
feature,
index
) => {

return createGraphicForFeature(
feature,
index,
getFeatureKey(
feature,
index
),
Graphic
);

}
);

resultsLayer.addMany(
graphics
);

map.lastGraphics =
graphics;

await new Promise(
resolve =>
requestAnimationFrame(
resolve
)
);

if (
validFeatures.length ===
1
) {

return await focusMapFeature(
validFeatures[0],
{
openPopup: true
}
);

}

if (
mapCommand?.autoZoom !==
false
) {

await focusAllFeatures(
validFeatures
);

}

if (
mapCommand?.autoOpenPopup ===
true
) {

await focusMapFeature(
validFeatures[0],
{
openPopup: true
}
);

}

return true;

}

catch (
error
) {

console.warn(
"Map update failed:",
error
);

return false;

}

}

/* ============================================================
CREATE GRAPHIC
============================================================ */

function createGraphicForFeature(
feature,
index,
key,
Graphic
) {

const latitude =
Number(
feature.latitude
);

const longitude =
Number(
feature.longitude
);

const area =
feature.area ||
feature.municipality ||
feature.region ||
feature.country ||
"";

const source =
feature.external
? "Internet / OpenStreetMap"
: "City4All";

const accessibility =
feature.accessibility ||
"Δεν έχει καταχωρηθεί πληροφορία";

const website =
feature.website
? escapePopupText(
feature.website
)
: "";

const phone =
feature.phone
? escapePopupText(
feature.phone
)
: "";

const comments =
feature.comments
? escapePopupText(
feature.comments
)
: "";

const websiteHtml =
website
? `
<br><br>
<strong>Website:</strong>
${website}
`
: "";

const phoneHtml =
phone
? `
<br><br>
<strong>Τηλέφωνο:</strong>
${phone}
`
: "";

const commentsHtml =
comments
? `
<br><br>
<strong>Σχόλια:</strong>
${comments}
`
: "";

const graphic =
new Graphic({

geometry: {

type:
"point",

longitude,

latitude

},

symbol: {

type:
"simple-marker",

size:
feature.external
? 12
: 15,

color:
feature.external
? "#f59e0b"
: "#1976d2",

outline: {

color:
"#ffffff",

width:
2

}

},

attributes: {

city4allKey:
key,

name:
feature.name ||
"Σημείο",

type:
feature.type ||
"Σημείο",

accessibility,

area,

municipality:
feature.municipality ||
"",

prefecture:
feature.prefecture ||
"",

region:
feature.region ||
"",

country:
feature.country ||
"",

source,

website:
feature.website ||
"",

phone:
feature.phone ||
"",

index:
index + 1

},

popupTemplate: {

title:
"{index}. {name}",

content: [

{

type:
"text",

text: `

<strong>Πηγή:</strong>
{source}

<br><br>

<strong>Κατηγορία:</strong>
{type}

<br><br>

<strong>Περιοχή:</strong>
{area}

<br><br>

<strong>Δήμος:</strong>
{municipality}

<br><br>

<strong>Περιφέρεια:</strong>
{region}

<br><br>

<strong>Χώρα:</strong>
{country}

<br><br>

<strong>Προσβασιμότητα:</strong>
{accessibility}

${commentsHtml}

${websiteHtml}

${phoneHtml}

`

}

]

}

});

graphic.__city4allFeature =
feature;

return graphic;

}

/* ============================================================
FEATURE KEY
============================================================ */

function getFeatureKey(
feature,
fallbackIndex = 0
) {

if (
feature?.objectId !==
undefined &&
feature?.objectId !==
null &&
String(
feature.objectId
).trim() !== ""
) {

return String(
feature.objectId
);

}

if (
feature?.objectid !==
undefined &&
feature?.objectid !==
null &&
String(
feature.objectid
).trim() !== ""
) {

return String(
feature.objectid
);

}

return (
`${Number(
feature?.latitude
)}:` +
`${Number(
feature?.longitude
)}:` +
`${fallbackIndex}`
);

}

/* ============================================================
FIND GRAPHIC
============================================================ */

function findGraphicForFeature(
feature
) {

const map =
window.city4allMap;

const graphics =
map?.resultsLayer
?.graphics
?.toArray?.() ||
[];

if (!graphics.length) {
return null;
}

const byReference =
graphics.find(
graphic =>
graphic.__city4allFeature ===
feature
);

if (byReference) {
return byReference;
}

const objectId =
feature?.objectId ??
feature?.objectid ??
null;

if (
objectId !== null &&
objectId !== undefined
) {

const wanted =
String(
objectId
);

const byId =
graphics.find(
graphic =>
String(
graphic.attributes
?.city4allKey ??
""
) ===
wanted
);

if (
byId
) {

return byId;

}

}

const latitude =
Number(
feature?.latitude
);

const longitude =
Number(
feature?.longitude
);

return (
graphics.find(
graphic => {

const gLat =
Number(
graphic.geometry
?.latitude
);

const gLon =
Number(
graphic.geometry
?.longitude
);

return (
Number.isFinite(
gLat
) &&
Number.isFinite(
gLon
) &&
Math.abs(
gLat -
latitude
) <
0.000001 &&
Math.abs(
gLon -
longitude
) <
0.000001
);

}
) ||
null
);

}

/* ============================================================
FOCUS SINGLE
============================================================ */

async function focusMapFeature(
feature,
options = {}
) {

if (
!hasCoordinates(
feature
)
) {

return false;

}

const {
openPopup =
true
} =
options;

try {

const ready =
await waitForMapReady(
8000
);

if (
!ready
) {

return false;

}

const view =
window.city4allMap
?.view;

if (
!view
) {

return false;

}

const latitude =
Number(
feature.latitude
);

const longitude =
Number(
feature.longitude
);

let graphic =
findGraphicForFeature(
feature
);

if (
!graphic
) {

await ensureFeatureOnMap(
feature
);

graphic =
findGraphicForFeature(
feature
);

}

await view.goTo(

{

center: [
longitude,
latitude
],

zoom:
17

},

{

duration:
850

}

);

if (
openPopup &&
graphic
) {

await new Promise(
resolve =>
setTimeout(
resolve,
100
)
);

await view.openPopup({

features: [
graphic
],

location:
graphic.geometry

});

}

return true;

}

catch (
error
) {

console.warn(
"Could not focus feature:",
error
);

return false;

}

}

/* ============================================================
FOCUS ALL
============================================================ */

async function focusAllFeatures(
features
) {

const validFeatures =
Array.isArray(
features
)
? features.filter(
hasCoordinates
)
: [];

if (
!validFeatures.length
) {

return false;

}

if (
validFeatures.length ===
1
) {

return focusMapFeature(
validFeatures[0],
{
openPopup:
true
}
);

}

try {

const ready =
await waitForMapReady(
8000
);

if (
!ready
) {

return false;

}

const view =
window.city4allMap
?.view;

if (
!view
) {

return false;

}

const points =
validFeatures.map(
feature => ({

type:
"point",

longitude:
Number(
feature.longitude
),

latitude:
Number(
feature.latitude
)

})
);

try {

await view.goTo(

points,

{

padding: {

top:
80,

right:
80,

bottom:
80,

left:
80

},

duration:
900

}

);

return true;

}

catch (
goToError
) {

console.warn(
"goTo(points) failed:",
goToError
);

}

return fallbackFitMap(
validFeatures
);

}

catch (
error
) {

console.warn(
"Could not zoom to all features:",
error
);

return false;

}

}

/* ============================================================
FALLBACK FIT MAP
============================================================ */

async function fallbackFitMap(
features
) {

const view =
window.city4allMap
?.view;

if (
!view ||
!features.length
) {

return false;

}

const longitudes =
features.map(
feature =>
Number(
feature.longitude
)
);

const latitudes =
features.map(
feature =>
Number(
feature.latitude
)
);

const minLon =
Math.min(
...longitudes
);

const maxLon =
Math.max(
...longitudes
);

const minLat =
Math.min(
...latitudes
);

const maxLat =
Math.max(
...latitudes
);

const centerLon =
(
minLon +
maxLon
) /
2;

const centerLat =
(
minLat +
maxLat
) /
2;

const span =
Math.max(

maxLon -
minLon,

maxLat -
minLat

);

let zoom =
12;

if (
span <
0.01
) {

zoom =
16;

}

else if (
span <
0.03
) {

zoom =
14;

}

else if (
span <
0.08
) {

zoom =
12;

}

else if (
span <
0.2
) {

zoom =
10;

}

else if (
span <
0.5
) {

zoom =
8;

}

else if (
span <
1
) {

zoom =
7;

}

else {

zoom =
5;

}

await view.goTo(

{

center: [
centerLon,
centerLat
],

zoom

},

{

duration:
900

}

);

return true;

}

/* ============================================================
COORDINATES
============================================================ */

function hasCoordinates(
feature
) {

if (
!feature
) {

return false;

}

const latitude =
Number(
feature.latitude
);

const longitude =
Number(
feature.longitude
);

return (

Number.isFinite(
latitude
) &&

Number.isFinite(
longitude
) &&

latitude >=
-90 &&

latitude <=
90 &&

longitude >=
-180 &&

longitude <=
180

);

}

/* ============================================================
GOOGLE MAPS URL
============================================================ */

function createGoogleMapsUrl(
feature
) {

if (
!hasCoordinates(
feature
)
) {

return null;

}

const latitude =
Number(
feature.latitude
);

const longitude =
Number(
feature.longitude
);

return (
"https://www.google.com/maps/dir/?api=1" +
"&destination=" +
encodeURIComponent(
`${latitude},${longitude}`
) +
"&travelmode=walking"
);

}

/* ============================================================
VOICE
============================================================ */

function setupVoice() {

if (
!voiceButton
) {

return;

}

const SpeechRecognition =
window.SpeechRecognition ||
window.webkitSpeechRecognition;

if (
!SpeechRecognition
) {

voiceButton.title =
"Η φωνητική συνομιλία δεν υποστηρίζεται σε αυτόν τον browser.";

voiceButton.style.opacity =
"0.45";

voiceButton.addEventListener(
"click",
() => {

addMessage(
"ai",
"🎤 Η φωνητική συνομιλία δεν υποστηρίζεται από τον συγκεκριμένο browser."
);

}
);

return;

}

recognition =
new SpeechRecognition();

recognition.lang =
"el-GR";

recognition.continuous =
false;

recognition.interimResults =
false;

recognition.maxAlternatives =
1;

recognition.onstart =
() => {

listening =
true;

voiceButton.classList.add(
"active"
);

voiceButton.textContent =
"⏹️";

voiceButton.title =
"Έξοδος από φωνητική συνομιλία";

voiceButton.setAttribute(
"aria-label",
"Έξοδος από φωνητική συνομιλία"
);

if (
inputEl
) {

inputEl.placeholder =
"Μίλησε στον City4All Assistant...";

}

};

recognition.onend =
() => {

listening =
false;

if (
!voiceMode
) {

resetVoiceButton();

return;

}

if (
!isLoading
) {

clearTimeout(
voiceRestartTimer
);

voiceRestartTimer =
setTimeout(
() => {

if (
voiceMode &&
!listening &&
!isLoading
) {

startRecognition();

}

},
250
);

}

};

recognition.onresult =
event => {

const transcript =
event.results
?.[0]
?.[0]
?.transcript
?.trim() ||
"";

if (
!transcript ||
isLoading ||
!voiceMode ||
!inputEl
) {

return;

}

inputEl.value =
transcript;

inputEl.dispatchEvent(
new Event(
"input"
)
);

sendMessage({
fromVoice:
true
});

};

recognition.onerror =
event => {

console.warn(
"Speech recognition error:",
event.error
);

if (
event.error ===
"not-allowed"
) {

addMessage(
"ai",
"🎤 Χρειάζεται να επιτρέψεις πρόσβαση στο μικρόφωνο από τον browser."
);

stopVoiceMode();

}

};

voiceButton.addEventListener(
"click",
toggleVoiceMode
);

}

/* ============================================================
VOICE MODE
============================================================ */

function toggleVoiceMode() {

if (
!recognition
) {

return;

}

if (
voiceMode
) {

stopVoiceMode();

}
else {

startVoiceMode();

}

}

function startVoiceMode() {

if (
!recognition ||
voiceMode
) {

return;

}

voiceMode =
true;

stopSpeaking();

voiceButton.classList.add(
"active"
);

voiceButton.textContent =
"⏹️";

voiceButton.title =
"Έξοδος από φωνητική συνομιλία";

voiceButton.setAttribute(
"aria-label",
"Έξοδος από φωνητική συνομιλία"
);

if (
inputEl
) {

inputEl.placeholder =
"Μίλησε στον City4All Assistant...";

inputEl.disabled =
true;

}

startRecognition();

}

function startRecognition() {

if (
!recognition ||
!voiceMode ||
listening ||
isLoading
) {

return;

}

try {

recognition.start();

}

catch (
error
) {

console.warn(
"Could not start speech recognition:",
error
);

}

}

function stopVoiceMode() {

voiceMode =
false;

clearTimeout(
voiceRestartTimer
);

stopSpeaking();

if (
recognition &&
listening
) {

try {

recognition.stop();

}

catch {}

}

listening =
false;

if (
inputEl
) {

inputEl.disabled =
false;

inputEl.placeholder =
"Ρώτησε τον City4All Assistant...";

}

resetVoiceButton();

}

function resetVoiceButton() {

if (
!voiceButton
) {

return;

}

voiceButton.classList.remove(
"active"
);

voiceButton.textContent =
"🎤";

voiceButton.title =
"Έναρξη φωνητικής συνομιλίας";

voiceButton.setAttribute(
"aria-label",
"Έναρξη φωνητικής συνομιλίας"
);

}

/* ============================================================
TEXT TO SPEECH
============================================================ */

function speakAnswer(
text
) {

if (
!(
"speechSynthesis"
in
window
)
) {

return;

}

if (
!text ||
!text.trim()
) {

return;

}

stopSpeaking();

const cleanText =
String(
text
)

.replace(
/https?:\/\/\S+/g,
""
)

.replace(
/[*_#`]/g,
""
)

.replace(
/<[^>]*>/g,
""
)

.trim();

if (
!cleanText
) {

return;

}

const utterance =
new SpeechSynthesisUtterance(
cleanText
);

utterance.lang =
"el-GR";

utterance.rate =
1.0;

utterance.pitch =
1.0;

utterance.volume =
1.0;

utterance.onstart =
() => {

isSpeaking =
true;

};

utterance.onend =
() => {

isSpeaking =
false;

if (
voiceMode &&
!listening &&
!isLoading
) {

clearTimeout(
voiceRestartTimer
);

voiceRestartTimer =
setTimeout(
() => {

if (
voiceMode &&
!listening &&
!isLoading
) {

startRecognition();

}

},
300
);

}

};

utterance.onerror =
() => {

isSpeaking =
false;

};

window.speechSynthesis.speak(
utterance
);

}

/* ============================================================
STOP SPEAKING
============================================================ */

function stopSpeaking() {

if (
"speechSynthesis"
in
window
) {

window.speechSynthesis.cancel();

}

isSpeaking =
false;

}

/* ============================================================
MOBILE VIEWPORT
============================================================ */

function setupMobileViewport() {

const setViewportHeight =
() => {

const height =
window.visualViewport?.height ||
window.innerHeight;

document.documentElement
.style
.setProperty(
"--app-height",
`${height}px`
);

requestAnimationFrame(
() => {

try {

window.city4allMap
?.view
?.resize();

}

catch {}

}
);

};

setViewportHeight();

window.addEventListener(
"resize",
setViewportHeight
);

if (
window.visualViewport
) {

window.visualViewport.addEventListener(
"resize",
setViewportHeight
);

window.visualViewport.addEventListener(
"scroll",
setViewportHeight
);

}

}

/* ============================================================
POPUP SECURITY
============================================================ */

function escapePopupText(
value
) {

return String(
value ??
""
)

.replaceAll(
"&",
"&amp;"
)

.replaceAll(
"<",
"&lt;"
)

.replaceAll(
">",
"&gt;"
)

.replaceAll(
'"',
"&quot;"
)

.replaceAll(
"'",
"&#039;"
);

}

/* ============================================================
HTML SECURITY
============================================================ */

function escapeHTML(
value
) {

return String(
value ??
""
)

.replaceAll(
"&",
"&amp;"
)

.replaceAll(
"<",
"&lt;"
)

.replaceAll(
">",
"&gt;"
)

.replaceAll(
'"',
"&quot;"
)

.replaceAll(
"'",
"&#039;"
);

}

function escapeAttribute(
value
) {

return escapeHTML(
value
);

}

/* ============================================================
MAP READY EVENT
============================================================ */

window.addEventListener(
"city4all-map-ready",
async () => {

console.log(
"City4All map-ready event received."
);

try {

const map =
window.city4allMap;

if (
!map
) {

return;

}

if (
map?.view?.when
) {

await map.view.when();

}

resolveMapReady();

}

catch (
error
) {

console.warn(
"City4All map ready error:",
error
);

resolveMapReady();

}

}
);
````
