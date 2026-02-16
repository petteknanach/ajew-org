// API endpoint to serve Hebrew books with correct encoding
export const prerender = false;

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function GET({ url }) {
  const category = decodeURIComponent(url.searchParams.get('category') || '');
  const book = decodeURIComponent(url.searchParams.get('book') || '');

  if (!category || !book) {
    return new Response('Missing category or book', { status: 400 });
  }

  try {
    const booksBase = join(process.cwd(), 'public', 'books', 'MyBooks');
    
    // List folders to find the right one
    const folders = await readdir(booksBase, { withFileTypes: true });
    
    // Find folder that starts with the same prefix (e.g., "1_")
    const categoryPrefix = category.split('_')[0] + '_';
    const matchingFolder = folders.find(f => 
      f.isDirectory() && f.name.startsWith(categoryPrefix)
    );
    
    if (!matchingFolder) {
      console.log('No folder matching:', categoryPrefix);
      return new Response('Category not found', { status: 404 });
    }

    const categoryPath = join(booksBase, matchingFolder.name);
    console.log('Using folder:', matchingFolder.name);
    
    // For files with subfolder paths (like "01_ליקוטי הלכות מנוקד/01_אורח חיים א.txt")
    let bookPath;
    if (book.includes('/')) {
      // Has subfolder
      bookPath = join(categoryPath, book);
    } else {
      // Direct file - find by prefix
      const files = await readdir(categoryPath);
      const bookPrefix = book.split('_')[0] + '_';
      const matchingFile = files.find(f => f.startsWith(bookPrefix) && f.endsWith('.txt'));
      if (!matchingFile) {
        console.log('No file matching:', bookPrefix, 'in', files.slice(0,5));
        return new Response('Book not found', { status: 404 });
      }
      bookPath = join(categoryPath, matchingFile);
    }
    
    console.log('Reading:', bookPath);
    
    // Read as binary first
    const raw = await readFile(bookPath);
    
    // Decode from ISO-8859-8 (Hebrew) to UTF-8
    const decoder = new TextDecoder('ISO-8859-8');
    const text = decoder.decode(raw);
    
    return new Response(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error reading book:', error);
    return new Response('Book not found: ' + error.message, { status: 404 });
  }
}
