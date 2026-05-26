function validateRequest(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  if (!body.prompt || typeof body.prompt !== "string") {
    throw new Error("Missing or invalid prompt");
  }

  return true;
}
export default async function handler(req, res) {
  try {
    // 1. Only allow POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { path = [] } = req.query;

    // 2. Safe path handling
    const safePath = Array.isArray(path) ? path : [String(path)];

    const isVideo = safePath.includes("seedance");

    // 3. Model routing
    const modelId = isVideo
      ? "bytedance/seedance-2.0/text-to-video"
      : "google/gemini-3.1-flash-image";

    // 4. API call
    const response = await fetch(`https://fal.run/${modelId}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...req.body,

        // Defaults (safe + consistent)
        generate_audio: isVideo,
        resolution: isVideo ? "1080p" : "1024x1024",
        duration: isVideo ? "auto" : undefined,
      }),
    });

    const data = await response.json();

    // 5. Handle API errors cleanly
    if (!response.ok) {
      return res.status(response.status).json({
        error: "FAL API error",
        details: data,
      });
    }

    // 6. Success response
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}
