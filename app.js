const API_URL = "https://city4allfinalai.ilias-pap-net.workers.dev";

const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const voiceButton = document.getElementById("voiceButton");
const resultsEl = document.getElementById("results");

let conversation = [];
let isLoading = false;
let lastFeatures = [];

/* =========================================
SEND MESSAGE
========================================= */

async function sendMessage() {
if (isLoading) return;

const message = inputEl.value.trim();
if (!message) return;

addMessage(message, "user");

inputEl.value = "";
autoResizeTextarea();

setLoading(true);

const typingMessage = addMessage(
"Το City4All AI ψάχνει...",
"ai",
true
);

try {
const response = await fetch(
API_URL + "/chat",
{
method: "POST",
headers: {
"Content-Type": "application/json"
},
body: JSON.stringify({
message: message,
conversation: conversation,
previousFeatures: lastFeatures
})
}
);

```
let data;

try {
  data = await response.json();
} catch (error) {
  throw new Error(
    "Ο Worker επέστρεψε μη έγκυρη απάντηση."
  );
}

removeMessage(typingMessage);

if (!response.ok || !data.success) {
  throw new Error(
    data.error || "Παρουσιάστηκε σφάλμα."
  );
}

conversation.push({
  role: "user",
  content: message
});

conversation.push({
  role: "assistant",
  content: data.answer || ""
});

if (conversation.length > 20) {
  conversation = conversation.slice(-20);
}

addMessage(
  data.answer || "Δεν υπήρξε απάντηση.",
  "ai"
);

lastFeatures = Array.isArray(data.features)
  ? data.features
  : [];

displayResults(lastFeatures);
showResultsOnMap(lastFeatures);
```

} catch (error) {
console.error(
"City4All Chat Error:",
error
);

```
removeMessage(typingMessage);

addMessage(
  "❌ Δεν μπόρεσα να συνδεθώ με το City4All AI. " +
  "Έλεγξε ότι ο Worker είναι online.",
  "ai"
);
```

} finally {
setLoading(false);
}
}

/* =========================================
ADD MESSAGE
========================================= */

function addMessage(
text,
role,
temporary = false
) {
const wrapper =
document.createElement("div");

wrapper.className =
"message " + role;

if (temporary) {
wrapper.dataset.temporary = "true";
}

const bubble =
document.createElement("div");

bubble.className =
"bubble";

bubble.textContent =
text;

wrapper.appendChild(bubble);

messagesEl.appendChild(wrapper);

messagesEl.scrollTop =
messagesEl.scrollHeight;

return wrapper;
}

/* =========================================
REMOVE MESSAGE
========================================= */

function removeMessage(element) {
if (
element &&
element.parentNode
) {
element.parentNode.removeChild(
element
);
}
}

/* =========================================
LOADING
========================================= */

function setLoading(loading) {
isLoading = loading;

sendButton.disabled = loading;
inputEl.disabled = loading;
voiceButton.disabled = loading;

sendButton.textContent =
loading
? "Αναζήτηση..."
: "Αποστολή";
}

/* =========================================
DISPLAY RESULTS
========================================= */

function displayResults(features) {
resultsEl.innerHTML = "";

if (
!Array.isArray(features) ||
features.length === 0
) {
resultsEl.classList.remove(
"has-results"
);

```
return;
```

}

resultsEl.classList.add(
"has-results"
);

const header =
document.createElement("div");

header.className =
"results-header";

const title =
document.createElement("div");

title.className =
"results-title";

title.textContent =
"Αποτελέσματα City4All";

const count =
document.createElement("div");

count.className =
"results-count";

count.textContent =
features.length + " σημεία";

header.appendChild(title);
header.appendChild(count);

resultsEl.appendChild(header);

features.forEach(
function(feature) {

```
  const card =
    document.createElement("div");

  card.className =
    "result-card";


  const heading =
    document.createElement("h3");

  heading.textContent =
    feature.name ||
    "Χωρίς ονομασία";

  card.appendChild(
    heading
  );


  const type =
    document.createElement("div");

  type.className =
    "result-type";

  type.textContent =
    feature.type ||
    "Σημείο";

  card.appendChild(
    type
  );


  if (feature.area) {

    const area =
      document.createElement("div");

    area.className =
      "info-row";

    area.textContent =
      "📍 " + feature.area;

    card.appendChild(
      area
    );
  }


  const accessibility =
    document.createElement("div");

  accessibility.className =
    "info-row";

  const accessibilityStrong =
    document.createElement("strong");

  accessibilityStrong.textContent =
    "♿ Προσβασιμότητα:";

  const accessibilityBreak =
    document.createElement("br");

  const accessibilitySpan =
    document.createElement("span");

  accessibilitySpan.className =
    "accessibility";

  accessibilitySpan.textContent =
    feature.accessibility ||
    "Δεν υπάρχει καταγεγραμμένη πληροφορία.";

  accessibility.appendChild(
    accessibilityStrong
  );

  accessibility.appendChild(
    accessibilityBreak
  );

  accessibility.appendChild(
    accessibilitySpan
  );

  card.appendChild(
    accessibility
  );


  if (feature.comments) {

    const comments =
      document.createElement("div");

    comments.className =
      "info-row";

    const commentsStrong =
      document.createElement("strong");

    commentsStrong.textContent =
      "📝 Παρατηρήσεις:";

    const commentsBreak =
      document.createElement("br");

    const commentsText =
      document.createElement("span");

    commentsText.textContent =
      feature.comments;

    comments.appendChild(
      commentsStrong
    );

    comments.appendChild(
      commentsBreak
    );

    comments.appendChild(
      commentsText
    );

    card.appendChild(
      comments
    );
  }


  const actions =
    document.createElement("div");

  actions.className =
    "result-actions";


  if (feature.googleMapsUrl) {

    const routeButton =
      document.createElement("a");

    routeButton.className =
      "route-button";

    routeButton.href =
      feature.googleMapsUrl;

    routeButton.target =
      "_blank";

    routeButton.rel =
      "noopener noreferrer";

    routeButton.textContent =
      "🗺️ Οδηγίες";

    actions.appendChild(
      routeButton
    );
  }


  const mapButton =
    document.createElement("button");

  mapButton.className =
    "map-button";

  mapButton.type =
    "button";

  mapButton.textContent =
    "📍 Χάρτης";

  mapButton.addEventListener(
    "click",
    function() {
      focusFeatureOnMap(
        feature
      );
    }
  );

  actions.appendChild(
    mapButton
  );

  card.appendChild(
    actions
  );

  resultsEl.appendChild(
    card
  );
}
```

);
}

/* =========================================
SHOW RESULTS ON MAP
========================================= */

function showResultsOnMap(features) {

if (
!window.city4allMap ||
!window.city4allMap.view ||
!window.city4allMap.resultsLayer
) {
return;
}

const view =
window.city4allMap.view;

const resultsLayer =
window.city4allMap.resultsLayer;

const Graphic =
window.city4allMap.Graphic;

if (!Graphic) {
console.warn(
"City4All Graphic class unavailable."
);
return;
}

resultsLayer.removeAll();

if (
!Array.isArray(features) ||
features.length === 0
) {
return;
}

const graphics = [];

features.forEach(
function(feature) {

```
  if (
    typeof feature.latitude !== "number" ||
    typeof feature.longitude !== "number"
  ) {
    return;
  }

  const point = {
    type: "point",
    longitude: feature.longitude,
    latitude: feature.latitude
  };

  const symbol = {
    type: "simple-marker",
    size: 13,
    color: "#1976d2",
    outline: {
      color: "#ffffff",
      width: 2
    }
  };

  const popupTemplate = {
    title:
      feature.name ||
      "City4All σημείο",

    content:
      "<strong>Τύπος:</strong> " +
      escapeHTML(
        feature.type || ""
      ) +
      "<br><br>" +
      "<strong>Προσβασιμότητα:</strong> " +
      escapeHTML(
        feature.accessibility || ""
      )
  };

  graphics.push(
    new Graphic({
      geometry: point,
      symbol: symbol,
      attributes: feature,
      popupTemplate: popupTemplate
    })
  );
}
```

);

if (graphics.length === 0) {
return;
}

resultsLayer.addMany(
graphics
);

const geometries =
graphics.map(
function(graphic) {
return graphic.geometry;
}
);

view.goTo(
{
target: geometries,
padding: 70
},
{
duration: 900
}
).catch(
function(error) {
console.warn(
"Map zoom error:",
error
);
}
);
}

/* =========================================
FOCUS SINGLE FEATURE
========================================= */

function focusFeatureOnMap(
feature
) {

if (
!window.city4allMap ||
!window.city4allMap.view
) {
return;
}

if (
typeof feature.latitude !== "number" ||
typeof feature.longitude !== "number"
) {
return;
}

const view =
window.city4allMap.view;

view.goTo(
{
center: [
feature.longitude,
feature.latitude
],
zoom: 17
},
{
duration: 700
}
).catch(
function(error) {
console.warn(
"Map focus error:",
error
);
}
);
}

/* =========================================
ESCAPE HTML
========================================= */

function escapeHTML(value) {

return String(value)
.replace(
/&/g,
"&"
)
.replace(
/</g,
"<"
)
.replace(
/>/g,
">"
)
.replace(
/"/g,
"""
)
.replace(
/'/g,
"'"
);
}

/* =========================================
ESCAPE ATTRIBUTE
========================================= */

function escapeAttribute(value) {

return String(value)
.replace(
/&/g,
"&"
)
.replace(
/"/g,
"""
)
.replace(
/</g,
"<"
)
.replace(
/>/g,
">"
);
}

/* =========================================
ENTER TO SEND
========================================= */

inputEl.addEventListener(
"keydown",
function(event) {

```
if (
  event.key === "Enter" &&
  !event.shiftKey
) {

  event.preventDefault();

  sendMessage();
}
```

}
);

/* =========================================
SEND BUTTON
========================================= */

sendButton.addEventListener(
"click",
sendMessage
);

/* =========================================
QUICK BUTTONS
========================================= */

document
.querySelectorAll(
".quick-button"
)
.forEach(
function(button) {

```
  button.addEventListener(
    "click",
    function() {

      if (isLoading) {
        return;
      }

      const question =
        button.dataset.question ||
        "";

      if (!question) {
        return;
      }

      inputEl.value =
        question;

      autoResizeTextarea();

      sendMessage();
    }
  );
}
```

);

/* =========================================
TEXTAREA RESIZE
========================================= */

inputEl.addEventListener(
"input",
autoResizeTextarea
);

function autoResizeTextarea() {

inputEl.style.height =
"45px";

inputEl.style.height =
Math.min(
inputEl.scrollHeight,
110
) + "px";
}

/* =========================================
VOICE INPUT
========================================= */

let recognition = null;
let isListening = false;

const SpeechRecognition =
window.SpeechRecognition ||
window.webkitSpeechRecognition;

if (SpeechRecognition) {

recognition =
new SpeechRecognition();

recognition.lang =
"el-GR";

recognition.continuous =
false;

recognition.interimResults =
false;

recognition.onstart =
function() {

```
  isListening =
    true;

  voiceButton.classList.add(
    "active"
  );

  voiceButton.textContent =
    "⏹️";
};
```

recognition.onresult =
function(event) {

```
  const transcript =
    event
      .results[0][0]
      .transcript;

  inputEl.value =
    transcript;

  autoResizeTextarea();
};
```

recognition.onerror =
function(event) {

```
  console.error(
    "Speech recognition error:",
    event.error
  );
};
```

recognition.onend =
function() {

```
  isListening =
    false;

  voiceButton.classList.remove(
    "active"
  );

  voiceButton.textContent =
    "🎤";
};
```

voiceButton.addEventListener(
"click",
function() {

```
  if (isLoading) {
    return;
  }

  if (isListening) {
    recognition.stop();
    return;
  }

  try {
    recognition.start();
  } catch (error) {
    console.error(
      "Voice start error:",
      error
    );
  }
}
```

);

} else {

voiceButton.disabled =
true;

voiceButton.title =
"Η φωνητική εισαγωγή δεν υποστηρίζεται από αυτόν τον browser.";
}

/* =========================================
INITIAL STATE
========================================= */

console.log(
"City4All AI interface loaded."
);
