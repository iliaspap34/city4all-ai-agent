const API_BASE =
  "https://city4allfinalai.ilias-pap-net.workers.dev";

const CHAT_URL = `${API_BASE}/chat`;

let conversation = [];
let previousFeatures = [];
let isLoading = false;

const messagesEl = document.getElementById("messages");
const resultsEl = document.getElementById("results");
const inputEl = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const voiceButton = document.getElementById("voiceButton");


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  setupQuickActions();
  setupInput();
  setupVoice();

  console.log("City4All AI frontend loaded.");
});


// ============================================================
// QUICK ACTIONS
// ============================================================

function setupQuickActions() {
  document.querySelectorAll(".quick-button").forEach(button => {
    button.addEventListener("click", () => {
      const question = button.dataset.question;

      if (!question || isLoading) {
        return;
      }

      inputEl.value = question;
      sendMessage();
    });
  });
}


// ============================================================
// INPUT
// ============================================================

function setupInput() {
  inputEl.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  inputEl.addEventListener("input", () => {
    inputEl.style.height = "45px";

    const newHeight =
      Math.min(inputEl.scrollHeight, 110);

    inputEl.style.height =
      `${Math.max(45, newHeight)}px`;
  });

  sendButton.addEventListener("click", sendMessage);
}


// ============================================================
// SEND MESSAGE
// ============================================================

async function sendMessage() {
  if (isLoading) {
    return;
  }

  const message =
    inputEl.value.trim();

  if (!message) {
    return;
  }

  addMessage("user", message);

  inputEl.value = "";
  inputEl.style.height = "45px";

  setLoading(true);

  const loadingMessage =
    addLoadingMessage();

  try {
    const response =
      await fetch(CHAT_URL, {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          message,
          conversation,
          previousFeatures
        })
      });

    const data =
      await response.json();

    removeLoadingMessage(
      loadingMessage
    );

    if (!response.ok || !data.success) {
      throw new Error(
        data?.error ||
        "Η αναζήτηση απέτυχε."
      );
    }

    const answer =
      data.answer ||
      "Δεν μπόρεσα να δημιουργήσω απάντηση.";

    addMessage("ai", answer);

    updateConversation(
      message,
      answer
    );

    updateResults(
      data
    );

    updateMap(
      data.features || []
    );

    previousFeatures =
      Array.isArray(data.features)
        ? data.features
        : [];

  } catch (error) {

    console.error(
      "City4All AI error:",
      error
    );

    removeLoadingMessage(
      loadingMessage
    );

    addMessage(
      "ai",
      "⚠️ Κάτι πήγε στραβά. Δεν μπόρεσα να επικοινωνήσω με το City4All AI."
    );

  } finally {
    setLoading(false);
  }
}


// ============================================================
// CONVERSATION
// ============================================================

function updateConversation(
  userMessage,
  assistantMessage
) {
  conversation.push({
    role: "user",
    content: userMessage
  });

  conversation.push({
    role: "assistant",
    content: assistantMessage
  });

  // Keep frontend conversation small.
  if (conversation.length > 20) {
    conversation =
      conversation.slice(-20);
  }
}


// ============================================================
// MESSAGES
// ============================================================

function addMessage(
  role,
  text
) {
  const wrapper =
    document.createElement("div");

  wrapper.className =
    `message ${role}`;

  const bubble =
    document.createElement("div");

  bubble.className =
    "bubble";

  bubble.textContent =
    text;

  wrapper.appendChild(
    bubble
  );

  messagesEl.appendChild(
    wrapper
  );

  scrollMessages();

  return wrapper;
}


function addLoadingMessage() {
  const wrapper =
    document.createElement("div");

  wrapper.className =
    "message ai";

  wrapper.dataset.loading =
    "true";

  const bubble =
    document.createElement("div");

  bubble.className =
    "bubble";

  bubble.innerHTML =
    `
      <span class="loading-dots">
        Αναζητώ<span>.</span><span>.</span><span>.</span>
      </span>
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
  if (element) {
    element.remove();
  }
}


function scrollMessages() {
  requestAnimationFrame(() => {
    messagesEl.scrollTop =
      messagesEl.scrollHeight;
  });
}


// ============================================================
// LOADING STATE
// ============================================================

function setLoading(
  loading
) {
  isLoading =
    loading;

  sendButton.disabled =
    loading;

  voiceButton.disabled =
    loading;

  inputEl.disabled =
    loading;

  sendButton.textContent =
    loading
      ? "..."
      : "Αποστολή";
}


// ============================================================
// RESULTS
// ============================================================

function updateResults(
  data
) {
  const primary =
    Array.isArray(
      data.primaryFeatures
    )
      ? data.primaryFeatures
      : [];

  const secondary =
    Array.isArray(
      data.secondaryFeatures
    )
      ? data.secondaryFeatures
      : [];

  const all =
    [...primary, ...secondary];

  if (!all.length) {
    resultsEl.classList.remove(
      "has-results"
    );

    resultsEl.innerHTML =
      "";

    return;
  }

  resultsEl.classList.add(
    "has-results"
  );

  const header =
    `
      <div class="results-header">
        <div class="results-title">
          Αποτελέσματα
        </div>

        <div class="results-count">
          ${all.length} σημεία
        </div>
      </div>
    `;

  const cards =
    all
      .map((feature, index) =>
        createResultCard(
          feature,
          index
        )
      )
      .join("");

  resultsEl.innerHTML =
    header + cards;

  attachResultEvents();
}


// ============================================================
// RESULT CARD
// ============================================================

function createResultCard(
  feature,
  index
) {
  const name =
    escapeHTML(
      feature.name ||
      "Χωρίς ονομασία"
    );

  const type =
    escapeHTML(
      feature.type ||
      "Σημείο"
    );

  const accessibility =
    escapeHTML(
      feature.accessibility ||
      "Δεν έχει καταχωρηθεί συγκεκριμένο χαρακτηριστικό."
    );

  const comments =
    escapeHTML(
      feature.comments ||
      ""
    );

  const area =
    escapeHTML(
      feature.area ||
      feature.municipality ||
      ""
    );

  const sourceType =
    feature.external
      ? "Internet / OpenStreetMap"
      : "City4All";

  const image =
    feature.imageUrl
      ? `
        <img
          class="result-image"
          src="${escapeAttribute(feature.imageUrl)}"
          alt="${name}"
          loading="lazy"
          onerror="this.style.display='none'"
        >
      `
      : "";

  const routeUrl =
    feature.googleMapsUrl ||
    createGoogleMapsUrl(
      feature
    );

  const routeButton =
    routeUrl
      ? `
        <a
          class="route-button"
          href="${escapeAttribute(routeUrl)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          🧭 Οδηγίες
        </a>
      `
      : "";

  return `
    <article
      class="result-card"
      data-index="${index}"
    >

      ${image}

      <div class="result-number">
        ${index + 1}
      </div>

      <h3>
        ${name}
      </h3>

      <div class="result-type">
        ${type}
      </div>

      <div class="source-badge ${
        feature.external
          ? "external"
          : ""
      }">
        ${sourceType}
      </div>

      ${
        area
          ? `
            <div class="info-row">
              📍 ${area}
            </div>
          `
          : ""
      }

      <div class="info-row accessibility">
        ♿ ${accessibility}
      </div>

      ${
        comments
          ? `
            <div class="info-row">
              ℹ️ ${comments}
            </div>
          `
          : ""
      }

      <div class="result-actions">

        ${routeButton}

        ${
          Number.isFinite(
            Number(feature.latitude)
          ) &&
          Number.isFinite(
            Number(feature.longitude)
          )
            ? `
              <button
                type="button"
                class="map-button"
                data-map-index="${index}"
              >
                🗺️ Χάρτης
              </button>
            `
            : ""
        }

      </div>

    </article>
  `;
}


// ============================================================
// RESULT EVENTS
// ============================================================

function attachResultEvents() {
  document
    .querySelectorAll(
      "[data-map-index]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const index =
            Number(
              button.dataset.mapIndex
            );

          const feature =
            previousFeatures[index];

          if (
            feature
          ) {
            focusMapFeature(
              feature
            );
          }

        }
      );

    });
}


// ============================================================
// MAP
// ============================================================

function updateMap(
  features
) {
  if (
    !window.city4allMap ||
    !window.city4allMap.view ||
    !window.city4allMap.resultsLayer
  ) {
    console.warn(
      "City4All map is not ready."
    );

    return;
  }

  const {
    view,
    resultsLayer,
    Graphic
  } = window.city4allMap;

  resultsLayer.removeAll();

  const validFeatures =
    features.filter(
      feature =>
        Number.isFinite(
          Number(feature.latitude)
        ) &&
        Number.isFinite(
          Number(feature.longitude)
        )
    );

  validFeatures.forEach(
    (feature, index) => {

      const latitude =
        Number(
          feature.latitude
        );

      const longitude =
        Number(
          feature.longitude
        );

      const graphic =
        new Graphic({

          geometry: {
            type: "point",
            longitude,
            latitude
          },

          symbol: {
            type: "simple-marker",
            size: 14,
            color: feature.external
              ? "#f59e0b"
              : "#1976d2",
            outline: {
              color: "#ffffff",
              width: 2
            }
          },

          attributes: {
            name:
              feature.name ||
              "Σημείο",
            type:
              feature.type ||
              "Σημείο",
            accessibility:
              feature.accessibility ||
              "",
            index:
              index + 1
          },

          popupTemplate: {
            title:
              `{index}. {name}`,

            content: [
              {
                type: "text",

                text:
                  `
                    <strong>Κατηγορία:</strong>
                    {type}<br><br>

                    <strong>Προσβασιμότητα:</strong>
                    {accessibility}
                  `
              }
            ]
          }

        });

      resultsLayer.add(
        graphic
      );
    }
  );

  if (
    validFeatures.length === 1
  ) {

    view.goTo({
      center: [
        Number(
          validFeatures[0].longitude
        ),
        Number(
          validFeatures[0].latitude
        )
      ],
      zoom: 16
    });

  } else if (
    validFeatures.length > 1
  ) {

    const points =
      validFeatures.map(
        feature => ({
          type: "point",
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

    view.goTo(
      points,
      {
        padding: {
          top: 80,
          right: 60,
          bottom: 80,
          left: 60
        }
      }
    ).catch(() => {});

  }
}


function focusMapFeature(
  feature
) {
  if (
    !window.city4allMap ||
    !window.city4allMap.view
  ) {
    return;
  }

  const latitude =
    Number(
      feature.latitude
    );

  const longitude =
    Number(
      feature.longitude
    );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return;
  }

  window.city4allMap.view.goTo({
    center: [
      longitude,
      latitude
    ],
    zoom: 17
  });
}


function createGoogleMapsUrl(
  feature
) {
  const latitude =
    Number(
      feature.latitude
    );

  const longitude =
    Number(
      feature.longitude
    );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return (
    "https://www.google.com/maps/dir/?api=1" +
    "&destination=" +
    encodeURIComponent(
      `${latitude},${longitude}`
    ) +
    "&travelmode=walking"
  );
}


// ============================================================
// VOICE INPUT
// ============================================================

function setupVoice() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {

    voiceButton.title =
      "Η φωνητική εισαγωγή δεν υποστηρίζεται σε αυτόν τον browser.";

    voiceButton.style.opacity =
      "0.45";

    voiceButton.addEventListener(
      "click",
      () => {
        addMessage(
          "ai",
          "🎤 Η φωνητική εισαγωγή δεν υποστηρίζεται από τον συγκεκριμένο browser."
        );
      }
    );

    return;
  }

  const recognition =
    new SpeechRecognition();

  recognition.lang =
    "el-GR";

  recognition.continuous =
    false;

  recognition.interimResults =
    false;

  recognition.maxAlternatives =
    1;

  let listening =
    false;

  voiceButton.addEventListener(
    "click",
    () => {

      if (isLoading) {
        return;
      }

      if (listening) {
        recognition.stop();
        return;
      }

      try {
        recognition.start();
      } catch (error) {
        console.warn(
          "Speech recognition:",
          error
        );
      }
    }
  );

  recognition.onstart =
    () => {

      listening =
        true;

      voiceButton.classList.add(
        "active"
      );

      voiceButton.textContent =
        "⏹️";
    };

  recognition.onend =
    () => {

      listening =
        false;

      voiceButton.classList.remove(
        "active"
      );

      voiceButton.textContent =
        "🎤";
    };

  recognition.onresult =
    event => {

      const transcript =
        event.results?.[0]?.[0]?.transcript ||
        "";

      if (
        transcript.trim()
      ) {
        inputEl.value =
          transcript.trim();

        inputEl.dispatchEvent(
          new Event("input")
        );
      }
    };

  recognition.onerror =
    event => {

      console.warn(
        "Speech recognition error:",
        event.error
      );

    };
}


// ============================================================
// SECURITY / HTML HELPERS
// ============================================================

function escapeHTML(
  value
) {
  return String(
    value ?? ""
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


// ============================================================
// MAP READY
// ============================================================

window.addEventListener(
  "city4all-map-ready",
  () => {
    console.log(
      "City4All map is ready for AI results."
    );
  }
);
