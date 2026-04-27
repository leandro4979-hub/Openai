#  /api/media/[...path].js
export default async function handler(req, res) {
  const { path = [] } = req.query;
  const isVideo = path.includes('seedance');
  
  // Choose the right model ID for fal.ai
  const modelId = isVideo 
    ? "bytedance/seedance-2.0/text-to-video" // Or use /fast/ for cheaper/quicker results
    : "google/gemini-3.1-flash-image";

  const response = await fetch(`https://fal.run/${modelId}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${process.env.FAL_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...req.body,
      // Seedance 2.0 native features (April 2026 build)
      generate_audio: true, 
      resolution: "1080p",
      duration: "auto" // Let the AI pick the best length for the scene
    })
  });

  const data = await response.json();
  res.status(response.status).json(data);
}
