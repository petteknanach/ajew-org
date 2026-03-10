const h=document.createElement("script");h.src="https://unpkg.com/lunr@2.3.9/lunr.min.js";h.onload=m;document.head.appendChild(h);let u=null,a=null,d=new Set;async function m(){try{B();const o=await(await fetch("/data/optimized-search-index.json")).json();u=lunr.Index.load(o.lunrIndex),a=o.documents,Object.values(a).forEach(s=>{s.category&&d.add(s.category),s.subcategory&&d.add(s.subcategory)}),f(),v(),p();const n=new URLSearchParams(window.location.search).get("q");n&&(document.getElementById("searchInput").value=n,g(n))}catch(t){console.error("Failed to initialize search:",t),p(),document.getElementById("results").innerHTML=`
        <div class="error-message">
          <h3>Error loading search</h3>
          <p>Please try refreshing the page.</p>
        </div>
      `}}function f(){const t=document.getElementById("categoryFilters");Array.from(d).sort().forEach(e=>{if(!e)return;const n=document.createElement("label");n.innerHTML=`
        <input type="checkbox" class="category-filter" data-category="${e}" checked />
        <span class="filter-label">${e}</span>
        <span class="filter-count" data-category="${e}">0</span>
      `,t.appendChild(n)}),document.querySelectorAll("#filterBooks, #filterTeachings, .category-filter").forEach(e=>{e.addEventListener("change",()=>{const n=document.getElementById("searchInput").value.trim();n&&g(n)})})}function v(){if(!a)return;const t=Object.values(a).filter(e=>e.type==="book").length,o=Object.values(a).filter(e=>e.type==="teaching").length;document.getElementById("bookCount").textContent=t,document.getElementById("teachingCount").textContent=o,d.forEach(e=>{const n=Object.values(a).filter(r=>r.category===e||r.subcategory===e).length,s=document.querySelector(`.filter-count[data-category="${e}"]`);s&&(s.textContent=n)})}function E(){const t={types:[],categories:[]};return document.getElementById("filterBooks").checked&&t.types.push("book"),document.getElementById("filterTeachings").checked&&t.types.push("teaching"),document.querySelectorAll(".category-filter:checked").forEach(o=>{t.categories.push(o.dataset.category)}),t}function g(t){if(!u||!a||!t.trim()){y();return}try{const o=u.search(t),e=E(),n=o.filter(s=>{const r=a[s.ref];return!(!r||e.types.length>0&&!e.types.includes(r.type)||e.categories.length>0&&![r.category,r.subcategory].filter(Boolean).some(l=>e.categories.includes(l)))});b(n,t)}catch(o){console.error("Search error:",o),document.getElementById("results").innerHTML=`
        <div class="error-message">
          <h3>Search error</h3>
          <p>Please try a different search term.</p>
        </div>
      `}}function b(t,o){const e=document.getElementById("results"),n=document.getElementById("noResults");if(t.length===0){e.style.display="none",n.style.display="block";return}e.style.display="block",n.style.display="none";const s=t.filter(i=>a[i.ref].type==="book"),r=t.filter(i=>a[i.ref].type==="teaching");let c=`
      <div class="results-header">
        <h2>Search Results for "${o}"</h2>
        <p class="results-count">${t.length} results found</p>
      </div>
    `;s.length>0&&(c+=`
        <div class="results-section">
          <h3>Books (${s.length})</h3>
          <div class="results-grid">
      `,s.slice(0,20).forEach(i=>{const l=a[i.ref];c+=`
          <div class="result-card">
            <a href="${l.path}" class="result-link">
              <div class="result-type">📚 Book</div>
              <h4 class="result-title">${l.title}</h4>
              <div class="result-meta">
                <span class="result-category">${l.category}</span>
                ${l.subcategory?`<span class="result-subcategory">${l.subcategory}</span>`:""}
              </div>
              ${l.snippet?`<p class="result-snippet">${l.snippet.substring(0,150)}...</p>`:""}
            </a>
          </div>
        `}),c+=`
          </div>
          ${s.length>20?`<p class="more-results">+ ${s.length-20} more books</p>`:""}
        </div>
      `),r.length>0&&(c+=`
        <div class="results-section">
          <h3>Teachings (${r.length})</h3>
          <div class="results-grid">
      `,r.slice(0,30).forEach(i=>{const l=a[i.ref];c+=`
          <div class="result-card">
            <a href="${l.path}" class="result-link">
              <div class="result-type">📖 Teaching</div>
              <h4 class="result-title">${l.title}</h4>
              <div class="result-meta">
                <span class="result-category">${l.category}</span>
                ${l.subcategory?`<span class="result-subcategory">${l.subcategory}</span>`:""}
              </div>
              ${l.snippet?`<p class="result-snippet">${l.snippet.substring(0,150)}...</p>`:""}
            </a>
          </div>
        `}),c+=`
          </div>
          ${r.length>30?`<p class="more-results">+ ${r.length-30} more teachings</p>`:""}
        </div>
      `),e.innerHTML=c}function y(){document.getElementById("results").style.display="block",document.getElementById("noResults").style.display="none",document.getElementById("results").innerHTML=`
      <div class="welcome-message">
        <h2>Welcome to Breslov Search</h2>
        <p>Enter a search term above to find relevant teachings and books.</p>
        <div class="examples">
          <p><strong>Try searching for:</strong></p>
          <ul>
            <li>תפילה (prayer)</li>
            <li>אמונה (faith)</li>
            <li>שמחה (joy)</li>
            <li>התבודדות (solitude)</li>
          </ul>
        </div>
      </div>
    `}function B(){document.getElementById("loading").style.display="block",document.getElementById("results").style.display="none",document.getElementById("noResults").style.display="none"}function p(){document.getElementById("loading").style.display="none"}document.addEventListener("DOMContentLoaded",()=>{const t=document.getElementById("searchInput"),o=document.getElementById("searchBtn");let e;function n(){const s=t.value.trim();if(s){g(s);const r=new URL(window.location);r.searchParams.set("q",s),window.history.replaceState({},"",r)}else{y();const r=new URL(window.location);r.searchParams.delete("q"),window.history.replaceState({},"",r)}}o.addEventListener("click",n),t.addEventListener("input",()=>{clearTimeout(e),e=setTimeout(n,300)}),t.addEventListener("keyup",s=>{s.key==="Enter"&&(clearTimeout(e),n())})});
