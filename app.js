const API_URL = "https://city4allfinalai.ilias-pap-net.workers.dev";

async function askAI(message) {
  const response = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message
    })
  });

  if (!response.ok) {
    throw new Error("Το AI δεν απάντησε.");
  }

  const data = await response.json();

  return data;
}
