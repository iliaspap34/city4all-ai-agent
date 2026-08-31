const API_BASE =
  "https://city4allfinalai.ilias-pap-net.workers.dev";

const CHAT_URL = `${API_BASE}/chat`;


/* ============================================================
   STATE
============================================================ */

let conversation = [];
let previousFeatures = [];

let isLoading = false;
let isSpeaking = false;

/*
 * Voice Mode
 *
 * false = κανονικό text chat
 * true  = συνεχόμενη φωνητική συνομιλία
 */
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


  /*
   * Στο text mode σταματάμε τυχόν προηγούμενη ομιλία.
   *
   * Στο voice mode επίσης σταματάμε την προηγούμενη
   * απάντηση πριν ξεκινήσει η νέα.
   */

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
     */

    updateConversation(
      message,
      answer
    );


    /*
     * FEATURES
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
     *
     * ΣΗΜΑΝΤΙΚΟ:
     *
     * Στο κανονικό text mode ΔΕΝ
     * διαβάζουμε αυτόματα την απάντηση.
     *
     * Μόνο στο Voice Mode.
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


    /*
     * Αν είμαστε σε Voice Mode,
     * σταματάμε προσωρινά την ακρόαση.
     */

    if (voiceMode) {

      shouldContinueListening =
        false;

    }

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


  /*
   * Μην απενεργοποιούμε το voice button
   * όταν είμαστε σε Voice Mode.
   *
   * Χρειάζεται να μπορεί ο χρήστης
   * να κλείσει το Voice Mode.
   */

  voiceButton.disabled =
    false;


  /*
   * Στο voice mode δεν χρειάζεται
   * να γράφει ο χρήστης.
   */

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

  if (
    !Array.isArray(features) ||
    !features.length
  ) {

    /*
     * Ακόμη και όταν δεν υπάρχουν
     * features, μπορούμε να έχουμε
     * κουμπί ακρόασης.
     */

    addSpeakAction(
      messageElement
    );

    return;

  }


  const actions =
    document.createElement(
      "div"
    );


  actions.className =
    "message-actions";


  /*
   * ΕΝΑ ΣΗΜΕΙΟ
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
   * ΠΟΛΛΑ ΣΗΜΕΙΑ
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
   * SPEECH BUTTON
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
    !"speechSynthesis" in window
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


      /*
       * Χρησιμοποιούμε location.href
       * για καλύτερη συμβατότητα σε
       * mobile browsers / WebView.
       */

      window.open(
        url,
        "_blank"
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

    /*
     * Αν ο χάρτης δεν είναι ακόμη
     * έτοιμος, περιμένουμε το event.
     */

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


  /*
   * ΔΕΝ ΕΧΟΥΜΕ ΑΠΟΤΕΛΕΣΜΑΤΑ
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
   * ΠΕΡΙΜΕΝΟΥΜΕ ΝΑ ΣΧΕΔΙΑΣΤΟΥΝ
   * ΤΑ GRAPHICS ΠΡΙΝ ΤΟ GO TO.
   *
   * Αυτό βοηθάει ιδιαίτερα στο
   * mobile ArcGIS view.
   */

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
   VOICE INPUT / VOICE CONVERSATION
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


  /*
   * continuous = false:
   *
   * Κάθε φορά ακούμε μία φυσική
   * φράση/απάντηση και μετά ξαναρχίζουμε
   * αυτόματα.
   *
   * Έτσι έχουμε περισσότερο έλεγχο
   * και καλύτερη συμβατότητα browser.
   */

  recognition.continuous =
    false;


  recognition.interimResults =
    false;


  recognition.maxAlternatives =
    1;


  /*
   * CLICK VOICE BUTTON
   */

  voiceButton.addEventListener(
    "click",
    () => {

      if (
        voiceMode
      ) {

        /*
         * Αν είμαστε ήδη σε Voice Mode,
         * το κουμπί λειτουργεί ως STOP.
         */

        exitVoiceMode();

        return;

      }


      startVoiceMode();

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


      voiceButton.title =
        "Κλείσιμο Voice Mode";


      console.log(
        "City4All Voice Mode: listening"
      );

    };


  recognition.onend =
    () => {

      listening =
        false;


      voiceButton.classList.remove(
        "active"
      );


      /*
       * Μόνο αν παραμένουμε
       * σε Voice Mode ξαναρχίζουμε.
       */

      if (
        voiceMode &&
        shouldContinueListening
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
        new Event(
          "input"
        )
      );


      /*
       * Στο Voice Mode στέλνουμε
       * αυτόματα το μήνυμα.
       */

      if (
        voiceMode
      ) {

        /*
         * Σταματάμε προσωρινά
         * το recognition.
         */

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

        /*
         * Κανονικό text mode:
         * απλώς γεμίζουμε το input.
         */

        inputEl.focus();

      }

    };


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


      /*
       * No-speech / aborted:
       * αν είμαστε σε Voice Mode,
       * δοκιμάζουμε ξανά.
       */

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
              voiceMode
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


  /*
   * Σταματάμε οποιαδήποτε
   * speech synthesis.
   */

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


  /*
   * Μικρό UI μήνυμα.
   */

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


  /*
   * Επιστροφή στο κανονικό text chat.
   */

  inputEl.focus();

}


/* ============================================================
   VOICE MODE UI MESSAGE
============================================================ */

function showVoiceModeMessage() {

  /*
   * Δεν δημιουργούμε κάθε φορά
   * νέο μήνυμα.
   */

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


  /*
   * Αφαιρούμε URLs.
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


      /*
       * ΜΟΛΙΣ τελειώσει η απάντηση,
       * αν είμαστε σε Voice Mode,
       * ακούμε ξανά τον χρήστη.
       */

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
   MOBILE KEYBOARD / VISUAL VIEWPORT
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


      /*
       * Το πραγματικό visible ύψος
       * όταν ανοίγει το keyboard.
       */

      document.documentElement.style.setProperty(
        "--visual-height",
        `${viewport.height}px`
      );


      /*
       * Μετακινούμε ελάχιστα το app
       * αν το browser κάνει resize/pan.
       */

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
