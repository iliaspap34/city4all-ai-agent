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
let voiceSessionId = 0;

let isSpeaking = false;

let mapReadyPromise =
  Promise.resolve();


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
    resizeInput
  );


  sendButton.addEventListener(
    "click",
    sendMessage
  );


  resizeInput();

}


function resizeInput() {

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
    inputEl.value.trim();


  if (!message) {
    return;
  }


  stopSpeaking();


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


    const answer =
      data.answer ||
      "Δεν μπόρεσα να δημιουργήσω απάντηση.";


    const messageElement =
      addMessage(
        "ai",
        answer
      );


    updateConversation(
      message,
      answer
    );


    /*
     * Τα 10 περίπου αποτελέσματα
     * που εμφανίζονται στο chat.
     */
    const features =
      Array.isArray(
        data.features
      )
        ? data.features
        : [];


    /*
     * ΟΛΑ τα αποτελέσματα που
     * πρέπει να εμφανιστούν στον χάρτη.
     */
    const mapFeatures =
      Array.isArray(
        data.mapFeatures
      )
        ? data.mapFeatures
        : features;


    /*
     * Κρατάμε τα chat results
     * για follow-up ερωτήσεις.
     */
    previousFeatures =
      features;


    addChatActions(
      messageElement,
      features,
      mapFeatures
    );


    /*
     * Ο Agent ελέγχει πραγματικά
     * τον ArcGIS χάρτη.
     */
    updateMap(
      mapFeatures
    );


    /*
     * Normal text chat:
     * ΔΕΝ μιλάει.
     *
     * Voice Mode:
     * μιλάει αυτόματα.
     */
    if (
      voiceMode ||
      fromVoice
    ) {

      speakAnswer(
        answer
      );

    }

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


    if (voiceMode) {

      stopVoiceMode();

    }

  } finally {

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


  if (
    conversation.length >
    20
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


  inputEl.disabled =
    loading;


  /*
   * Το Voice button παραμένει ενεργό
   * ώστε να μπορεί ο χρήστης να βγει
   * από Voice Mode.
   */
  voiceButton.disabled =
    false;

}


/* ============================================================
   CHAT ACTIONS
============================================================ */

function addChatActions(
  messageElement,
  features,
  mapFeatures = features
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
   * ΕΝΑ αποτέλεσμα
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
   * ΠΟΛΛΑ αποτελέσματα
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
      `🗺️ Προβολή ${mapFeatures.length} σημείων`;


    allButton.addEventListener(
      "click",
      async () => {

        /*
         * Ξαναπερνάμε ΟΛΑ τα αποτελέσματα
         * στον χάρτη.
         */
        await updateMap(
          mapFeatures
        );


        await focusAllFeatures(
          mapFeatures
        );

      }
    );


    actions.appendChild(
      allButton
    );


    const routeButton =
      createRouteButton(
        features[0],
        "🧭 Οδηγίες για το πρώτο"
      );


    if (routeButton) {

      actions.appendChild(
        routeButton
      );

    }

  }


  /*
   * Σκόπιμα ΔΕΝ υπάρχει πλέον
   * κουμπί "🔊 Ακρόαση".
   *
   * Η ομιλία γίνεται μέσω
   * Voice Mode.
   */


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
   MAP
============================================================ */

async function updateMap(
  features
) {

  try {

    await mapReadyPromise;


    const map =
      window.city4allMap;


    if (
      !map?.view ||
      !map?.resultsLayer ||
      !map?.Graphic
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
      map;


    resultsLayer.removeAll();


    const validFeatures =
      Array.isArray(
        features
      )
        ? features.filter(
            hasCoordinates
          )
        : [];


    /*
     * Κρατάμε τα τελευταία
     * map results.
     */
    map.lastFeatures =
      validFeatures;


    if (
      !validFeatures.length
    ) {

      return;

    }


    validFeatures.forEach(
      (
        feature,
        index
      ) => {

        const latitude =
          Number(
            feature.latitude
          );


        const longitude =
          Number(
            feature.longitude
          );


        const key =
          String(
            feature.objectId ??
            feature.objectid ??
            `${latitude}:${longitude}:${index}`
          );


        const area =
          feature.area ||
          feature.municipality ||
          feature.region ||
          "";


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
                  ? 13
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

              accessibility:
                feature.accessibility ||
                "Δεν έχει καταχωρηθεί πληροφορία",

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

              source:
                feature.external
                  ? "Internet / OpenStreetMap"
                  : "City4All",

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

      await focusMapFeature(
        validFeatures[0]
      );

    }

    else {

      await focusAllFeatures(
        validFeatures
      );

    }

  } catch (error) {

    console.warn(
      "Map update failed:",
      error
    );

  }

}


/* ============================================================
   FOCUS SINGLE FEATURE
============================================================ */

async function focusMapFeature(
  feature
) {

  if (
    !hasCoordinates(
      feature
    )
  ) {

    return;

  }


  try {

    await mapReadyPromise;


    const map =
      window.city4allMap;


    const view =
      map?.view;


    const resultsLayer =
      map?.resultsLayer;


    if (!view) {

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


    /*
     * Zoom στο σημείο.
     */
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
          900
      }
    );


    /*
     * Βρες το αντίστοιχο Graphic
     * και άνοιξε πραγματικό ArcGIS popup.
     */
    const key =
      String(
        feature.objectId ??
        feature.objectid ??
        `${latitude}:${longitude}`
      );


    const graphics =
      resultsLayer
        ?.graphics
        ?.toArray?.() ||
      [];


    const graphic =
      graphics.find(
        g => {

          const gKey =
            String(
              g.attributes
                ?.city4allKey ??
              ""
            );


          return (
            gKey === key ||
            (
              Number(
                g.geometry?.latitude
              ) === latitude &&

              Number(
                g.geometry?.longitude
              ) === longitude
            )
          );

        }
      );


    if (graphic) {

      await view.openPopup({

        features: [
          graphic
        ],

        location:
          graphic.geometry

      });

    }

  } catch (error) {

    console.warn(
      "Could not focus to feature:",
      error
    );

  }

}


/* ============================================================
   FOCUS ALL FEATURES
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

    return;

  }


  if (
    validFeatures.length === 1
  ) {

    return focusMapFeature(
      validFeatures[0]
    );

  }


  try {

    await mapReadyPromise;


    const view =
      window.city4allMap?.view;


    if (!view) {

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


    await view.goTo(
      points,
      {

        padding: {

          top:
            90,

          right:
            70,

          bottom:
            90,

          left:
            70

        },

        duration:
          1000

      }
    );

  } catch (error) {

    console.warn(
      "Could not zoom to all features:",
      error
    );

  }

}


/* ============================================================
   COORDINATES
============================================================ */

function hasCoordinates(
  feature
) {

  if (!feature) {

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

    latitude >= -90 &&

    latitude <= 90 &&

    longitude >= -180 &&

    longitude <= 180

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
   VOICE MODE
============================================================ */

function setupVoice() {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


  if (!SpeechRecognition) {

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


      voiceButton.setAttribute(
        "aria-label",
        "Έξοδος από φωνητική συνομιλία"
      );


      inputEl.placeholder =
        "Μίλησε στον City4All Assistant...";

    };


  recognition.onend =
    () => {

      listening =
        false;


      if (!voiceMode) {

        resetVoiceButton();

        return;

      }


      if (!isLoading) {

        clearTimeout(
          voiceRestartTimer
        );


        voiceRestartTimer =
          setTimeout(
            () => {

              if (
                voiceMode &&
                !listening
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
          ?.[
            0
          ]
          ?.[
            0
          ]
          ?.transcript
          ?.trim() ||
        "";


      if (
        !transcript ||
        isLoading ||
        !voiceMode
      ) {

        return;

      }


      inputEl.value =
        transcript;


      inputEl.dispatchEvent(
        new Event("input")
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


        return;

      }


      if (
        event.error ===
          "aborted" ||

        event.error ===
          "no-speech" ||

        event.error ===
          "network"
      ) {

        return;

      }

    };


  voiceButton.addEventListener(
    "click",
    toggleVoiceMode
  );

}


function toggleVoiceMode() {

  if (!recognition) {

    return;

  }


  if (voiceMode) {

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


  voiceSessionId +=
    1;


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


  inputEl.placeholder =
    "Μίλησε στον City4All Assistant...";


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

  } catch (error) {

    console.warn(
      "Could not start speech recognition:",
      error
    );

  }

}


function stopVoiceMode() {

  voiceMode =
    false;


  voiceSessionId +=
    1;


  clearTimeout(
    voiceRestartTimer
  );


  if (
    recognition &&
    listening
  ) {

    try {

      recognition.stop();

    } catch (error) {

      console.warn(
        "Could not stop speech recognition:",
        error
      );

    }

  }


  listening =
    false;


  resetVoiceButton();


  inputEl.placeholder =
    "Ρώτησε τον City4All Assistant...";

}


function resetVoiceButton() {

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
      .trim();


  if (!cleanText) {

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
                !listening
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
    "speechSynthesis" in window
  ) {

    window.speechSynthesis.cancel();

  }


  isSpeaking =
    false;

}


/* ============================================================
   MOBILE VIEWPORT / KEYBOARD FIX
============================================================ */

function setupMobileViewport() {

  const setViewportHeight =
    () => {

      const height =
        window.visualViewport?.height ||
        window.innerHeight;


      document.documentElement.style.setProperty(
        "--app-height",
        `${height}px`
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


    if (
      window.city4allMap
        ?.view
        ?.when
    ) {

      mapReadyPromise =
        window.city4allMap
          .view
          .when();

    }

  }
);
