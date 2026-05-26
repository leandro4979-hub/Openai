function validateRequest(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request body");
  }

  if (!body.prompt || typeof body.prompt !== "string") {
    throw new Error("Missing or invalid prompt");
  }

  return true;
}

function selectModel(path) {
  const safePath = Array.isArray(path) ? path : [String(path)];

  if (safePath.includes("seedance")) {
    return {
      id: "bytedance/seedance-2.0/text-to-video",
      type: "video",
    };
  }

  return {
    id: "google/gemini-3.1-flash-image",
    type: "image",
  };
}

// simple timeout wrapper (VERY useful in production)
function withTimeout(ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, timeout };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    validateRequest(req.body);

    const { path = [] } = req.query;
    const { id: modelId, type } = selectModel(path);

    const { controller, timeout } = withTimeout(60000); // 60s max

    const response = await fetch(`https://fal.run/${modelId}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Key ${process.env.FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...req.body,
        generate_audio: type === "video",
        resolution: type === "video" ? "1080p" : "1024x1024",
        duration: type === "video" ? "auto" : undefined,
      }),
    });

    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "AI provider error",
        model: modelId,
        details: data,
      });
    }

    // normalized response (clean API layer)
    return res.status(200).json({
      success: true,
      type,
      model: modelId,
      output: data,
      timestamp: Date.now(),
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
}
