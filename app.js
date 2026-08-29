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


  const typingId =
    addMessage(
      "Το City4All AI ψάχνει...",
      "ai",
      true
    );


  try {

    const response =
      await fetch(
        `${API_URL}/chat`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              message: message,
              conversation: conversation
            })
        }
      );


    const data =
      await response.json();


    removeMessage(
      typingId
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
      conversation.length > 14
    ) {

      conversation =
        conversation.slice(-14);

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


  }
  catch (error) {

    console.error(
      "Chat error:",
      error
    );


    removeMessage(
      typingId
    );


    addMessage(
      "❌ Δεν μπορώ να συνδεθώ αυτή τη στιγμή με το City4All AI.",
      "ai"
    );

  }
  finally {

    setLoading(
      false
    );

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
    document.createElement(
      "div"
    );


  wrapper.className =
    `message ${role}`;


  if (temporary) {

    wrapper.dataset.temporary =
      "true";

  }


  const bubble =
    document.createElement(
      "div"
    );


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
    document.createElement(
      "div"
    );


  header.className =
    "results-header";


  header.innerHTML = `
    <div class="results-title">
      Αποτελέσματα City4All
    </div>

    <div class="results-count">
      ${features.length} σημεία
    </div>
  `;


  resultsEl.appendChild(
    header
  );


  features.forEach(
    (feature, index) => {

      const card =
        document.createElement(
          "div"
        );


      card.className =
        "result-card";


      const title =
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
          "Δεν υπάρχει καταγεγραμμένη πληροφορία."
        );


      const comments =
        escapeHTML(
          feature.comments ||
          ""
        );


      const area =
        escapeHTML(
          feature.area ||
          ""
        );


      card.innerHTML = `

        <h3>
          ${title}
        </h3>

        <div class="result-type">
          ${type}
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

        <div class="info-row">

          ♿ <strong>
            Προσβασιμότητα:
          </strong>

          <br>

          <span class="accessibility">
            ${accessibility}
          </span>

        </div>

        ${
          comments
            ? `
              <div class="info-row">

                📝 <strong>
                  Παρατηρήσεις:
                </strong>

                <br>

                ${comments}

              </div>
            `
            : ""
        }

        <div class="result-actions">

          ${
            feature.googleMapsUrl
              ? `
                <a
                  class="route-button"
                  href="${feature.googleMapsUrl}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🗺️ Οδηγίες
                </a>
              `
              : ""
          }

          <button
            class="map-button"
            type="button"
            data-result-index="${index}"
          >
            📍 Χάρτης
          </button>

        </div>

      `;


      const mapButton =
        card.querySelector(
          ".map-button"
        );


      if (mapButton) {

        mapButton.addEventListener(
          "click",
          function () {

            focusFeatureOnMap(
              feature
            );

          }
        );

      }


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
    !window.city4allMap ||
    !window.city4allMap.view ||
    !window.city4allMap.resultsLayer
  ) {

    console.warn(
      "City4All map is not ready yet."
    );

    return;

  }


  const view =
    window.city4allMap.view;

  const resultsLayer =
    window.city4allMap.resultsLayer;

  const Graphic =
    window.city4allMap.Graphic;


  resultsLayer.removeAll();


  if (
    !Array.isArray(features) ||
    features.length === 0
  ) {

    return;

  }


  const graphics = [];


  features.forEach(
    feature => {

      if (
        typeof feature.latitude !==
          "number" ||
        typeof feature.longitude !==
          "number"
      ) {

        return;

      }


      const point = {

        type: "point",

        longitude:
          feature.longitude,

        latitude:
          feature.latitude

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

        content: `

          <strong>
            Τύπος:
          </strong>

          ${escapeHTML(
            feature.type || ""
          )}

          <br><br>

          <strong>
            Προσβασιμότητα:
          </strong>

          ${escapeHTML(
            feature.accessibility || ""
          )}

        `

      };


      const graphic =
        new Graphic({

          geometry:
            point,

          symbol:
            symbol,

          attributes:
            feature,

          popupTemplate:
            popupTemplate

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
      graphic =>
        graphic.geometry
    );


  view.goTo(
    {
      target:
        geometries,

      padding:
        70
    },

    {
      duration:
        900
    }

  ).catch(
    error => {

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
    typeof feature.latitude !==
      "number" ||
    typeof feature.longitude !==
      "number"
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

      zoom:
        17

    },

    {
      duration:
        700
    }

  ).catch(
    error => {

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

function escapeHTML(
  value
) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
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
    button => {

      button.addEventListener(
        "click",
        function () {

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

let recognition =
  null;

let isListening =
  false;


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
        event
          .results[0][0]
          .transcript;


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

      }
      catch (error) {

        console.error(
          "Voice start error:",
          error
        );

      }

    }
  );

}
else {

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
