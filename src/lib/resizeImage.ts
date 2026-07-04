/**
 * Pick an image file via dialog, resize to max 64×64 (maintaining aspect ratio),
 * and return as base64 PNG data URI.
 * Returns null if user cancels.
 */

const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
const MAX_SIZE = 64;
const SIZE_LIMIT = 50 * 1024; // 50 KB

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

function resizeToDataUri(
  buffer: ArrayBuffer,
  mime: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: mime });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement("canvas");
      canvas.width = MAX_SIZE;
      canvas.height = MAX_SIZE;
      const ctx = canvas.getContext("2d")!;

      // "contain" — fit within MAX_SIZE×MAX_SIZE, centered, transparent background
      const scale = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (MAX_SIZE - dw) / 2;
      const dy = (MAX_SIZE - dh) / 2;

      ctx.clearRect(0, 0, MAX_SIZE, MAX_SIZE);
      ctx.drawImage(img, dx, dy, dw, dh);

      // Start with PNG
      let dataUri = canvas.toDataURL("image/png");

      // If under limit, return PNG
      if (dataUri.length <= SIZE_LIMIT) {
        resolve(dataUri);
        return;
      }

      // Re-encode as JPEG with decreasing quality until under limit
      for (let q = 0.8; q >= 0.1; q -= 0.1) {
        dataUri = canvas.toDataURL("image/jpeg", q);
        if (dataUri.length <= SIZE_LIMIT) {
          resolve(dataUri);
          return;
        }
      }

      // Last resort — JPEG at lowest quality
      resolve(canvas.toDataURL("image/jpeg", 0.1));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image"));
    };
    img.src = url;
  });
}

export async function pickAndResizeImage(): Promise<string | null> {
  try {
    if (isTauri) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readFile } = await import("@tauri-apps/plugin-fs");

      const path = await open({
        multiple: false,
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg"] }],
      });

      if (!path || Array.isArray(path)) return null;

      const bytes = await readFile(path);
      const mime = path.match(/\.jpe?g$/i) ? "image/jpeg" : "image/png";
      return await resizeToDataUri(bytes.buffer, mime);
    }

    // Browser fallback
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg";
      input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        try {
          const buffer = await readFileAsArrayBuffer(file);
          const dataUri = await resizeToDataUri(buffer, file.type);
          resolve(dataUri);
        } catch {
          resolve(null);
        }
      });
      input.addEventListener("cancel", () => resolve(null));
      input.click();
    });
  } catch {
    return null;
  }
}
