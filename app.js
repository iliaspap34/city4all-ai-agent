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

let isSpeaking = false;


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
            isLoading
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
    () => {

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
  );


  sendButton.addEventListener(
    "click",
    sendMessage
  );

}


/* ============================================================
   SEND MESSAGE
============================================================ */

async function sendMessage() {

  if (isLoading) {
    return;
  }


  const message =
    inputEl.value.trim();


  if (!message) {
    return;
  }


  /* ----------------------------------------------------------
     STOP CURRENT SPEECH
  ---------------------------------------------------------- */

  stopSpeaking();


  /* ----------------------------------------------------------
     USER MESSAGE
  ---------------------------------------------------------- */

  addMessage(
    "user",
    message
  );


  inputEl.value =
    "";

  inputEl.style.height =
    "43px";


  setLoading(
    true
  );


  const loadingMessage =
    addLoadingMessage();


  try {

    const response =
      await fetch(
        CHAT_URL,
        {

          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              message,

              conversation,

              previousFeatures

            })

        }
      );


    const data =
      await response.json();


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


    /* --------------------------------------------------------
       ANSWER
    -------------------------------------------------------- */

    const answer =
      data.answer ||
      "Δεν μπόρεσα να δημιουργήσω απάντηση.";


    /*
     * Το AI απαντάει κανονικά
     * μέσα στο chat.
     */

    const messageElement =
      addMessage(
        "ai",
        answer
      );


    /* --------------------------------------------------------
       CONVERSATION
    -------------------------------------------------------- */

    updateConversation(
      message,
      answer
    );


    /* --------------------------------------------------------
       FEATURES
    -------------------------------------------------------- */

    const features =
      Array.isArray(
        data.features
      )
        ? data.features
        : [];


    previousFeatures =
      features;


    /* --------------------------------------------------------
       CHAT ACTIONS
    -------------------------------------------------------- */

    addChatActions(
      messageElement,
      features
    );


    /* --------------------------------------------------------
       MAP
    -------------------------------------------------------- */

    updateMap(
      features
    );


    /* --------------------------------------------------------
       VOICE RESPONSE
    -------------------------------------------------------- */

    speakAnswer(
      answer
    );

  }

  catch (error) {

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

  }

  finally {

    setLoading(
      false
    );

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

    role:
      "user",

    content:
      userMessage

  });


  conversation.push({

    role:
      "assistant",

    content:
      assistantMessage

  });


  if (
    conversation.length > 20
  ) {

    conversation =
      conversation.slice(
        -20
      );

  }

}


/* ============================================================
   ADD MESSAGE
============================================================ */

function addMessage(
  role,
  text
) {

  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.className =
    `message ${role}`;


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


  scrollMessages();


  return wrapper;

}


/* ============================================================
   LOADING
============================================================ */

function addLoadingMessage() {

  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.className =
    "message ai";


  wrapper.dataset.loading =
    "true";


  const bubble =
    document.createElement(
      "div"
    );


  bubble.className =
    "bubble";


  bubble.innerHTML = `
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


/* ============================================================
   REMOVE LOADING
============================================================ */

function removeLoadingMessage(
  element
) {

  if (element) {
    element.remove();
  }

}


/* ============================================================
   SCROLL
============================================================ */

function scrollMessages() {

  requestAnimationFrame(
    () => {

      messagesEl.scrollTop =
        messagesEl.scrollHeight;

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


/* ============================================================
   CHAT ACTIONS
============================================================ */

function addChatActions(
  messageElement,
  features
) {

  if (
    !Array.isArray(features) ||
    !features.length
  ) {

    return;

  }


  const actions =
    document.createElement(
      "div"
    );


  actions.className =
    "message-actions";


  /*
   * Αν υπάρχει μόνο ένα σημείο
   */

  if (
    features.length === 1
  ) {

    const feature =
      features[0];


    const mapButton =
      createMapActionButton(
        feature,
        "🗺️ Προβολή στον χάρτη",
        true
      );


    if (mapButton) {

      actions.appendChild(
        mapButton
      );

    }


    const routeButton =
      createRouteButton(
        feature
      );


    if (routeButton) {

      actions.appendChild(
        routeButton
      );

    }

  }


  /*
   * Πολλά αποτελέσματα
   */

  else {

    const allButton =
      document.createElement(
        "button"
      );


    allButton.type =
      "button";


    allButton.className =
      "chat-action primary";


    allButton.textContent =
      `🗺️ Προβολή ${features.length} σημείων`;


    allButton.addEventListener(
      "click",
      () => {

        focusAllFeatures(
          features
        );

      }
    );


    actions.appendChild(
      allButton
    );


    /*
     * Οδηγίες για το πρώτο
     */

    const first =
      features[0];


    const routeButton =
      createRouteButton(
        first,
        "🧭 Οδηγίες για το πρώτο"
      );


    if (routeButton) {

      actions.appendChild(
        routeButton
      );

    }

  }


  /*
   * Text-to-speech control
   */

  if (
    "speechSynthesis" in window
  ) {

    const speakButton =
      document.createElement(
        "button"
      );


    speakButton.type =
      "button";


    speakButton.className =
      "chat-action";


    speakButton.textContent =
      "🔊 Ακρόαση";


    speakButton.addEventListener(
      "click",
      () => {

        speakAnswer(
          getBubbleText(
            messageElement
          )
        );

      }
    );


    actions.appendChild(
      speakButton
    );

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
   MAP ACTION BUTTON
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
    () => {

      focusMapFeature(
        feature
      );

    }
  );


  return button;

}


/* ============================================================
   GOOGLE MAPS ROUTE BUTTON
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


  if (!url) {

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
    () => {

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
   GET BUBBLE TEXT
============================================================ */

function getBubbleText(
  messageElement
) {

  const bubble =
    messageElement?.querySelector(
      ".bubble"
    );


  return bubble
    ? bubble.textContent
    : "";

}


/* ============================================================
   MAP
============================================================ */

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
  } =
    window.city4allMap;


  resultsLayer.removeAll();


  const validFeatures =
    Array.isArray(features)
      ? features.filter(
          hasCoordinates
        )
      : [];


  /*
   * Δεν έχουμε αποτελέσματα.
   * Καθαρίζουμε μόνο τα markers.
   */

  if (
    !validFeatures.length
  ) {

    return;

  }


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

            type:
              "point",

            longitude,

            latitude

          },


          symbol: {

            type:
              "simple-marker",

            size:
              15,

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

            name:
              feature.name ||
              "Σημείο",

            type:
              feature.type ||
              "Σημείο",

            accessibility:
              feature.accessibility ||
              "",

            area:
              feature.area ||
              feature.municipality ||
              "",

            index:
              index + 1

          },


          popupTemplate: {

            title:
              `{index}. {name}`,

            content: [

              {

                type:
                  "text",

                text:
                  `
                    <strong>Κατηγορία:</strong>
                    {type}<br><br>

                    <strong>Περιοχή:</strong>
                    {area}<br><br>

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


  /*
   * Αυτόματο zoom.
   */

  if (
    validFeatures.length === 1
  ) {

    focusMapFeature(
      validFeatures[0]
    );

  }

  else {

    focusAllFeatures(
      validFeatures
    );

  }

}


/* ============================================================
   FOCUS SINGLE FEATURE
============================================================ */

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


  window.city4allMap.view
    .goTo(
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
          900

      }
    )
    .catch(
      () => {}
    );

}


/* ============================================================
   FOCUS ALL FEATURES
============================================================ */

function focusAllFeatures(
  features
) {

  if (
    !window.city4allMap ||
    !window.city4allMap.view
  ) {

    return;

  }


  const validFeatures =
    Array.isArray(features)
      ? features.filter(
          hasCoordinates
        )
      : [];


  if (
    !validFeatures.length
  ) {

    return;

  }


  if (
    validFeatures.length === 1
  ) {

    focusMapFeature(
      validFeatures[0]
    );

    return;

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


  window.city4allMap.view
    .goTo(
      points,
      {

        padding: {

          top:
            80,

          right:
            60,

          bottom:
            80,

          left:
            60

        },

        duration:
          1000

      }
    )
    .catch(
      () => {}
    );

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


  return (
    Number.isFinite(
      Number(
        feature.latitude
      )
    ) &&
    Number.isFinite(
      Number(
        feature.longitude
      )
    )
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
   VOICE INPUT
============================================================ */

function setupVoice() {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


  if (
    !SpeechRecognition
  ) {

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

      if (
        isLoading
      ) {

        return;

      }


      if (
        listening
      ) {

        recognition.stop();

        return;

      }


      stopSpeaking();


      try {

        recognition.start();

      }

      catch (error) {

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
          new Event(
            "input"
          )
        );


        /*
         * Πολύ σημαντικό:
         * Η φωνή στέλνεται αυτόματα
         * στον AI.
         */

        setTimeout(
          () => {

            if (
              !isLoading
            ) {

              sendMessage();

            }

          },
          100
        );

      }

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

      }

    };

}


/* ============================================================
   TEXT TO SPEECH
============================================================ */

function speakAnswer(
  text
) {

  if (
    !("speechSynthesis" in window)
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


  /*
   * Αφαιρούμε υπερβολικά UI text
   * πριν τη φωνητική ανάγνωση.
   */

  const cleanText =
    text
      .replace(
        /https?:\/\/\S+/g,
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
    "speechSynthesis" in window
  ) {

    window.speechSynthesis.cancel();

  }


  isSpeaking =
    false;

}


/* ============================================================
   SECURITY
============================================================ */

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


/* ============================================================
   MAP READY
============================================================ */

window.addEventListener(
  "city4all-map-ready",
  () => {

    console.log(
      "City4All map is ready for AI results."
    );

  }
);
