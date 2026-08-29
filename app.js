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


/*
 * ==========================================
 * SEND MESSAGE
 * ==========================================
 */

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

          body: JSON.stringify({
            message,
            conversation
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

    /*
     * Αποθηκεύουμε το conversation
     * για να καταλαβαίνει τα follow-up.
     */

    conversation.push({
      role: "user",
      content: message
    });

    conversation.push({
      role: "assistant",
      content:
        data.answer || ""
    });

    /*
     * Κρατάμε μόνο τα τελευταία
     * 10 messages.
     */

    if (
      conversation.length > 10
    ) {
      conversation =
        conversation.slice(-10);
    }

    addMessage(
      data.answer ||
      "Δεν υπήρξε απάντηση.",
      "ai"
    );

    displayResults(
      data.features || []
    );

    /*
     * Προαιρετική φωνητική
     * ανάγνωση της απάντησης.
     */

    speakText(
      data.answer || ""
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
      "❌ Δεν μπόρεσα να συνδεθώ με το City4All AI. " +
      "Έλεγξε ότι ο Worker είναι online.",
      "ai"
    );
  }
  finally {
    setLoading(false);
  }
}


/*
 * ==========================================
 * ADD CHAT MESSAGE
 * ==========================================
 */

function addMessage(
  text,
  role,
  temporary = false
) {
  const wrapper =
    document.createElement("div");

  wrapper.className =
    `message ${role}`;

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


/*
 * ==========================================
 * REMOVE TEMPORARY MESSAGE
 * ==========================================
 */

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


/*
 * ==========================================
 * LOADING
 * ==========================================
 */

function setLoading(
  loading
) {
  isLoading =
    loading;

  sendButton.disabled =
    loading;

  inputEl.disabled =
    loading;

  if (loading) {
    sendButton.textContent =
      "Αναζήτηση...";
  }
  else {
    sendButton.textContent =
      "Αποστολή";
  }
}


/*
 * ==========================================
 * DISPLAY CITY4ALL RESULTS
 * ==========================================
 */

function displayResults(
  features
) {
  resultsEl.innerHTML =
    "";

  if (
    !Array.isArray(features) ||
    features.length === 0
  ) {
    return;
  }

  features.forEach(
    feature => {
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
          "Δεν υπάρχει καταγεγραμμένη παρατήρηση."
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
          ♿ <strong>Προσβασιμότητα:</strong><br>
          <span class="accessibility">
            ${accessibility}
          </span>
        </div>

        <div class="info-row">
          📝 <strong>Παρατηρήσεις:</strong><br>
          ${comments}
        </div>

        ${
          feature.googleMapsUrl
            ? `
              <a
                class="route-button"
                href="${feature.googleMapsUrl}"
                target="_blank"
                rel="noopener noreferrer"
              >
                🗺️ Οδηγίες με Google Maps
              </a>
            `
            : ""
        }
      `;

      resultsEl.appendChild(
        card
      );
    }
  );
}


/*
 * ==========================================
 * ESCAPE HTML
 * ==========================================
 */

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


/*
 * ==========================================
 * ENTER TO SEND
 * ==========================================
 */

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


/*
 * ==========================================
 * SEND BUTTON
 * ==========================================
 */

sendButton.addEventListener(
  "click",
  sendMessage
);


/*
 * ==========================================
 * VOICE INPUT
 * ==========================================
 *
 * Χρησιμοποιεί Speech Recognition
 * του browser.
 */

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
    () => {
      isListening =
        true;

      voiceButton.classList.add(
        "active"
      );

      voiceButton.textContent =
        "⏹️";
    };

  recognition.onresult =
    event => {
      const transcript =
        event
          .results[0][0]
          .transcript;

      inputEl.value =
        transcript;

      sendMessage();
    };

  recognition.onerror =
    event => {
      console.error(
        "Speech recognition error:",
        event.error
      );
    };

  recognition.onend =
    () => {
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
    () => {
      if (isListening) {
        recognition.stop();
        return;
      }

      recognition.start();
    }
  );
}
else {
  voiceButton.disabled =
    true;

  voiceButton.title =
    "Η φωνητική εισαγωγή δεν υποστηρίζεται από αυτόν τον browser.";
}


/*
 * ==========================================
 * TEXT TO SPEECH
 * ==========================================
 *
 * Η φωνή παράγεται από τον browser.
 * Δεν χρησιμοποιούμε ακόμα ξεχωριστό
 * Voice API.
 */

function speakText(
  text
) {
  if (
    !text ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  /*
   * Δεν διαβάζουμε τεράστια απάντηση.
   */

  const cleanText =
    String(text)
      .replace(
        /[*#_]/g,
        ""
      )
      .slice(0, 1200);

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(
      cleanText
    );

  utterance.lang =
    "el-GR";

  utterance.rate =
    0.95;

  utterance.pitch =
    1;

  window.speechSynthesis.speak(
    utterance
  );
}
