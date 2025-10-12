/**
 * Utility per rilevare URL di immagini da contenuti monitorati
 */

/**
 * Estrae URL di immagini da testo, URL o metadata
 */
export function extractImageUrl(text: string, url?: string, metadata?: any): string | null {
  // 1. Cerca URL immagini diretti nel testo (terminano con estensioni immagine)
  const imageExtensions = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp)(\?[^\s]*)?/gi;
  const directImageMatch = text.match(imageExtensions);
  if (directImageMatch && directImageMatch.length > 0) {
    return directImageMatch[0];
  }

  // 2. Cerca tag <img src="..."> nel testo
  const imgTagPattern = /<img[^>]+src=["']([^"']+)["']/gi;
  const imgTagMatch = imgTagPattern.exec(text);
  if (imgTagMatch && imgTagMatch[1]) {
    return imgTagMatch[1];
  }

  // 3. Cerca meta tag OpenGraph og:image
  const ogImagePattern = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
  const ogImageMatch = ogImagePattern.exec(text);
  if (ogImageMatch && ogImageMatch[1]) {
    return ogImageMatch[1];
  }

  // 4. Cerca meta tag Twitter Card
  const twitterImagePattern = /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi;
  const twitterImageMatch = twitterImagePattern.exec(text);
  if (twitterImageMatch && twitterImageMatch[1]) {
    return twitterImageMatch[1];
  }

  // 5. Cerca nei metadata se disponibili
  if (metadata) {
    if (metadata.image) return metadata.image;
    if (metadata.imageUrl) return metadata.imageUrl;
    if (metadata.thumbnail) return metadata.thumbnail;
    if (metadata.media?.image) return metadata.media.image;
  }

  // 6. Se l'URL stesso è un'immagine
  if (url && url.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i)) {
    return url;
  }

  return null;
}

/**
 * Verifica se un URL è valido e accessibile come immagine
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // Deve essere HTTP(S)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    // Deve avere un'estensione immagine o parametri query
    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(url);
    return hasImageExtension || parsedUrl.search.length > 0;
  } catch {
    return false;
  }
}

/**
 * Estrae tutte le possibili immagini da un contenuto (per analisi multipla)
 */
export function extractAllImageUrls(text: string, url?: string, metadata?: any): string[] {
  const images: string[] = [];

  // Estrai tutte le immagini dirette
  const imageExtensions = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp)(\?[^\s]*)?/gi;
  const directMatches = text.match(imageExtensions) || [];
  images.push(...directMatches);

  // Estrai tutti i tag img
  const imgTagPattern = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgTagPattern.exec(text)) !== null) {
    if (match[1]) images.push(match[1]);
  }

  // Aggiungi metadata
  if (metadata?.image) images.push(metadata.image);
  if (metadata?.imageUrl) images.push(metadata.imageUrl);
  if (metadata?.thumbnail) images.push(metadata.thumbnail);

  // Rimuovi duplicati e valida
  return [...new Set(images)].filter(img => isValidImageUrl(img));
}
