
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


/*
 * Περιμένουμε πραγματικά να φορτώσει ο ArcGIS χάρτης.
 */
let resolveMapReady;

let mapReadyResolved = false;

const mapReadyPromise =
  new Promise(resolve => {

    resolveMapReady =
      () => {

        if (!mapReadyResolved) {

          mapReadyResolved =
            true;

          resolve();

        }

      };

  });


/* ============================================================
   DOM
============================================================ */

const messagesEl =
  document.getElementById(
    "messages"
  );

const inputEl =
  document.getElementById(
    "messageInput"
  );

const sendButton =
  document.getElementById(
    "sendButton"
  );

const voiceButton =
  document.getElementById(
    "voiceButton"
  );


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
    .querySelectorAll(
      ".quick-button"
    )
    .forEach(
      button => {

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

      }
    );

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


  if (
    isLoading
  ) {

    return;

  }


  const message =
    inputEl.value.trim();


  if (
    !message
  ) {

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


  const controller =
    new AbortController();


  /*
   * Ο Worker έχει δικούς του
   * μικρότερους timeouts.
   *
   * Εδώ κρατάμε μεγαλύτερο timeout
   * για network variance.
   */
  const timeoutId =
    setTimeout(
      () => {

        controller.abort();

      },
      30000
    );


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


    /* =====================================================
       ANSWER
    ===================================================== */

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


    /* =====================================================
       CHAT RESULTS
    ===================================================== */

    const features =
      Array.isArray(
        data.features
      )
        ? data.features
        : [];


    previousFeatures =
      features;


    /* =====================================================
       MAP RESULTS
    ===================================================== */

    const mapFeatures =
      Array.isArray(
        data.mapFeatures
      )
        ? data.mapFeatures
        : features;


    const mapCommand =
      data.mapCommand ||
      null;


    /* =====================================================
       ACTIONS
    ===================================================== */

    addChatActions(
      messageElement,
      features,
      mapFeatures,
      mapCommand
    );


    /* =====================================================
       MAP CONTROL
    ===================================================== */

    await updateMap(
      mapFeatures,
      mapCommand
    );


    /* =====================================================
       VOICE
    ===================================================== */

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
      error?.name ===
      "AbortError"
    ) {

      errorMessage =
        "⚠️ Η αναζήτηση άργησε υπερβολικά. Δοκίμασε ξανά.";

    }


    addMessage(
      "ai",
      errorMessage
    );


    if (
      voiceMode
    ) {

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
    loading ||
    voiceMode;


  voiceButton.disabled =
    false;


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
  features,
  mapFeatures = features,
  mapCommand = null
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


  /* ==========================================================
     ONE RESULT
  ========================================================== */

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


    const count =
      Array.isArray(
        mapFeatures
      )
        ? mapFeatures.length
        : features.length;


    allButton.textContent =
      `🗺️ Προβολή ${count} σημείων`;


    allButton.addEventListener(
      "click",
      async () => {

        /*
         * Σημαντικό:
         *
         * Δεν κάνουμε πλέον μόνο
         * focusAllFeatures().
         *
         * Ξαναπερνάμε τα features
         * στο map pipeline ώστε
         * να είμαστε σίγουροι ότι
         * υπάρχουν πραγματικά
         * graphics στον χάρτη.
         */

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
              count
          }
        );

      }
    );


    actions.appendChild(
      allButton
    );


    /*
     * Popup για το πρώτο
     * αποτέλεσμα.
     */
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


  /*
   * Δεν υπάρχει "Ακρόαση".
   * Η φωνή λειτουργεί μόνο
   * με Voice Mode.
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
    async () => {

      /*
       * Πριν το focus,
       * εξασφαλίζουμε ότι το feature
       * έχει graphic στον χάρτη.
       */
      await ensureFeatureOnMap(
        feature
      );


      await focusMapFeature(
        feature
      );

    }
  );


  return button;

}


/* ============================================================
   GOOGLE MAPS ROUTE
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
   WAIT FOR MAP
============================================================ */

async function waitForMapReady(
  timeoutMs = 10000
) {

  if (
    window.city4allMap?.view
  ) {

    try {

      await window.city4allMap
        .view
        .when();

      return true;

    }

    catch {

      return false;

    }

  }


  try {

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

  }

  catch {

    return false;

  }


  return Boolean(
    window.city4allMap?.view
  );

}


/* ============================================================
   ENSURE FEATURE ON MAP
============================================================ */

async function ensureFeatureOnMap(
  feature
) {

  if (
    !hasCoordinates(
      feature
    )
  ) {

    return false;

  }


  const ready =
    await waitForMapReady();


  if (
    !ready
  ) {

    return false;

  }


  const map =
    window.city4allMap;


  if (
    !map?.resultsLayer ||
    !map?.Graphic
  ) {

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


  /*
   * Αν δεν υπάρχει graphic,
   * δημιουργούμε μόνο αυτό
   * το feature.
   */

  try {

    const latitude =
      Number(
        feature.latitude
      );


    const longitude =
      Number(
        feature.longitude
      );


    const Graphic =
      map.Graphic;


    const key =
      getFeatureKey(
        feature,
        0
      );


    const graphic =
      createGraphicForFeature(
        feature,
        0,
        key,
        Graphic
      );


    map.resultsLayer.add(
      graphic
    );


    map.lastGraphics =
      map.resultsLayer
        .graphics
        .toArray();


    map.lastFeatures =
      [
        feature
      ];


    return true;

  }

  catch (error) {

    console.warn(
      "Could not ensure feature on map:",
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

    /*
     * Πραγματικό wait.
     */
    const ready =
      await waitForMapReady(
        10000
      );


    if (
      !ready
    ) {

      console.warn(
        "City4All map is not ready."
      );

      return;

    }


    const map =
      window.city4allMap;


    if (
      !map?.view ||
      !map?.resultsLayer ||
      !map?.Graphic
    ) {

      console.warn(
        "City4All map object is incomplete."
      );

      return;

    }


    const {
      view,
      resultsLayer,
      Graphic
    } =
      map;


    /*
     * Κλείσιμο παλιού popup.
     */
    try {

      view.closePopup();

    }

    catch {
      /* ignore */
    }


    /*
     * Καθαρισμός παλιών results.
     */
    resultsLayer.removeAll();


    const validFeatures =
      Array.isArray(features)

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

      return;

    }


    /* ========================================================
       CREATE GRAPHICS
    ======================================================== */

    const graphics =
      validFeatures.map(
        (
          feature,
          index
        ) => {

          const key =
            getFeatureKey(
              feature,
              index
            );


          return createGraphicForFeature(
            feature,
            index,
            key,
            Graphic
          );

        }
      );


    /*
     * Μαζική προσθήκη.
     */
    resultsLayer.addMany(
      graphics
    );


    map.lastGraphics =
      graphics;


    /*
     * Επιβεβαιώνουμε ότι
     * τα graphics μπήκαν
     * στο layer.
     */
    await new Promise(
      resolve =>
        requestAnimationFrame(
          resolve
        )
    );


    /* ========================================================
       SINGLE
    ======================================================== */

    if (
      validFeatures.length === 1
    ) {

      await focusMapFeature(
        validFeatures[0],
        {
          openPopup:
            true
        }
      );


      return;

    }


    /* ========================================================
       MANY
    ======================================================== */

    if (
      mapCommand?.autoZoom !== false
    ) {

      await focusAllFeatures(
        validFeatures
      );

    }


    /*
     * Για πολλά σημεία δεν ανοίγουμε
     * 300 popups μαζί.
     *
     * Ανοίγουμε το popup του πρώτου
     * μόνο όταν το Worker ζητά
     * explicit autoOpenPopup.
     */
    if (
      mapCommand?.autoOpenPopup === true
    ) {

      await focusMapFeature(
        validFeatures[0],
        {
          openPopup:
            true
        }
      );

    }

  }

  catch (error) {

    console.warn(
      "Map update failed:",
      error
    );

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


  /*
   * Ολόκληρο το feature.
   */
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
    )}:${Number(
      feature?.longitude
    )}:${fallbackIndex}`
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


  if (
    !graphics.length
  ) {

    return null;

  }


  /*
   * 1. Exact feature reference.
   */
  const byReference =
    graphics.find(
      graphic =>
        graphic.__city4allFeature ===
        feature
    );


  if (
    byReference
  ) {

    return byReference;

  }


  /*
   * 2. Object ID.
   */
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


  /*
   * 3. Coordinates.
   */
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
        10000
      );


    if (
      !ready
    ) {

      return false;

    }


    const map =
      window.city4allMap;


    const view =
      map?.view;


    const resultsLayer =
      map?.resultsLayer;


    if (
      !view ||
      !resultsLayer
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


    /*
     * Το graphic πρέπει να υπάρχει.
     */
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
          850

      }

    );


    /*
     * Άνοιγμα πραγματικού
     * ArcGIS popup.
     */
    if (
      openPopup &&
      graphic
    ) {

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            120
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

  catch (error) {

    console.warn(
      "Could not focus to feature:",
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
    Array.isArray(features)

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
        10000
      );


    if (
      !ready
    ) {

      return false;

    }


    const view =
      window.city4allMap?.view;


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


    /*
     * goTo με πολλαπλά σημεία.
     */
    await view.goTo(

      points,

      {

        padding: {

          top:
            70,

          right:
            70,

          bottom:
            70,

          left:
            70

        },

        duration:
          950

      }

    );


    return true;

  }

  catch (error) {

    console.warn(
      "Could not zoom to all features:",
      error
    );


    /*
     * Fallback:
     *
     * Αν το array goTo αποτύχει,
     * κάνουμε center στο bounding box
     * των coordinates.
     */
    try {

      return await fallbackFitMap(
        validFeatures
      );

    }

    catch {

      return false;

    }

  }

}


/* ============================================================
   FALLBACK FIT MAP
============================================================ */

async function fallbackFitMap(
  features
) {

  const view =
    window.city4allMap?.view;


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
    ) / 2;


  const centerLat =
    (
      minLat +
      maxLat
    ) / 2;


  /*
   * Rough dynamic zoom.
   */
  const lonSpan =
    Math.max(
      0.01,
      maxLon -
      minLon
    );


  const latSpan =
    Math.max(
      0.01,
      maxLat -
      minLat
    );


  const span =
    Math.max(
      lonSpan,
      latSpan
    );


  let zoom =
    12;


  if (
    span < 0.01
  ) {

    zoom =
      16;

  }

  else if (
    span < 0.03
  ) {

    zoom =
      14;

  }

  else if (
    span < 0.08
  ) {

    zoom =
      12;

  }

  else if (
    span < 0.2
  ) {

    zoom =
      10;

  }

  else if (
    span < 0.5
  ) {

    zoom =
      8;

  }

  else if (
    span < 1
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

    latitude >= -90 &&

    latitude <= 90 &&

    longitude >= -180 &&

    longitude <= 180

  );

}


/* ============================================================
   GOOGLE MAPS
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


      inputEl.placeholder =
        "Μίλησε στον City4All Assistant...";

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
        !voiceMode
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


/* ============================================================
   TOGGLE VOICE
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


/* ============================================================
   START VOICE
============================================================ */

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


  inputEl.placeholder =
    "Μίλησε στον City4All Assistant...";


  inputEl.disabled =
    true;


  startRecognition();

}


/* ============================================================
   START RECOGNITION
============================================================ */

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

  catch (error) {

    console.warn(
      "Could not start speech recognition:",
      error
    );

  }

}


/* ============================================================
   STOP VOICE
============================================================ */

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

    catch (error) {

      console.warn(
        "Could not stop speech recognition:",
        error
      );

    }

  }


  listening =
    false;


  inputEl.disabled =
    false;


  resetVoiceButton();


  inputEl.placeholder =
    "Ρώτησε τον City4All Assistant...";

}


/* ============================================================
   RESET VOICE
============================================================ */

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

  const setViewportHeight =
    () => {

      const height =
        window.visualViewport?.height ||
        window.innerHeight;


      document.documentElement.style.setProperty(
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

          catch {
            /* ignore */
          }

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
   POPUP TEXT SECURITY
============================================================ */

function escapePopupText(
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
  async () => {

    console.log(
      "City4All map is ready for AI results."
    );


    try {

      const map =
        window.city4allMap;


      if (
        map?.view?.when
      ) {

        await map.view.when();

      }


      /*
       * Από εδώ και πέρα
       * επιτρέπουμε map control.
       */
      resolveMapReady();

    }

    catch (error) {

      console.warn(
        "City4All map ready error:",
        error
      );


      /*
       * Δεν αφήνουμε requests
       * να περιμένουν για πάντα.
       */
      resolveMapReady();

    }

  },
  {
    once:
      true
  }
);
