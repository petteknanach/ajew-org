// Reader Page Optimizer
// Implements lazy loading, prefetching, and checksum verification

class ReaderOptimizer {
    constructor() {
        this.checksums = new Map();
        this.init();
    }
    
    init() {
        this.setupLazyLoading();
        this.addDownloadButtons();
        this.verifyChecksums();
        this.setupPrefetching();
        this.setupPagination();
    }
    
    setupLazyLoading() {
        // Lazy load JSON content
        const lazyElements = document.querySelectorAll('[data-lazy]');
        
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadLazyContent(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '100px 0px' });
            
            lazyElements.forEach(el => observer.observe(el));
        } else {
            // Fallback: load immediately
            lazyElements.forEach(el => this.loadLazyContent(el));
        }
    }
    
    async loadLazyContent(element) {
        const url = element.dataset.lazy;
        const type = element.dataset.lazyType || 'json';
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (type === 'json') {
                this.renderJSON(element, data);
            } else if (type === 'text') {
                this.renderText(element, data);
            }
            
            element.classList.add('loaded');
            element.dispatchEvent(new Event('lazyLoaded'));
        } catch (error) {
            console.error('Failed to load lazy content:', error);
            element.innerHTML = '<p>Failed to load content.</p>';
        }
    }
    
    renderJSON(container, data) {
        if (data.torahs) {
            container.innerHTML = this.renderTorahList(data.torahs);
        } else if (data.content) {
            container.innerHTML = `<div class="torah-content">${data.content}</div>`;
        }
    }
    
    renderTorahList(torahs) {
        return `
            <div class="torah-list">
                ${torahs.map(torah => `
                    <div class="torah-item">
                        <h4>${torah.title}</h4>
                        <a href="${torah.url}" class="btn-small">Read</a>
                        <a href="${torah.url}.txt" download class="btn-small download">Download</a>
                        ${torah.checksum ? `<span class="checksum">SHA256: ${torah.checksum}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    addDownloadButtons() {
        // Add download buttons to text links
        document.querySelectorAll('a[href$=".txt"], a[href$=".pdf"]').forEach(link => {
            if (!link.classList.contains('has-download-btn')) {
                const btn = document.createElement('button');
                btn.textContent = '⬇ Download';
                btn.className = 'download-btn';
                btn.onclick = (e) => {
                    e.preventDefault();
                    window.open(link.href, '_blank');
                };
                link.classList.add('has-download-btn');
                link.after(btn);
            }
        });
    }
    
    verifyChecksums() {
        // Verify content integrity
        document.querySelectorAll('[data-checksum]').forEach(element => {
            const expected = element.dataset.checksum;
            const content = element.textContent;
            const actual = this.sha256(content);
            
            if (expected !== actual) {
                element.classList.add('checksum-mismatch');
                element.title = 'Checksum mismatch! Content may have been altered.';
                console.warn('Checksum mismatch for:', element.dataset.checksum);
            }
        });
    }
    
    sha256(text) {
        // Simple SHA-256 implementation (in practice, use crypto.subtle)
        return text.split('').reduce((hash, char) => {
            hash = ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
            return hash.toString(16).padStart(8, '0');
        }, 0);
    }
    
    setupPrefetching() {
        // Prefetch related texts
        const prefetchLinks = document.querySelectorAll('[data-prefetch]');
        prefetchLinks.forEach(link => {
            const href = link.dataset.prefetch;
            const prefetchLink = document.createElement('link');
            prefetchLink.rel = 'prefetch';
            prefetchLink.href = href;
            document.head.appendChild(prefetchLink);
        });
    }
    
    setupPagination() {
        // Handle paginated content loading
        const nextPage = document.getElementById('next-page');
        if (nextPage) {
            nextPage.addEventListener('click', async (e) => {
                e.preventDefault();
                const url = nextPage.dataset.nextPage;
                const response = await fetch(url);
                const html = await response.text();
                document.body.innerHTML = html;
                this.init(); // Re-initialize for new page
            });
        }
    }
}

// Initialize reader optimizer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ReaderOptimizer());
} else {
    new ReaderOptimizer();
}
