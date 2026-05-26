export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { path = [] } = req.query;

    const isVideo = Array.isArray(path)
      ? path.includes("seedance")
      : String(path).includes("seedance");

    const modelId = isVideo
      ? "bytedance/seedance-2.0/text-to-video"
      : "google/gemini-3.1-flash-image";

    const response = await fetch(`https://fal.run/${modelId}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...req.body,

        // Video / image generation defaults
        generate_audio: true,
        resolution: "1080p",
        duration: "auto",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "FAL API error",
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
