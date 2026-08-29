const API_URL =
  "https://city4allfinalai.ilias-pap-net.workers.dev";

const messagesEl =
  document.getElementById("messages");

const inputEl =
  document.getElementById("messageInput");

const sendButton =
  document.getElementById("sendButton");

const voiceButton =
  document.getElementById("voiceButton");

const resultsEl =
  document.getElementById("results");

let conversation = [];

let isLoading = false;

let lastFeatures = [];


/* =========================================
   SEND MESSAGE
========================================= */

async function sendMessage() {

  if (isLoading) {
    return;
  }

  const message =
    inputEl.value.trim();

  if (!message) {
    return;
  }

  addMessage(
    message,
    "user"
  );

  inputEl.value = "";

  autoResizeTextarea();

  setLoading(true);

  const typingMessage =
    addMessage(
      "Το City4All AI ψάχνει...",
      "ai",
      true
    );

  try {

    const response =
      await fetch(
        API_URL + "/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            message: message,

            conversation:
              conversation,

            previousFeatures:
              lastFeatures
          })
        }
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

    removeMessage(
      typingMessage
    );

    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data.error ||
        "Παρουσιάστηκε σφάλμα."
      );

    }

    conversation.push({
      role: "user",
      content: message
    });

    conversation.push({
      role: "assistant",
      content:
        data.answer || ""
    });

    if (
      conversation.length > 20
    ) {

      conversation =
        conversation.slice(-20);

    }

    addMessage(
      data.answer ||
      "Δεν υπήρξε απάντηση.",
      "ai"
    );

    lastFeatures =
      Array.isArray(
        data.features
      )
        ? data.features
        : [];

    displayResults(
      lastFeatures
    );

    showResultsOnMap(
      lastFeatures
    );

  } catch (error) {

    console.error(
      "City4All Chat Error:",
      error
    );

    removeMessage(
      typingMessage
    );

    addMessage(
      "❌ Δεν μπόρεσα να συνδεθώ με το City4All AI. " +
      "Έλεγξε ότι ο Worker είναι online.",
      "ai"
    );

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

    wrapper.dataset.temporary =
      "true";

  }

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

  messagesEl.scrollTop =
    messagesEl.scrollHeight;

  return wrapper;
}


/* =========================================
   REMOVE MESSAGE
========================================= */

function removeMessage(
  element
) {

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

function setLoading(
  loading
) {

  isLoading =
    loading;

  sendButton.disabled =
    loading;

  inputEl.disabled =
    loading;

  voiceButton.disabled =
    loading;

  sendButton.textContent =
    loading
      ? "Αναζήτηση..."
      : "Αποστολή";
}


/* =========================================
   DISPLAY RESULTS
========================================= */

function displayResults(
  features
) {

  resultsEl.innerHTML =
    "";

  if (
    !Array.isArray(features) ||
    features.length === 0
  ) {

    resultsEl.classList.remove(
      "has-results"
    );

    return;
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
    features.length +
    (
      features.length === 1
        ? " σημείο"
        : " σημεία"
    );

  header.appendChild(
    title
  );

  header.appendChild(
    count
  );

  resultsEl.appendChild(
    header
  );

  features.forEach(
    function (
      feature,
      index
    ) {

      const card =
        document.createElement(
          "div"
        );

      card.className =
        "result-card";

      const title =
        document.createElement(
          "h3"
        );

      title.textContent =
        feature.name ||
        "Χωρίς ονομασία";

      const type =
        document.createElement(
          "div"
        );

      type.className =
        "result-type";

      type.textContent =
        feature.type ||
        "Σημείο";

      card.appendChild(
        title
      );

      card.appendChild(
        type
      );

      if (feature.area) {

        const areaRow =
          document.createElement(
            "div"
          );

        areaRow.className =
          "info-row";

        areaRow.textContent =
          "📍 " +
          feature.area;

        card.appendChild(
          areaRow
        );

      }

      const accessibilityRow =
        document.createElement(
          "div"
        );

      accessibilityRow.className =
        "info-row";

      const accessibilityStrong =
        document.createElement(
          "strong"
        );

      accessibilityStrong.textContent =
        "♿ Προσβασιμότητα:";

      accessibilityRow.appendChild(
        accessibilityStrong
      );

      accessibilityRow.appendChild(
        document.createElement(
          "br"
        )
      );

      const accessibilitySpan =
        document.createElement(
          "span"
        );

      accessibilitySpan.className =
        "accessibility";

      accessibilitySpan.textContent =
        feature.accessibility ||
        "Δεν υπάρχει καταγεγραμμένη πληροφορία.";

      accessibilityRow.appendChild(
        accessibilitySpan
      );

      card.appendChild(
        accessibilityRow
      );

      if (feature.comments) {

        const commentsRow =
          document.createElement(
            "div"
          );

        commentsRow.className =
          "info-row";

        const commentsStrong =
          document.createElement(
            "strong"
          );

        commentsStrong.textContent =
          "📝 Παρατηρήσεις:";

        commentsRow.appendChild(
          commentsStrong
        );

        commentsRow.appendChild(
          document.createElement(
            "br"
          )
        );

        const commentsText =
          document.createTextNode(
            feature.comments
          );

        commentsRow.appendChild(
          commentsText
        );

        card.appendChild(
          commentsRow
        );

      }

      const actions =
        document.createElement(
          "div"
        );

      actions.className =
        "result-actions";

      if (
        feature.googleMapsUrl
      ) {

        const routeButton =
          document.createElement(
            "a"
          );

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
        document.createElement(
          "button"
        );

      mapButton.className =
        "map-button";

      mapButton.type =
        "button";

      mapButton.textContent =
        "📍 Χάρτης";

      mapButton.addEventListener(
        "click",
        function () {

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
  );
}


/* =========================================
   SHOW RESULTS ON MAP
========================================= */

function showResultsOnMap(
  features
) {

  if (
    !Array.isArray(features)
  ) {
    return;
  }

  if (
    !window.city4allMap ||
    !window.city4allMap.resultsLayer
  ) {
    return;
  }

  const mapData =
    window.city4allMap;

  const view =
    mapData.view;

  const resultsLayer =
    mapData.resultsLayer;

  const Graphic =
    mapData.Graphic;

  if (
    !view ||
    !resultsLayer ||
    !Graphic
  ) {
    return;
  }

  resultsLayer.removeAll();

  if (
    features.length === 0
  ) {
    return;
  }

  const graphics = [];

  features.forEach(
    function (feature) {

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

      if (
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return;
      }

      const point = {
        type: "point",
        longitude: longitude,
        latitude: latitude
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

      const popupContent =
        document.createElement(
          "div"
        );

      const typeLine =
        document.createElement(
          "div"
        );

      const typeStrong =
        document.createElement(
          "strong"
        );

      typeStrong.textContent =
        "Τύπος: ";

      typeLine.appendChild(
        typeStrong
      );

      typeLine.appendChild(
        document.createTextNode(
          feature.type || ""
        )
      );

      const accessibilityLine =
        document.createElement(
          "div"
        );

      accessibilityLine.style.marginTop =
        "8px";

      const accessibilityStrong =
        document.createElement(
          "strong"
        );

      accessibilityStrong.textContent =
        "Προσβασιμότητα: ";

      accessibilityLine.appendChild(
        accessibilityStrong
      );

      accessibilityLine.appendChild(
        document.createTextNode(
          feature.accessibility || ""
        )
      );

      popupContent.appendChild(
        typeLine
      );

      popupContent.appendChild(
        accessibilityLine
      );

      const graphic =
        new Graphic({
          geometry: point,
          symbol: symbol,
          attributes: feature,
          popupTemplate: {
            title:
              feature.name ||
              "City4All σημείο",
            content:
              popupContent
          }
        });

      graphics.push(
        graphic
      );

    }
  );

  if (
    graphics.length === 0
  ) {
    return;
  }

  resultsLayer.addMany(
    graphics
  );

  const geometries =
    graphics.map(
      function (graphic) {
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
    function (error) {

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

  const view =
    window.city4allMap.view;

  view.goTo(
    {
      center: [
        longitude,
        latitude
      ],
      zoom: 17
    },
    {
      duration: 700
    }
  ).then(
    function () {

      if (
        view.popup
      ) {

        view.popup.open({
          location: {
            type: "point",
            longitude: longitude,
            latitude: latitude
          },
          title:
            feature.name ||
            "City4All σημείο"
        });

      }

    }
  ).catch(
    function (error) {

      console.warn(
        "Map focus error:",
        error
      );

    }
  );
}


/* =========================================
   ENTER TO SEND
========================================= */

inputEl.addEventListener(
  "keydown",
  function (event) {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      sendMessage();

    }

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
    function (button) {

      button.addEventListener(
        "click",
        function () {

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
    function () {

      isListening =
        true;

      voiceButton.classList.add(
        "active"
      );

      voiceButton.textContent =
        "⏹️";

    };

  recognition.onresult =
    function (event) {

      const transcript =
        event.results[0][0].transcript;

      inputEl.value =
        transcript;

      autoResizeTextarea();

    };

  recognition.onerror =
    function (event) {

      console.error(
        "Speech recognition error:",
        event.error
      );

    };

  recognition.onend =
    function () {

      isListening =
        false;

      voiceButton.classList.remove(
        "active"
      );

      voiceButton.textContent =
        "🎤";

    };

  voiceButton.addEventListener(
    "click",
    function () {

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
  );

} else {

  voiceButton.disabled =
    true;

  voiceButton.title =
    "Η φωνητική εισαγωγή δεν υποστηρίζεται από αυτόν τον browser.";

}


/* =========================================
   MAP READY HANDLER
========================================= */

window.addEventListener(
  "city4all-map-ready",
  function () {

    if (
      lastFeatures.length > 0
    ) {

      showResultsOnMap(
        lastFeatures
      );

    }

  }
);


/* =========================================
   INITIAL STATE
========================================= */

console.log(
  "City4All AI interface loaded."
);
