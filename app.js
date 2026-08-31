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

let voiceMode = false;
let recognition = null;
let listening = false;
let shouldContinueListening = false;


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

      autoResizeInput();

    }
  );


  sendButton.addEventListener(
    "click",
    sendMessage
  );

}


function autoResizeInput() {

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
  fromVoice = false
) {

  if (isLoading) {
    return;
  }


  const message =
    inputEl.value.trim();


  if (!message) {
    return;
  }


  stopSpeaking();


  /*
   * USER MESSAGE
   */

  addMessage(
    "user",
    message
  );


  inputEl.value =
    "";

  inputEl.style.height =
    "43px";


  setLoading(true);


  const loadingMessage =
    addLoadingMessage();


  try {

    /*
     * IMPORTANT:
     *
     * Κρατάμε ακριβώς το ίδιο API contract
     * με τον υπάρχοντα Worker.
     */

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


    let data;

    try {

      data =
        await response.json();

    }

    catch {

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


    /*
     * ANSWER
     */

    const answer =
      data.answer ||
      "Δεν μπόρεσα να δημιουργήσω απάντηση.";


    const messageElement =
      addMessage(
        "ai",
        answer
      );


    /*
     * CONVERSATION
     *
     * Κρατάμε το ίδιο format.
     */

    updateConversation(
      message,
      answer
    );


    /*
     * FEATURES
     *
     * Δεν αλλάζουμε το feature format.
     */

    const features =
      Array.isArray(
        data.features
      )
        ? data.features
        : [];


    previousFeatures =
      features;


    /*
     * CHAT ACTIONS
     */

    addChatActions(
      messageElement,
      features
    );


    /*
     * MAP
     */

    updateMap(
      features
    );


    /*
     * VOICE RESPONSE
     */

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


    if (voiceMode) {

      shouldContinueListening =
        false;

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


  /*
   * Κρατάμε τα τελευταία 20 messages,
   * όπως και πριν.
   */

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
   MARKDOWN / CHATGPT STYLE RENDERING
============================================================ */

function renderMarkdown(
  text
) {

  let html =
    escapeHTML(
      text
    );


  /*
   * Code blocks
   */

  html =
    html.replace(
      /```([\s\S]*?)```/g,
      "<pre class=\"code-block\"><code>$1</code></pre>"
    );


  /*
   * Inline code
   */

  html =
    html.replace(
      /`([^`\n]+)`/g,
      "<code>$1</code>"
    );


  /*
   * Headings
   */

  html =
    html.replace(
      /^### (.+)$/gm,
      "<h4>$1</h4>"
    );


  html =
    html.replace(
      /^## (.+)$/gm,
      "<h3>$1</h3>"
    );


  html =
    html.replace(
      /^# (.+)$/gm,
      "<h2>$1</h2>"
    );


  /*
   * Bold
   */

  html =
    html.replace(
      /\*\*(.+?)\*\*/g,
      "<strong>$1</strong>"
    );


  /*
   * Italic
   */

  html =
    html.replace(
      /(^|[^\*])\*([^*\n]+)\*(?!\*)/g,
      "$1<em>$2</em>"
    );


  /*
   * Links
   *
   * Επειδή το URL έχει ήδη γίνει HTML escaped,
   * κρατάμε μόνο ασφαλή http/https links.
   */

  html =
    html.replace(
      /https?:\/\/[^\s<]+/g,
      url => {

        const cleanUrl =
          url.replace(
            /[.,!?;:)]+$/,
            ""
          );

        const safeUrl =
          escapeHTML(
            cleanUrl
          );

        return `
          <a
            href="${safeUrl}"
            target="_blank"
            rel="noopener noreferrer"
          >${safeUrl}</a>
        `;

      }
    );


  /*
   * Unordered lists
   */

  const lines =
    html.split("\n");

  let output = [];
  let inList = false;


  lines.forEach(
    line => {

      const match =
        line.match(
          /^\s*[-•]\s+(.+)$/
        );


      if (match) {

        if (!inList) {

          output.push(
            "<ul>"
          );

          inList = true;

        }

        output.push(
          `<li>${match[1]}</li>`
        );

        return;

      }


      if (inList) {

        output.push(
          "</ul>"
        );

        inList = false;

      }


      /*
       * Numbered list
       */

      const numbered =
        line.match(
          /^\s*\d+\.\s+(.+)$/
        );


      if (numbered) {

        output.push(
          `<div class="numbered-line">${line}</div>`
        );

        return;

      }


      output.push(
        line
      );

    }
  );


  if (inList) {

    output.push(
      "</ul>"
    );

  }


  html =
    output.join("\n");


  /*
   * Line breaks
   */

  html =
    html.replace(
      /\n/g,
      "<br>"
    );


  /*
   * Καθαρίζουμε <br> γύρω από lists/headings.
   */

  html =
    html
      .replace(
        /<br>\s*<ul>/g,
        "<ul>"
      )
      .replace(
        /<\/ul><br>/g,
        "</ul>"
      )
      .replace(
        /<br><h([234])>/g,
        "<h$1>"
      )
      .replace(
        /<\/h([234])><br>/g,
        "</h$1>"
      )
      .replace(
        /<br><pre/g,
        "<pre"
      )
      .replace(
        /<\/pre><br>/g,
        "</pre>"
      );


  return html;

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


  /*
   * USER:
   * απλό ασφαλές text.
   *
   * AI:
   * ChatGPT-style markdown rendering.
   */

  if (role === "ai") {

    bubble.innerHTML =
      renderMarkdown(text);

  }

  else {

    bubble.textContent =
      text;

  }


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
    false;


  inputEl.disabled =
    loading ||
    voiceMode;


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

  const actions =
    document.createElement(
      "div"
    );


  actions.className =
    "message-actions";


  /*
   * ==========================================================
   * NO FEATURES
   * ==========================================================
   */

  if (
    !Array.isArray(features) ||
    !features.length
  ) {

    addSpeakAction(
      messageElement
    );

    return;

  }


  /*
   * ==========================================================
   * ONE FEATURE
   * ==========================================================
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
   * ==========================================================
   * MULTIPLE FEATURES
   * ==========================================================
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
   * ==========================================================
   * SPEAK BUTTON
   * ==========================================================
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
   SPEAK ACTION
============================================================ */

function addSpeakAction(
  messageElement
) {

  if (
    !("speechSynthesis" in window)
  ) {

    return;

  }


  const actions =
    document.createElement(
      "div"
    );


  actions.className =
    "message-actions";


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


  messageElement.appendChild(
    actions
  );

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
    event => {

      event.preventDefault();
      event.stopPropagation();


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


    window.addEventListener(
      "city4all-map-ready",
      () => {

        updateMap(
          features
        );

      },
      {
        once: true
      }
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


  requestAnimationFrame(
    () => {

      requestAnimationFrame(
        () => {

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
      );

    }
  );

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


  const view =
    window.city4allMap.view;


  view.goTo(
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
        900,

      easing:
        "ease-in-out"

    }
  )
  .catch(
    error => {

      console.warn(
        "Map goTo error:",
        error
      );

    }
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
          1000,

        easing:
          "ease-in-out"

      }
    )
    .catch(
      error => {

        console.warn(
          "Map goTo error:",
          error
        );

      }
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


  /*
   * VOICE BUTTON
   */

  voiceButton.addEventListener(
    "click",
    () => {

      if (
        voiceMode
      ) {

        exitVoiceMode();

        return;

      }


      startVoiceMode();

    }
  );


  /*
   * RECOGNITION START
   */

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
        "Κλείσιμο Voice Mode";


      console.log(
        "City4All Voice Mode: listening"
      );

    };


  /*
   * RECOGNITION END
   */

  recognition.onend =
    () => {

      listening =
        false;


      voiceButton.classList.remove(
        "active"
      );


      if (
        voiceMode &&
        shouldContinueListening &&
        !isLoading
      ) {

        setTimeout(
          () => {

            startListening();

          },
          250
        );

      }

      else if (
        !voiceMode
      ) {

        voiceButton.textContent =
          "🎤";

        voiceButton.title =
          "Μίλησε στον City4All Assistant";

      }

    };


  /*
   * RESULT
   */

  recognition.onresult =
    event => {

      const transcript =
        event.results?.[0]?.[0]?.transcript ||
        "";


      if (
        !transcript.trim()
      ) {

        return;

      }


      inputEl.value =
        transcript.trim();


      inputEl.dispatchEvent(
        new Event("input")
      );


      if (
        voiceMode
      ) {

        shouldContinueListening =
          false;


        setTimeout(
          () => {

            if (
              voiceMode &&
              !isLoading
            ) {

              sendMessage(
                true
              );

            }

          },
          100
        );

      }

      else {

        inputEl.focus();

      }

    };


  /*
   * ERROR
   */

  recognition.onerror =
    event => {

      console.warn(
        "Speech recognition error:",
        event.error
      );


      listening =
        false;


      if (
        event.error ===
        "not-allowed"
      ) {

        addMessage(
          "ai",
          "🎤 Χρειάζεται να επιτρέψεις πρόσβαση στο μικρόφωνο από τον browser."
        );


        exitVoiceMode();

        return;

      }


      if (
        voiceMode &&
        (
          event.error === "no-speech" ||
          event.error === "aborted"
        )
      ) {

        setTimeout(
          () => {

            if (
              voiceMode &&
              !isLoading
            ) {

              startListening();

            }

          },
          400
        );

      }

    };

}


/* ============================================================
   START VOICE MODE
============================================================ */

function startVoiceMode() {

  if (
    !recognition
  ) {

    return;

  }


  stopSpeaking();


  voiceMode =
    true;


  shouldContinueListening =
    true;


  inputEl.disabled =
    true;


  voiceButton.classList.add(
    "voice-mode"
  );


  voiceButton.textContent =
    "⏹️";


  voiceButton.title =
    "Κλείσιμο Voice Mode";


  showVoiceModeMessage();


  startListening();

}


/* ============================================================
   START LISTENING
============================================================ */

function startListening() {

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

  catch (error) {

    console.warn(
      "Could not start speech recognition:",
      error
    );

  }

}


/* ============================================================
   EXIT VOICE MODE
============================================================ */

function exitVoiceMode() {

  voiceMode =
    false;


  shouldContinueListening =
    false;


  stopSpeaking();


  if (
    recognition &&
    listening
  ) {

    try {

      recognition.stop();

    }

    catch (error) {

      console.warn(
        "Could not stop recognition:",
        error
      );

    }

  }


  listening =
    false;


  inputEl.disabled =
    false;


  voiceButton.disabled =
    false;


  voiceButton.classList.remove(
    "active"
  );


  voiceButton.classList.remove(
    "voice-mode"
  );


  voiceButton.textContent =
    "🎤";


  voiceButton.title =
    "Μίλησε στον City4All Assistant";


  inputEl.focus();

}


/* ============================================================
   VOICE MODE MESSAGE
============================================================ */

function showVoiceModeMessage() {

  const existing =
    document.querySelector(
      ".voice-mode-notice"
    );


  if (
    existing
  ) {

    return;

  }


  const wrapper =
    document.createElement(
      "div"
    );


  wrapper.className =
    "message ai voice-mode-notice";


  const bubble =
    document.createElement(
      "div"
    );


  bubble.className =
    "bubble";


  bubble.textContent =
    "🎙️ Voice Conversation ενεργό. Μίλησέ μου. Πάτησε ⏹️ για έξοδο.";


  wrapper.appendChild(
    bubble
  );


  messagesEl.appendChild(
    wrapper
  );


  scrollMessages();

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


  const cleanText =
    text
      .replace(
        /https?:\/\/\S+/g,
        ""
      )
      .replace(
        /[*_#`]/g,
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
        voiceMode
      ) {

        shouldContinueListening =
          true;


        setTimeout(
          () => {

            if (
              voiceMode &&
              !isLoading
            ) {

              startListening();

            }

          },
          250
        );

      }

    };


  utterance.onerror =
    () => {

      isSpeaking =
        false;


      if (
        voiceMode
      ) {

        shouldContinueListening =
          true;


        setTimeout(
          () => {

            if (
              voiceMode &&
              !isLoading
            ) {

              startListening();

            }

          },
          300
        );

      }

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
   MOBILE VIEWPORT
============================================================ */

function setupMobileViewport() {

  if (
    !window.visualViewport
  ) {

    return;

  }


  const updateViewport =
    () => {

      const viewport =
        window.visualViewport;


      document.documentElement.style.setProperty(
        "--visual-height",
        `${viewport.height}px`
      );


      const offsetTop =
        viewport.offsetTop;


      document.documentElement.style.setProperty(
        "--viewport-offset",
        `${offsetTop}px`
      );


      requestAnimationFrame(
        () => {

          scrollMessages();

        }
      );

    };


  window.visualViewport.addEventListener(
    "resize",
    updateViewport
  );


  window.visualViewport.addEventListener(
    "scroll",
    updateViewport
  );


  updateViewport();

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
