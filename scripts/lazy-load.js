// Lazy loading for Torah text sections
// Implemented for reader pages to load content on demand

class TorahLazyLoader {
    constructor() {
        this.observer = null;
        this.init();
    }
    
    init() {
        // Add loading attribute to all images
        this.lazyLoadImages();
        
        // Add intersection observer for sections
        this.lazyLoadSections();
        
        // Add download buttons for text files
        this.addDownloadButtons();
        
        // Add prefetch for popular texts
        this.prefetchPopularTexts();
    }
    
    lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');
        const imgObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imgObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imgObserver.observe(img));
    }
    
    lazyLoadSections() {
        // Lazy load reader sections
        const sections = document.querySelectorAll('.reader-section');
        
        if ('IntersectionObserver' in window) {
            const sectionObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadSectionContent(entry.target);
                        sectionObserver.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '50px 0px' }); // Load 50px before visible
            
            sections.forEach(section => {
                sectionObserver.observe(section);
            });
        } else {
            // Fallback: load all sections if IntersectionObserver not supported
            sections.forEach(section => this.loadSectionContent(section));
        }
    }
    
    loadSectionContent(section) {
        const sectionId = section.dataset.sectionId;
        if (!sectionId || section.dataset.loaded === 'true') return;
        
        // Fetch section content via API
        fetch(`/api/reader/section/${sectionId}`)
            .then(response => response.json())
            .then(data => {
                section.innerHTML = data.content;
                section.dataset.loaded = 'true';
                // Trigger any post-load events
                section.dispatchEvent(new Event('sectionLoaded'));
            })
            .catch(error => {
                console.error('Failed to load section:', error);
                // Show error state
                section.innerHTML = '<p>Failed to load content. Please try again.</p>';
            });
    }
    
    addDownloadButtons() {
        // Add download buttons for text files
        const textLinks = document.querySelectorAll('a[href$=".txt"]');
        textLinks.forEach(link => {
            if (!link.dataset.downloadButtonAdded) {
                const button = document.createElement('button');
                button.textContent = '📄 Download';
                button.className = 'download-button';
                button.onclick = (e) => {
                    e.preventDefault();
                    window.open(link.href, '_blank');
                };
                link.appendChild(button);
                link.dataset.downloadButtonAdded = 'true';
            }
        });
    }
    
    prefetchPopularTexts() {
        // Prefetch popular Torah texts
        const popularTexts = [
            '/books/likutay-moharan/torah-1.txt',
            '/books/likutay-moharan/torah-2.txt',
            '/books/sipurey-maasiyos/torah-1.txt',
            '/books/sipurey-maasiyos/torah-2.txt'
        ];
        
        popularTexts.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            link.as = 'document';
            document.head.appendChild(link);
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new TorahLazyLoader());
} else {
    new TorahLazyLoader();
}
