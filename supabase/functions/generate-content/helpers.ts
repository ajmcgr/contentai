// Helper functions for the blog generation pipeline

export function insertImagesInContent(content: string, images: {url: string, alt: string}[]): string {
  if (images.length === 0) return content;

  const lines = content.split('\n');
  let insertedCount = 0;
  const maxImages = Math.min(2, images.length);

  // Find positions to insert images (25% and 65% through content)
  let firstImagePos = Math.floor(lines.length * 0.25);
  let secondImagePos = Math.floor(lines.length * 0.65);

  // Adjust positions to avoid headers or empty lines
  for (let i = firstImagePos; i < Math.min(firstImagePos + 10, lines.length); i++) {
    if (lines[i] && !lines[i].startsWith('#') && lines[i].trim() !== '') {
      firstImagePos = i;
      break;
    }
  }

  for (let i = secondImagePos; i < Math.min(secondImagePos + 10, lines.length); i++) {
    if (lines[i] && !lines[i].startsWith('#') && lines[i].trim() !== '') {
      secondImagePos = i;
      break;
    }
  }

  // Insert first image
  if (insertedCount < maxImages && firstImagePos < lines.length) {
    const image = images[insertedCount];
    lines.splice(firstImagePos, 0, '', `![${image.alt}](${image.url})`, '');
    insertedCount++;
    secondImagePos += 3; // Adjust second position
  }

  // Insert second image
  if (insertedCount < maxImages && secondImagePos < lines.length && images[insertedCount]) {
    const image = images[insertedCount];
    lines.splice(secondImagePos, 0, '', `![${image.alt}](${image.url})`, '');
    insertedCount++;
  }

  return lines.join('\n');
}

export function insertInternalLinks(content: string, relatedPosts: any[]): string {
  if (relatedPosts.length === 0) return content;

  const lines = content.split('\n');
  let linksInserted = 0;
  const maxLinks = Math.min(4, relatedPosts.length);
  const minGapBetweenLinks = 5; // Minimum lines between links
  let lastLinkPosition = -minGapBetweenLinks;

  for (let i = 0; i < lines.length && linksInserted < maxLinks; i++) {
    const line = lines[i];
    
    // Skip headers, empty lines, and lines too close to previous links
    if (!line || line.startsWith('#') || line.trim() === '' || 
        (i - lastLinkPosition) < minGapBetweenLinks) {
      continue;
    }

    // Look for sentences that could accommodate a link
    const sentences = line.split('. ');
    for (let j = 0; j < sentences.length && linksInserted < maxLinks; j++) {
      const sentence = sentences[j];
      
      if (sentence.length < 50 || sentence.includes('[') || sentence.includes('](')) {
        continue; // Skip short sentences or those with existing links
      }

      const post = relatedPosts[linksInserted];
      const words = sentence.split(' ');
      
      // Find a good phrase to link (3-6 words)
      if (words.length >= 6) {
        const startIdx = Math.floor(words.length * 0.3);
        const endIdx = Math.min(startIdx + 4, words.length - 1);
        const anchorText = words.slice(startIdx, endIdx).join(' ').replace(/[.,!?;:]$/, '');
        
        if (anchorText.length > 10) {
          const beforeAnchor = words.slice(0, startIdx).join(' ');
          const afterAnchor = words.slice(endIdx).join(' ');
          
          sentences[j] = `${beforeAnchor} [${anchorText}](/blog/${post.slug}) ${afterAnchor}`;
          lines[i] = sentences.join('. ');
          linksInserted++;
          lastLinkPosition = i;
          break;
        }
      }
    }
  }

  return lines.join('\n');
}

export function convertMarkdownToHtml(markdown: string): string {
  // Remove YAML front-matter for HTML conversion
  const contentWithoutFrontmatter = markdown.replace(/^---[\s\S]*?---\n/, '');
  
  // Basic markdown to HTML conversion
  let html = contentWithoutFrontmatter
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]*)\]\(([^\)]*)\)/gim, '<a href="$2">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^\)]*)\)/gim, '<img alt="$1" src="$2" />')
    // Line breaks
    .replace(/\n/gim, '<br>');

  return html;
}