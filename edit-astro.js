import fs from 'fs';
let content = fs.readFileSync('src/pages/search-enhanced.astro', 'utf8');

const replacement = \unction performSearch(query, filters = {}, advanced = {}) {
        if (!query.trim()) {
          showWelcome();
          return;
        }
        showLoading();
        const url = new URL('/api/search', window.location.origin);
        url.searchParams.set('q', query);
        if (advanced.searchType) url.searchParams.set('searchType', advanced.searchType);
        if (advanced.proximity) url.searchParams.set('proximity', advanced.proximity);
        if (advanced.books && advanced.books.length > 0) url.searchParams.set('books', advanced.books.join(','));
        fetch(url)
          .then(res => res.json())
          .then(filteredResults => {
            loading.classList.add('hidden');
            if (filteredResults.length > 0) { displayResults(filteredResults, query); } 
            else { showNoResults(query); }
          })
          .catch(err => {
            console.error(err);
            loading.classList.add('hidden');
            showNoResults(query);
          });
      }
      function displayResults\;

content = content.replace(/function performDemoSearch[^]*?function displayResults/, replacement);

content = content.replace(/setTimeout\(\(\) => \{\s*performDemoSearch\('prayer'\);\s*\}, 3000\);/g, "document.addEventListener('enhanced-search', (e) => { performSearch(e.detail.query, e.detail.filters, e.detail.advancedOptions); });");

fs.writeFileSync('src/pages/search-enhanced.astro', content);
