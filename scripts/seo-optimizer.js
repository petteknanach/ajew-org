// SEO Optimizer for ajew.org
// Enhances search engine visibility and ranking

class SEOOptimizer {
    constructor() {
        this.init();
    }
    
    init() {
        this.generateMetaTags();
        this.improveAccessibility();
        this.optimizeImages();
        this.addStructuredData();
        this.setupSitemap();
    }
    
    // Generate dynamic meta tags for each page
    generateMetaTags() {
        const title = document.title;
        const description = document.querySelector('meta[name="description"]')?.content || '';
        const url = window.location.href;
        
        // Open Graph tags
        this.ensureMeta('og:title', 'property', title);
        this.ensureMeta('og:description', 'property', description);
        this.ensureMeta('og:url', 'property', url);
        this.ensureMeta('og:image', 'property', 'https://ajew.org/og-image.svg');
        this.ensureMeta('og:site_name', 'property', 'A Jew - Na Nach');
        this.ensureMeta('og:type', 'property', 'website');
        
        // Twitter tags
        this.ensureMeta('twitter:card', 'name', 'summary_large_image');
        this.ensureMeta('twitter:title', 'name', title);
        this.ensureMeta('twitter:description', 'name', description);
        this.ensureMeta('twitter:image', 'name', 'https://ajew.org/og-image.svg');
        this.ensureMeta('twitter:site', 'name', '@ajeworg');
    }
    
    ensureMeta(name, attribute, content) {
        if (!document.querySelector(`meta[${attribute}="${name}"]`)) {
            const meta = document.createElement('meta');
            meta.setAttribute(attribute, name);
            meta.content = content;
            document.head.appendChild(meta);
        }
    }
    
    // Improve accessibility for SEO
    improveAccessibility() {
        // Add alt text to all images without alt
        document.querySelectorAll('img:not([alt])').forEach(img => {
            img.alt = 'Torah teaching illustration';
        });
        
        // Ensure proper heading hierarchy
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        if (headings.length > 0 && !document.querySelector('h1')) {
            headings[0].tagName = 'H1';
        }
        
        // Add skip to content link
        if (!document.querySelector('#skip-to-content')) {
            const skipLink = document.createElement('a');
            skipLink.href = '#main-content';
            skipLink.id = 'skip-to-content';
            skipLink.textContent = 'Skip to main content';
            skipLink.style.cssText = `
                position: absolute;
                top: -40px;
                left: 6px;
                background: #000;
                color: #fff;
                padding: 8px;
                z-index: 10000;
            `;
            document.body.insertBefore(skipLink, document.body.firstChild);
        }
    }
    
    // Optimize images for SEO
    optimizeImages() {
        document.querySelectorAll('img').forEach(img => {
            // Add loading="lazy" for performance
            if (!img.loading) {
                img.loading = 'lazy';
            }
            
            // Add decoding="async" for better rendering
            img.decoding = 'async';
            
            // Ensure proper dimensions
            if (!img.width || !img.height) {
                img.style.width = '100%';
            }
        });
    }
    
    // Add structured data
    addStructuredData() {
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": "A Jew - Na Nach Breslov",
            "description": "Teachings of Rebbe Nachman of Breslov - Torah, wisdom, and inspiration",
            "url": "https://ajew.org",
            "sameAs": [
                "https://www.youtube.com/channel/UCYq6IzFfzJfQY8l9mOV5kgw",
                "https://malevegadish.com"
            ],
            "educationalUse": "Religious education and spiritual teachings"
        };
        
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(structuredData);
        document.head.appendChild(script);
    }
    
    // Setup sitemap integration
    setupSitemap() {
        // Create sitemap link if not exists
        if (!document.querySelector('link[rel="sitemap"]')) {
            const link = document.createElement('link');
            link.rel = 'sitemap';
            link.href = 'https://ajew.org/sitemap.xml';
            document.head.appendChild(link);
        }
    }
    
    // Generate SEO-friendly URLs
    static generateSEOUrl(text) {
        return text
            .toLowerCase()
            .replace(/[\s,]+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
    
    // Update meta description
    updateMetaDescription(description) {
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'description';
            document.head.appendChild(meta);
        }
        meta.content = description.substring(0, 160);
    }
    
    // Add breadcrumb navigation
    addBreadcrumb(items) {
        const nav = document.createElement('nav');
        nav.setAttribute('aria-label', 'breadcrumb');
        nav.innerHTML = `
            <ol style="
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                gap: 0.5rem;
                background: #f8f9fa;
                padding: 0.5rem 1rem;
                border-radius: 4px;
            ">
                ${items.map((item, index) => `
                    <li style="font-size: 0.9rem;">
                        ${index < items.length - 1 
                            ? `<a href="${item.url}" style="color: #0066cc; text-decoration: none;">${item.name}</a> &gt;`
                            : `<span style="color: #333;">${item.name}</span>`}
                    </li>
                `).join('')}
            </ol>
        `;
        document.body.insertBefore(nav, document.body.firstChild.nextSibling);
    }
}

// Initialize SEO optimizer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SEOOptimizer());
} else {
    new SEOOptimizer();
}

// Export for use in other scripts
window.SEOOptimizer = SEOOptimizer;
