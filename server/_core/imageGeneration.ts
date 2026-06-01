import { storagePut } from "server/storage";
import { ENV } from "./env";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

async function fetchImageBytes(url: string): Promise<Uint8Array> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch reference image: ${resp.status}`);
  return new Uint8Array(await resp.arrayBuffer());
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResponse> {
  if (!ENV.stabilityApiKey) {
    throw new Error("STABILITY_API_KEY is not configured");
  }

  let imageBuffer: Buffer;

  const hasRefImages =
    options.originalImages && options.originalImages.length > 0;

  if (hasRefImages) {
    // Image-to-image: use Stable Diffusion 3 with an init image
    const ref = options.originalImages![0];
    let imageBytes: Uint8Array;

    if (ref.b64Json) {
      imageBytes = Buffer.from(ref.b64Json, "base64");
    } else if (ref.url) {
      imageBytes = await fetchImageBytes(ref.url);
    } else {
      throw new Error("Reference image has neither url nor b64Json");
    }

    const formData = new FormData();
    formData.append(
      "image",
      new Blob([Buffer.from(imageBytes)], { type: ref.mimeType || "image/jpeg" }),
      "reference.jpg"
    );
    formData.append("prompt", options.prompt);
    formData.append("output_format", "png");
    formData.append("strength", "0.75");

    const response = await fetch(
      "https://api.stability.ai/v2beta/stable-image/generate/sd3",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${ENV.stabilityApiKey}`,
          accept: "image/*",
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Stability AI image-to-image failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
    }

    imageBuffer = Buffer.from(await response.arrayBuffer());
  } else {
    // Text-to-image: use the Core model
    const formData = new FormData();
    formData.append("prompt", options.prompt);
    formData.append("output_format", "png");
    formData.append("aspect_ratio", "16:9");

    const response = await fetch(
      "https://api.stability.ai/v2beta/stable-image/generate/core",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${ENV.stabilityApiKey}`,
          accept: "image/*",
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Stability AI text-to-image failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
    }

    imageBuffer = Buffer.from(await response.arrayBuffer());
  }

  const { url } = await storagePut(
    `generated/${Date.now()}.png`,
    imageBuffer,
    "image/png"
  );
  return { url };
}
