const fs = require('fs');
let content = fs.readFileSync('src/pages/search-enhanced.astro', 'utf8');

// replace performDemoSearch with performSearch
content = content.replace(
  /function performDemoSearch\(query\)[^]*?function displayResults/m,
  \unction performSearch(query, filters = {}, advanced = {}) {
        if (!query.trim()) {
          showWelcome();
          return;
        }
        
        showLoading();
        
        // Build URL
        const url = new URL('/api/search', window.location.origin);
        url.searchParams.set('q', query);
        if (advanced.searchType) url.searchParams.set('searchType', advanced.searchType);
        if (advanced.proximity) url.searchParams.set('proximity', advanced.proximity);
        if (advanced.books && advanced.books.length > 0) url.searchParams.set('books', advanced.books.join(','));
        
        fetch(url)
          .then(res => res.json())
          .then(filteredResults => {
            loading.classList.add('hidden');
            if (filteredResults.length > 0) {
              displayResults(filteredResults, query);
            } else {
              showNoResults(query);
            }
          })
          .catch(err => {
            console.error(err);
            loading.classList.add('hidden');
            showNoResults(query);
          });
      }
      
      function displayResults\
);

// Listen to the actual event
content = content.replace(
  /setTimeout\(\(\) => \{\n\s*performDemoSearch\('prayer'\);\n\s*\}, 3000\);/g,
  \document.addEventListener('enhanced-search', (e) => {
        performSearch(e.detail.query, e.detail.filters, e.detail.advancedOptions);
      });\
);

// Change the CSS to move results near the top
content = content.replace(
  /.page-header \{\n\s*text-align: center;\n\s*color: white;\n\s*margin-bottom: 3rem;\n\s*\}/g,
  \.page-header {
      text-align: center;
      color: white;
      margin-bottom: 1rem; /* Reduced to bring search up */
    }\
);

content = content.replace(
  /.search-section \{\n\s*background: rgba\(255, 255, 255, 0.95\);\n\s*border-radius: 12px;\n\s*padding: 2rem;\n\s*margin-bottom: 2rem;/g,
  \.search-section {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 12px;
      padding: 1.5rem; /* Reduced padding */
      margin-bottom: 1rem; /* Bring results closer to top */\
);

fs.writeFileSync('src/pages/search-enhanced.astro', content);
