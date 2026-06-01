// Google Maps proxy helper — not available in the self-hosted build.

export type TravelMode = "driving" | "walking" | "bicycling" | "transit";
export type MapType = "roadmap" | "satellite" | "terrain" | "hybrid";
export type LatLng = { lat: number; lng: number };

export async function makeRequest<T = unknown>(
  _endpoint: string,
  _params: Record<string, unknown> = {}
): Promise<T> {
  throw new Error("makeRequest (Maps) is not available in the self-hosted build.");
}
