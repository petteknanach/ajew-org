import fs from 'fs';
let content = fs.readFileSync('src/components/AdvancedSearchOptions.astro', 'utf8');

const regex = /<!-- Book Selection -->[\s\S]*?<!-- Search Type -->/;

const replacement = `<!-- Book Selection -->
    <div class="option-group">
      <div class="options-header-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.75rem;">
        <h5 class="option-group-title" style="margin:0;">📚 Select Books to Search:</h5>
        <div class="quick-buttons" style="margin:0;">
          <button type="button" class="quick-btn" id="selectAllBooks">Select All</button>
          <button type="button" class="quick-btn" id="deselectAllBooks">Deselect All</button>
        </div>
      </div>
      <div class="book-checkboxes-container" id="bookSelection" style="max-height: 300px; overflow-y: auto; padding: 0.5rem; border: 1px solid #e5e7eb; border-radius: 6px;">
        <details class="book-category-details" open style="margin-bottom: 1rem;">
          <summary style="cursor:pointer; font-weight:bold; color:#4b5563; margin-bottom:0.5rem;">Likutay Moharan & Main Books</summary>
          <div class="book-category" style="margin-left:1.5rem;">
            <label class="book-checkbox"><input type="checkbox" name="book" value="likutay-moharan" checked> <span>Likutay Moharan (ליקוטי מוהר''ן)</span></label>
            <label class="book-checkbox"><input type="checkbox" name="book" value="sefer-hamidos" checked> <span>Sefer Hamidos (ספר המידות)</span></label>
            <label class="book-checkbox"><input type="checkbox" name="book" value="stories" checked> <span>Sipurei Ma'asiyot (סיפורי מעשיות)</span></label>
          </div>
        </details>
        
        <details class="book-category-details" open style="margin-bottom: 1rem;">
          <summary style="cursor:pointer; font-weight:bold; color:#4b5563; margin-bottom:0.5rem;">Likutay Halachos & Rabbi Natan</summary>
          <div class="book-category" style="margin-left:1.5rem;">
            <label class="book-checkbox"><input type="checkbox" name="book" value="likutay-halachos" checked> <span>Likutay Halachos (ליקוטי הלכות)</span></label>
            <label class="book-checkbox"><input type="checkbox" name="book" value="likutay-tefilos" checked> <span>Likutay Tefilos (ליקוטי תפילות)</span></label>
            <label class="book-checkbox"><input type="checkbox" name="book" value="likutay-aitzos" checked> <span>Likutay Aitzos (ליקוטי עצות)</span></label>
          </div>
        </details>
        
        <details class="book-category-details" style="margin-bottom: 1rem;">
          <summary style="cursor:pointer; font-weight:bold; color:#4b5563; margin-bottom:0.5rem;">Nanach Collections</summary>
          <div class="book-category" style="margin-left:1.5rem;">
            <label class="book-checkbox"><input type="checkbox" name="book" value="likutay-nanach-1" checked> <span>Volume 1</span></label>
            <label class="book-checkbox"><input type="checkbox" name="book" value="likutay-nanach-2" checked> <span>Volume 2</span></label>
            <label class="book-checkbox"><input type="checkbox" name="book" value="likutay-nanach-3" checked> <span>Volume 3</span></label>
            <label class="book-checkbox"><input type="checkbox" name="book" value="likutay-nanach-4" checked> <span>Volume 4</span></label>
            <label class="book-checkbox"><input type="checkbox" name="book" value="likutay-nanach-5" checked> <span>Volume 5</span></label>
          </div>
        </details>
        
        <details class="book-category-details" style="margin-bottom: 1rem;">
          <summary style="cursor:pointer; font-weight:bold; color:#4b5563; margin-bottom:0.5rem;">Other Breslov Collections</summary>
          <div class="book-category" style="margin-left:1.5rem;">
            <label class="book-checkbox"><input type="checkbox" name="book" value="blossoms-of-the-spring" checked> <span>Blossoms of the Spring</span></label>
            <label class="book-checkbox"><input type="checkbox" name="book" value="fires-of-israel" checked> <span>Fires of Israel</span></label>
          </div>
        </details>
      </div>
    </div>
    
    <!-- Search Type -->`;

content = content.replace(regex, replacement);
const selectBreslovRegex = /document\.getElementById\('selectBreslovOnly'\)\.addEventListener[\s\S]*?\}\);/;
content = content.replace(selectBreslovRegex, '');

fs.writeFileSync('src/components/AdvancedSearchOptions.astro', content);
