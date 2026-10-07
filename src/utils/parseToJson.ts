/**
 * Ported from `pt-player/src/utils/parseToJson.tsx`.
 *
 * The API is inconsistent about `layout_zone_content.properties`: older payloads
 * send a JSON string, newer ones send an object. Every widget normalises through
 * here before reading a property.
 */
export function parseToJson<T = unknown>(data: unknown): T {
  if (typeof data === 'object') {
    return data as T
  }

  return JSON.parse(String(data)) as T
}
