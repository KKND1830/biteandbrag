export function parseImageUrls(imageUrlString?: string | null): string[] {
  if (!imageUrlString) return []
  const trimmed = imageUrlString.trim()
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return [imageUrlString]
    }
  }
  return [imageUrlString]
}
