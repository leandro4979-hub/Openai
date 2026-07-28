const core = require("@actions/core");

const ENDPOINT = "https://fal.run/fal-ai/flux/dev";

function extractImageUrl(payload) {
  const image = payload?.images?.[0];
  return image?.url || payload?.image?.url || payload?.url || "";
}

async function run() {
  try {
    const apiKey = core.getInput("fal_key", { required: true });
    const prompt = core.getInput("prompt", { required: true }).trim();
    const subjectId = core.getInput("subject_id").trim();

    if (!prompt) {
      throw new Error("The prompt cannot be empty.");
    }

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        ...(subjectId ? { seed: subjectId } : {}),
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = payload?.detail || payload?.error || response.statusText;
      throw new Error(`FAL request failed (${response.status}): ${detail}`);
    }

    const imageUrl = extractImageUrl(payload);
    if (!imageUrl) {
      throw new Error("The provider returned no image URL.");
    }

    core.setSecret(apiKey);
    core.setOutput("image_url", imageUrl);
    core.info("Image generation completed.");
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
