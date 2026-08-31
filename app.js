/* ============================================================
   CITY4ALL AI APP
============================================================ */

const API_BASE =
  "https://city4allfinalai.ilias-pap-net.workers.dev";
@@ -11,21 +14,37 @@ const CHAT_URL =
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

/*
 * Περιμένουμε πραγματικά να φορτώσει ο ArcGIS χάρτης.
 * Πολύ σημαντικό:
 *
 * Μπορεί το ArcGIS map να έχει φορτώσει ΠΡΙΝ
 * φορτωθεί/εκτελεστεί το app.js.
 *
 * Γι' αυτό ελέγχουμε και το
 * window.city4allMap
 * άμεσα και το custom event.
 */

let resolveMapReady;

let mapReadyResolved = false;
@@ -36,20 +55,81 @@ const mapReadyPromise =
    resolveMapReady =
      () => {

        if (!mapReadyResolved) {
        if (
          mapReadyResolved
        ) {

          mapReadyResolved =
            true;

          resolve();
          return;

        }

        mapReadyResolved =
          true;

        resolve();

      };

  });


function tryResolveExistingMap() {

  if (
    window.city4allMap?.view
  ) {

    try {

      if (
        window.city4allMap.view.when
      ) {

        window.city4allMap
          .view
          .when()
          .then(
            () => {

              resolveMapReady();

            }
          )
          .catch(
            () => {

              resolveMapReady();

            }
          );

      }

      else {

        resolveMapReady();

      }

    }

    catch {

      resolveMapReady();

    }

  }

}


/*
 * Κάνουμε τον έλεγχο αμέσως.
 */
tryResolveExistingMap();


/* ============================================================
   DOM
============================================================ */
@@ -91,6 +171,8 @@ document.addEventListener(

    setupMobileViewport();

    tryResolveExistingMap();

    console.log(
      "City4All AI frontend loaded."
    );
@@ -156,6 +238,11 @@ function setupQuickActions() {

function setupInput() {

  if (!inputEl) {
    return;
  }


  inputEl.addEventListener(
    "keydown",
    event => {
@@ -181,7 +268,7 @@ function setupInput() {
  );


  sendButton.addEventListener(
  sendButton?.addEventListener(
    "click",
    sendMessage
  );
@@ -194,6 +281,11 @@ function setupInput() {

function resizeInput() {

  if (!inputEl) {
    return;
  }


  inputEl.style.height =
    "43px";

@@ -237,7 +329,9 @@ async function sendMessage(


  const message =
    inputEl.value.trim();
    inputEl?.value
      ?.trim() ||
    "";


  if (
@@ -265,7 +359,9 @@ async function sendMessage(
    "43px";


  setLoading(true);
  setLoading(
    true
  );


  const loadingMessage =
@@ -277,11 +373,10 @@ async function sendMessage(


  /*
   * Ο Worker έχει δικούς του
   * μικρότερους timeouts.
   * Ο Worker είναι πλέον
   * αρκετά γρήγορος.
   *
   * Εδώ κρατάμε μεγαλύτερο timeout
   * για network variance.
   * 20 sec αρκούν ως browser safety timeout.
   */
  const timeoutId =
    setTimeout(
@@ -290,7 +385,7 @@ async function sendMessage(
        controller.abort();

      },
      30000
      20000
    );


@@ -305,8 +400,10 @@ async function sendMessage(
            "POST",

          headers: {

            "Content-Type":
              "application/json"

          },

          body:
@@ -369,9 +466,15 @@ async function sendMessage(
    }


    /* =====================================================
    console.log(
      "City4All response:",
      data
    );


    /* ======================================================
       ANSWER
    ===================================================== */
    ====================================================== */

    const answer =
      data.answer ||
@@ -391,9 +494,9 @@ async function sendMessage(
    );


    /* =====================================================
    /* ======================================================
       CHAT RESULTS
    ===================================================== */
    ====================================================== */

    const features =
      Array.isArray(
@@ -403,13 +506,17 @@ async function sendMessage(
        : [];


    /*
     * ΜΟΝΟ τα chat-visible
     * results κρατάμε εδώ.
     */
    previousFeatures =
      features;


    /* =====================================================
    /* ======================================================
       MAP RESULTS
    ===================================================== */
    ====================================================== */

    const mapFeatures =
      Array.isArray(
@@ -424,31 +531,44 @@ async function sendMessage(
      null;


    /* =====================================================
       ACTIONS
    ===================================================== */
    console.log(
      "Map features:",
      mapFeatures.length
    );


    console.log(
      "Map command:",
      mapCommand
    );


    /* ======================================================
       ACTION BUTTONS
    ====================================================== */

    addChatActions(
      messageElement,
      features,
      mapFeatures,
      mapCommand
      mapCommand,
      data.totalMatches
    );


    /* =====================================================
    /* ======================================================
       MAP CONTROL
    ===================================================== */
    ====================================================== */

    await updateMap(
      mapFeatures,
      mapCommand
    );


    /* =====================================================
    /* ======================================================
       VOICE
    ===================================================== */
    ====================================================== */

    if (
      voiceMode &&
@@ -514,7 +634,9 @@ async function sendMessage(

  finally {

    setLoading(false);
    setLoading(
      false
    );

  }

@@ -707,7 +829,7 @@ function scrollMessages() {


/* ============================================================
   LOADING STATE
   LOADING
============================================================ */

function setLoading(
@@ -718,23 +840,40 @@ function setLoading(
    loading;


  sendButton.disabled =
    loading;
  if (
    sendButton
  ) {

    sendButton.disabled =
      loading;

  inputEl.disabled =
    loading ||
    voiceMode;
    sendButton.textContent =
      loading
        ? "..."
        : "Αποστολή";

  }

  voiceButton.disabled =
    false;

  if (
    inputEl
  ) {

  sendButton.textContent =
    loading
      ? "..."
      : "Αποστολή";
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

@@ -747,7 +886,8 @@ function addChatActions(
  messageElement,
  features,
  mapFeatures = features,
  mapCommand = null
  mapCommand = null,
  totalMatches = null
) {

  if (
@@ -840,51 +980,79 @@ function addChatActions(
      "chat-action primary";


    const count =
      Array.isArray(
        mapFeatures
      )
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
      `🗺️ Προβολή ${count} σημείων`;
      `🗺️ Προβολή ${mapCount} σημείων${totalLabel}`;


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
        allButton.disabled =
          true;

            autoZoom:
              true,

            autoOpenPopup:
              false,
        const originalText =
          allButton.textContent;

            targetCount:
              count
          }
        );

        allButton.textContent =
          "🗺️ Φόρτωση στον χάρτη...";


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
@@ -896,9 +1064,9 @@ function addChatActions(


    /*
     * Popup για το πρώτο
     * αποτέλεσμα.
     * ΠΡΩΤΟ ΣΗΜΕΙΟ
     */

    const firstMapButton =
      createMapActionButton(
        features[0],
@@ -918,6 +1086,10 @@ function addChatActions(
    }


    /*
     * ROUTE
     */

    const routeButton =
      createRouteButton(
        features[0],
@@ -938,13 +1110,6 @@ function addChatActions(
  }


  /*
   * Δεν υπάρχει "Ακρόαση".
   * Η φωνή λειτουργεί μόνο
   * με Voice Mode.
   */


  if (
    actions.children.length
  ) {
@@ -1006,19 +1171,33 @@ function createMapActionButton(
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
      button.disabled =
        true;


      await focusMapFeature(
        feature
      );
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
@@ -1099,60 +1278,111 @@ function createRouteButton(
============================================================ */

async function waitForMapReady(
  timeoutMs = 10000
  timeoutMs = 8000
) {

  /*
   * 1. Αν υπάρχει ήδη,
   * δεν περιμένουμε event.
   */
  if (
    window.city4allMap?.view
  ) {

    try {

      await window.city4allMap
        .view
        .when();
      if (
        window.city4allMap.view.when
      ) {

        await window.city4allMap
          .view
          .when();

      }


      return true;

    }

    catch {
    catch (
      error
    ) {

      return false;
      console.warn(
        "Existing map is not ready:",
        error
      );

    }

  }


  try {
  /*
   * 2. Περιμένουμε το event.
   */

    await Promise.race([
  await Promise.race([

      mapReadyPromise,
    mapReadyPromise,

      new Promise(
        resolve =>
          setTimeout(
            resolve,
            timeoutMs
          )
      )
    new Promise(
      resolve =>
        setTimeout(
          resolve,
          timeoutMs
        )
    )

    ]);
  ]);

  }

  catch {
  return Boolean(
    window.city4allMap?.view
  );

    return false;
}

  }

/* ============================================================
   MAP DIAGNOSTICS
============================================================ */

function getMapDiagnostics() {

  return Boolean(
    window.city4allMap?.view
  );
  const map =
    window.city4allMap;


  return {

    exists:
      Boolean(map),

    view:
      Boolean(
        map?.view
      ),

    resultsLayer:
      Boolean(
        map?.resultsLayer
      ),

    Graphic:
      Boolean(
        map?.Graphic
      ),

    graphicsCount:

      map?.resultsLayer
        ?.graphics
        ?.length ?? 0

  };

}

@@ -1184,6 +1414,10 @@ async function ensureFeatureOnMap(
    !ready
  ) {

    console.warn(
      "ensureFeatureOnMap: map not ready"
    );

    return false;

  }
@@ -1198,6 +1432,11 @@ async function ensureFeatureOnMap(
    !map?.Graphic
  ) {

    console.warn(
      "ensureFeatureOnMap: incomplete map object",
      getMapDiagnostics()
    );

    return false;

  }
@@ -1218,43 +1457,14 @@ async function ensureFeatureOnMap(
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
        getFeatureKey(feature, 0),
        map.Graphic
      );


@@ -1263,10 +1473,18 @@ async function ensureFeatureOnMap(
    );


    await new Promise(
      resolve =>
        requestAnimationFrame(
          resolve
        )
    );


    map.lastGraphics =
      map.resultsLayer
        .graphics
        .toArray();
        ?.graphics
        ?.toArray?.() || [];


    map.lastFeatures =
@@ -1303,14 +1521,15 @@ async function updateMap(
  mapCommand = null
) {

  const started =
    performance.now();


  try {

    /*
     * Πραγματικό wait.
     */
    const ready =
      await waitForMapReady(
        10000
        8000
      );


@@ -1322,7 +1541,12 @@ async function updateMap(
        "City4All map is not ready."
      );

      return;
      console.warn(
        "Map diagnostics:",
        getMapDiagnostics()
      );

      return false;

    }

@@ -1338,10 +1562,11 @@ async function updateMap(
    ) {

      console.warn(
        "City4All map object is incomplete."
        "City4All map object is incomplete.",
        getMapDiagnostics()
      );

      return;
      return false;

    }

@@ -1350,12 +1575,11 @@ async function updateMap(
      view,
      resultsLayer,
      Graphic
    } =
      map;
    } = map;


    /*
     * Κλείσιμο παλιού popup.
     * Κλείσιμο popup.
     */
    try {

@@ -1369,17 +1593,18 @@ async function updateMap(


    /*
     * Καθαρισμός παλιών results.
     * Καθαρίζουμε ΜΟΝΟ το AI result layer.
     */
    resultsLayer.removeAll();


    const validFeatures =
      Array.isArray(features)

        ? features.filter(
            hasCoordinates
          )
        ? features
            .filter(
              hasCoordinates
            )

        : [];

@@ -1396,7 +1621,11 @@ async function updateMap(
      !validFeatures.length
    ) {

      return;
      console.log(
        "No valid map coordinates."
      );

      return false;

    }

@@ -1412,18 +1641,19 @@ async function updateMap(
          index
        ) => {

          const key =
          return createGraphicForFeature(

            feature,

            index,

            getFeatureKey(
              feature,
              index
            );

            ),

          return createGraphicForFeature(
            feature,
            index,
            key,
            Graphic

          );

        }
@@ -1438,14 +1668,16 @@ async function updateMap(
    );


    /*
     * Κρατάμε references.
     */
    map.lastGraphics =
      graphics;


    /*
     * Επιβεβαιώνουμε ότι
     * τα graphics μπήκαν
     * στο layer.
     * Δίνουμε ένα animation frame
     * στο ArcGIS.
     */
    await new Promise(
      resolve =>
@@ -1455,25 +1687,28 @@ async function updateMap(
    );


    console.log(
      `City4All map updated: ${validFeatures.length} graphics in ${Math.round(performance.now() - started)}ms`
    );


    /* ========================================================
       SINGLE
    ======================================================== */

    if (
      validFeatures.length === 1
      validFeatures.length ===
      1
    ) {

      await focusMapFeature(
      return await focusMapFeature(
        validFeatures[0],
        {
          openPopup:
            true
        }
      );


      return;

    }


@@ -1493,36 +1728,49 @@ async function updateMap(


    /*
     * Για πολλά σημεία δεν ανοίγουμε
     * 300 popups μαζί.
     *
     * Ανοίγουμε το popup του πρώτου
     * μόνο όταν το Worker ζητά
     * explicit autoOpenPopup.
     * Προαιρετικό πρώτο popup.
     */
    if (
      mapCommand?.autoOpenPopup === true
      mapCommand?.autoOpenPopup ===
      true
    ) {

      await focusMapFeature(

        validFeatures[0],

        {
          openPopup:
            true
        }

      );

    }


    return true;

  }

  catch (error) {
  catch (
    error
  ) {

    console.warn(
      "Map update failed:",
      error
    );


    console.warn(
      "Map diagnostics:",
      getMapDiagnostics()
    );


    return false;

  }

}
@@ -1780,9 +2028,6 @@ function createGraphicForFeature(
    });


  /*
   * Ολόκληρο το feature.
   */
  graphic.__city4allFeature =
    feature;

@@ -1802,10 +2047,8 @@ function getFeatureKey(
) {

  if (
    feature?.objectId !==
      undefined &&
    feature?.objectId !==
      null &&
    feature?.objectId !== undefined &&
    feature?.objectId !== null &&
    String(
      feature.objectId
    ).trim() !== ""
@@ -1819,10 +2062,8 @@ function getFeatureKey(


  if (
    feature?.objectid !==
      undefined &&
    feature?.objectid !==
      null &&
    feature?.objectid !== undefined &&
    feature?.objectid !== null &&
    String(
      feature.objectid
    ).trim() !== ""
@@ -1875,7 +2116,7 @@ function findGraphicForFeature(


  /*
   * 1. Exact feature reference.
   * 1. Exact reference.
   */
  const byReference =
    graphics.find(
@@ -1895,7 +2136,7 @@ function findGraphicForFeature(


  /*
   * 2. Object ID.
   * 2. ObjectId.
   */
  const objectId =
    feature?.objectId ??
@@ -1996,9 +2237,7 @@ function findGraphicForFeature(

      }
    ) ||

    null

  );

}
@@ -2035,7 +2274,7 @@ async function focusMapFeature(

    const ready =
      await waitForMapReady(
        10000
        8000
      );


@@ -2056,13 +2295,8 @@ async function focusMapFeature(
      map?.view;


    const resultsLayer =
      map?.resultsLayer;


    if (
      !view ||
      !resultsLayer
      !view
    ) {

      return false;
@@ -2083,7 +2317,7 @@ async function focusMapFeature(


    /*
     * Το graphic πρέπει να υπάρχει.
     * Βεβαιωνόμαστε ότι υπάρχει Graphic.
     */
    let graphic =
      findGraphicForFeature(
@@ -2109,7 +2343,7 @@ async function focusMapFeature(


    /*
     * Zoom στο σημείο.
     * Zoom.
     */
    await view.goTo(

@@ -2136,8 +2370,7 @@ async function focusMapFeature(


    /*
     * Άνοιγμα πραγματικού
     * ArcGIS popup.
     * Popup.
     */
    if (
      openPopup &&
@@ -2148,7 +2381,7 @@ async function focusMapFeature(
        resolve =>
          setTimeout(
            resolve,
            120
            100
          )
      );

@@ -2171,10 +2404,12 @@ async function focusMapFeature(

  }

  catch (error) {
  catch (
    error
  ) {

    console.warn(
      "Could not focus to feature:",
      "Could not focus feature:",
      error
    );

@@ -2219,11 +2454,14 @@ async function focusAllFeatures(
  ) {

    return focusMapFeature(

      validFeatures[0],

      {
        openPopup:
          true
      }

    );

  }
@@ -2233,7 +2471,7 @@ async function focusAllFeatures(

    const ready =
      await waitForMapReady(
        10000
        8000
      );


@@ -2259,6 +2497,10 @@ async function focusAllFeatures(
    }


    /*
     * Προσπαθούμε πρώτα
     * με τα πραγματικά points.
     */
    const points =
      validFeatures.map(
        feature => ({
@@ -2280,71 +2522,74 @@ async function focusAllFeatures(
      );


    /*
     * goTo με πολλαπλά σημεία.
     */
    await view.goTo(
    try {

      points,
      await view.goTo(

      {
        points,

        padding: {
        {

          top:
            70,
          padding: {

          right:
            70,
            top:
              80,

          bottom:
            70,
            right:
              80,

          left:
            70
            bottom:
              80,

        },
            left:
              80

        duration:
          950
          },

      }
          duration:
            900

    );
        }

      );

    return true;

  }
      return true;

  catch (error) {
    }

    console.warn(
      "Could not zoom to all features:",
      error
    );
    catch (
      goToError
    ) {

      console.warn(
        "goTo(points) failed:",
        goToError
      );

    }


    /*
     * Fallback:
     *
     * Αν το array goTo αποτύχει,
     * κάνουμε center στο bounding box
     * των coordinates.
     * Fallback bounding box.
     */
    try {
    return fallbackFitMap(
      validFeatures
    );

      return await fallbackFitMap(
        validFeatures
      );
  }

    }
  catch (
    error
  ) {

    catch {
    console.warn(
      "Could not zoom to all features:",
      error
    );

      return false;

    }
    return false;

  }

@@ -2429,29 +2674,15 @@ async function fallbackFitMap(
    ) / 2;


  /*
   * Rough dynamic zoom.
   */
  const lonSpan =
  const span =
    Math.max(
      0.01,
      maxLon -
      minLon
    );

      maxLon -
      minLon,

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


@@ -2460,7 +2691,8 @@ async function fallbackFitMap(


  if (
    span < 0.01
    span <
    0.01
  ) {

    zoom =
@@ -2469,7 +2701,8 @@ async function fallbackFitMap(
  }

  else if (
    span < 0.03
    span <
    0.03
  ) {

    zoom =
@@ -2478,7 +2711,8 @@ async function fallbackFitMap(
  }

  else if (
    span < 0.08
    span <
    0.08
  ) {

    zoom =
@@ -2487,7 +2721,8 @@ async function fallbackFitMap(
  }

  else if (
    span < 0.2
    span <
    0.2
  ) {

    zoom =
@@ -2496,7 +2731,8 @@ async function fallbackFitMap(
  }

  else if (
    span < 0.5
    span <
    0.5
  ) {

    zoom =
@@ -2505,7 +2741,8 @@ async function fallbackFitMap(
  }

  else if (
    span < 1
    span <
    1
  ) {

    zoom =
@@ -2650,11 +2887,20 @@ function createGoogleMapsUrl(


/* ============================================================
   VOICE MODE
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
@@ -2820,15 +3066,15 @@ function setupVoice() {


      inputEl.dispatchEvent(
        new Event(
          "input"
        )
        new Event("input")
      );


      sendMessage({

        fromVoice:
          true

      });

    };
@@ -2860,22 +3106,6 @@ function setupVoice() {

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


@@ -2887,10 +3117,6 @@ function setupVoice() {
}


/* ============================================================
   TOGGLE VOICE
============================================================ */

function toggleVoiceMode() {

  if (
@@ -2919,10 +3145,6 @@ function toggleVoiceMode() {
}


/* ============================================================
   START VOICE
============================================================ */

function startVoiceMode() {

  if (
@@ -2974,10 +3196,6 @@ function startVoiceMode() {
}


/* ============================================================
   START RECOGNITION
============================================================ */

function startRecognition() {

  if (
@@ -2998,7 +3216,9 @@ function startRecognition() {

  }

  catch (error) {
  catch (
    error
  ) {

    console.warn(
      "Could not start speech recognition:",
@@ -3010,10 +3230,6 @@ function startRecognition() {
}


/* ============================================================
   STOP VOICE
============================================================ */

function stopVoiceMode() {

  voiceMode =
@@ -3039,7 +3255,9 @@ function stopVoiceMode() {

    }

    catch (error) {
    catch (
      error
    ) {

      console.warn(
        "Could not stop speech recognition:",
@@ -3068,12 +3286,17 @@ function stopVoiceMode() {
}


/* ============================================================
   RESET VOICE
============================================================ */

function resetVoiceButton() {

  if (
    !voiceButton
  ) {

    return;

  }


  voiceButton.classList.remove(
    "active"
  );
@@ -3273,10 +3496,12 @@ function setupMobileViewport() {
        window.innerHeight;


      document.documentElement.style.setProperty(
        "--app-height",
        `${height}px`
      );
      document.documentElement
        .style
        .setProperty(
          "--app-height",
          `${height}px`
        );


      requestAnimationFrame(
@@ -3330,7 +3555,7 @@ function setupMobileViewport() {


/* ============================================================
   POPUP TEXT SECURITY
   POPUP SECURITY
============================================================ */

function escapePopupText(
@@ -3410,15 +3635,15 @@ function escapeHTML(


/* ============================================================
   MAP READY
   MAP READY EVENT
============================================================ */

window.addEventListener(
  "city4all-map-ready",
  async () => {

    console.log(
      "City4All map is ready for AI results."
      "City4All map-ready event received."
    );


@@ -3428,6 +3653,19 @@ window.addEventListener(
        window.city4allMap;


      if (
        !map
      ) {

        console.warn(
          "Map-ready event fired but window.city4allMap is missing."
        );

        return;

      }


      if (
        map?.view?.when
      ) {
@@ -3437,33 +3675,29 @@ window.addEventListener(
      }


      /*
       * Από εδώ και πέρα
       * επιτρέπουμε map control.
       */
      console.log(
        "City4All map is ready for AI results.",
        getMapDiagnostics()
      );


      resolveMapReady();

    }

    catch (error) {
    catch (
      error
    ) {

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
