/**
 * URL Slug Generation and Decoding
 * Converts long UUIDs to short URL-friendly codes (2-3 characters)
 * This is for security/privacy and improved UX
 */

/**
 * Generate a short, unique slug from a UUID
 * Takes the first few characters of the UUID and creates a base32-like short code
 * @param uuid - The UUID to convert
 * @returns A short slug (2-3 characters)
 */
export function generateSlug(uuid: string): string {
  // Remove hyphens and take first 8 characters of UUID
  const cleaned = uuid.replace(/-/g, "");
  
  // Convert hex to a number, then to base36 (0-9, a-z)
  // This gives us a short but unique identifier
  const hexPart = cleaned.substring(0, 8);
  const num = parseInt(hexPart, 16);
  
  // Create a 3-character slug using base36
  let slug = num.toString(36).toUpperCase();
  
  // Pad to at least 2 characters
  while (slug.length < 2) {
    slug = "0" + slug;
  }
  
  // Truncate to 3 characters max
  return slug.substring(0, 3);
}

/**
 * Format slug with prefix (e.g., "AY" for Academic Year)
 * @param uuid - The UUID to convert
 * @param prefix - Optional prefix for the slug
 * @returns Formatted slug with prefix
 */
export function generatePrefixedSlug(uuid: string, prefix: string = ""): string {
  const slug = generateSlug(uuid);
  return prefix ? `${prefix}${slug}` : slug;
}

/**
 * Cache for slug to UUID mappings (to avoid repeated queries)
 * In production, consider using Redis or similar
 */
const slugCache: Map<string, { uuid: string; timestamp: number }> = new Map();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Store slug mapping in memory cache
 * @param slug - The short slug
 * @param uuid - The original UUID
 */
export function cacheSlugMapping(slug: string, uuid: string): void {
  slugCache.set(slug, { uuid, timestamp: Date.now() });
}

/**
 * Retrieve UUID from slug cache
 * @param slug - The short slug
 * @returns The original UUID or null if not found or expired
 */
export function getCachedUUID(slug: string): string | null {
  const cached = slugCache.get(slug);
  if (!cached) return null;
  
  // Check if cache has expired
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    slugCache.delete(slug);
    return null;
  }
  
  return cached.uuid;
}

/**
 * Clear expired entries from cache
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  slugCache.forEach((data, slug) => {
    if (now - data.timestamp > CACHE_DURATION) {
      keysToDelete.push(slug);
    }
  });
  
  keysToDelete.forEach(slug => slugCache.delete(slug));
}
