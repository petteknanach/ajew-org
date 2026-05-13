// Data for Likutay Nanach volumes
import fs from 'fs';
import path from 'path';

// Load volume metadata from public directory
const volumesData = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), 'public', 'books', 'likutay-nanach', 'index.json'),
    'utf8'
  )
);

// Get file sizes
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

export function getVolumes() {
  return volumesData.volumes.map(volume => {
    const rawTextPath = path.join(
      process.cwd(),
      'public',
      'books',
      'likutay-nanach',
      `volume-${volume.volume}-raw.txt`
    );
    
    return {
      number: volume.volume,
      name: volume.name.replace('Likutay Nanach Volume ', ''),
      chapters: volume.chapters,
      path: volume.path,
      size: getFileSize(rawTextPath)
    };
  });
}

export function getVolume(volumeNumber) {
  const volumes = getVolumes();
  return volumes.find(v => v.number === volumeNumber);
}

export function getVolumeChapters(volumeNumber) {
  const metadataPath = path.join(
    process.cwd(),
    'public',
    'books',
    'likutay-nanach',
    `volume-${volumeNumber}`,
    'metadata.json'
  );
  
  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    return metadata.chapters.map((chapter, index) => ({
      number: index + 1,
      title: chapter.title,
      hebrewTitle: chapter.title,
      content: chapter.content,
      path: `/books/likutay-nanach/volume-${volumeNumber}/chapter${index + 1}`
    }));
  } catch (error) {
    console.error(`Error loading chapters for volume ${volumeNumber}:`, error);
    return [];
  }
}

export function getChapter(volumeNumber, chapterNumber) {
  const chapters = getVolumeChapters(volumeNumber);
  const chapter = chapters.find(ch => ch.number === parseInt(chapterNumber));
  
  if (chapter) {
    chapter.totalChapters = chapters.length;
    chapter.nextChapter = parseInt(chapterNumber) < chapters.length;
  }
  
  return chapter;
}

export function getAllContentForSearch() {
  const allContent = [];
  const volumes = getVolumes();
  
  for (const volume of volumes) {
    const chapters = getVolumeChapters(volume.number);
    
    for (const chapter of chapters) {
      allContent.push({
        id: `likutay-nanach-${volume.number}-${chapter.number}`,
        title: `לקוטי ננח כרך ${volume.number} - ${chapter.title}`,
        content: chapter.content,
        url: chapter.path,
        category: 'books',
        subcategory: 'likutay-nanach'
      });
    }
  }
  
  return allContent;
}