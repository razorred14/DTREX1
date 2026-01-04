// Returns true if the backend is running with CHIA_ALLOW_INSECURE=true
import { api } from "./client";

export async function isInsecureMode(): Promise<boolean> {
  try {
    const resp = await api.get("/health");
    // The backend should include a header or body field if insecure mode is on
    // For now, we assume the backend exposes this in a header
    return resp.headers["x-chia-insecure"] === "true";
  } catch {
    return false;
  }
}
