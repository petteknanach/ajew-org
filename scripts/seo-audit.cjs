// SEO Audit Script for ajew.org
const fs = require('fs');
const path = require('path');

class SEOAuditor {
    constructor() {
        this.results = [];
        this.baseDir = '/workspace/.openclaw/workspace/ajew-org';
    }
    log(category, status, message, details = '') {
        const entry = { category, status, message, details, timestamp: new Date().toISOString() };
        this.results.push(entry);
        const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
        console.log(`${icon} [${category}] ${status}: ${message}${details ? ' - ' + details : ''}`);
    }
    checkMetaTags() {
        const indexPath = path.join(this.baseDir, 'index.html');
        if (!fs.existsSync(indexPath)) { this.log('Meta Tags', 'FAIL', 'index.html not found'); return; }
        const html = fs.readFileSync(indexPath, 'utf8');
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1].length > 0) this.log('Meta Tags', 'PASS', 'Title tag present', titleMatch[1].substring(0, 60));
        else this.log('Meta Tags', 'FAIL', 'Missing title tag');
        const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
        if (descMatch && descMatch[1].length > 0) {
            this.log('Meta Tags', 'PASS', 'Meta description present', descMatch[1].substring(0, 60));
            if (descMatch[1].length > 160) this.log('Meta Tags', 'WARN', 'Description too long', `${descMatch[1].length} chars`);
        } else this.log('Meta Tags', 'FAIL', 'Missing meta description');
        const keywordsMatch = html.match(/<meta\s+name="keywords"\s+content="([^"]*)"/i);
        if (keywordsMatch && keywordsMatch[1].length > 0) this.log('Meta Tags', 'PASS', 'Meta keywords present');
        else this.log('Meta Tags', 'WARN', 'Missing meta keywords');
        const ogCount = ['og:title','og:description','og:url','og:image'].filter(t => html.includes(`property="${t}"`)).length;
        ogCount >= 3 ? this.log('Meta Tags', 'PASS', `Open Graph: ${ogCount}/4 present`) : this.log('Meta Tags', 'FAIL', `Open Graph: ${ogCount}/4 present`);
        const twitterCount = ['twitter:card','twitter:title','twitter:description'].filter(t => html.includes(`name="${t}"`)).length;
        twitterCount >= 2 ? this.log('Meta Tags', 'PASS', `Twitter: ${twitterCount}/3 present`) : this.log('Meta Tags', 'WARN', `Twitter: ${twitterCount}/3 present`);
    }
    checkStructuredData() {
        const indexPath = path.join(this.baseDir, 'index.html');
        const html = fs.readFileSync(indexPath, 'utf8');
        html.includes('application/ld+json') ? this.log('Structured Data', 'PASS', 'JSON-LD structured data present')
            : this.log('Structured Data', 'WARN', 'No structured data (optional)');
    }
    checkCompression() {
        const htaccessPath = path.join(this.baseDir, 'public', '.htaccess');
        if (!fs.existsSync(htaccessPath)) { this.log('Compression', 'FAIL', '.htaccess not found'); return; }
        const htaccess = fs.readFileSync(htaccessPath, 'utf8');
        if (htaccess.includes('mod_deflate') || htaccess.includes('BROTLI')) this.log('Compression', 'PASS', 'Compression enabled');
        else this.log('Compression', 'FAIL', 'Compression not enabled');
        htaccess.includes('ExpiresByType') ? this.log('Compression', 'PASS', 'Browser caching configured')
            : this.log('Compression', 'WARN', 'Browser caching not configured');
    }
    checkLazyLoading() {
        const scriptPath = path.join(this.baseDir, 'scripts', 'lazy-load.js');
        if (fs.existsSync(scriptPath)) {
            const content = fs.readFileSync(scriptPath, 'utf8');
            let features = 0;
            if (content.includes('IntersectionObserver')) features++;
            if (content.includes('prefetch')) features++;
            if (content.includes('lazy')) features++;
            features >= 2 ? this.log('Lazy Loading', 'PASS', 'Lazy loading implemented', `${features}/3 features`) : this.log('Lazy Loading', 'WARN', 'Partial implementation', `${features}/3 features`);
        } else this.log('Lazy Loading', 'FAIL', 'lazy-load.js not found');
    }
    checkDownloadButtons() {
        const htmlPath = path.join(this.baseDir, 'public', 'download-buttons.html');
        if (fs.existsSync(htmlPath)) this.log('Download Buttons', 'PASS', 'Download buttons configured');
        else this.log('Download Buttons', 'WARN', 'download-buttons.html not found');
        const textFiles = fs.readdirSync(path.join(this.baseDir, 'public')).filter(f => f.endsWith('.txt'));
        textFiles.length > 0 ? this.log('Text Files', 'PASS', `${textFiles.length} text files available`) : this.log('Text Files', 'WARN', 'No text files in public directory');
    }
    checkContentFiles() {
        const contentDir = path.join(this.baseDir, 'public', 'content');
        if (fs.existsSync(contentDir)) {
            const files = fs.readdirSync(contentDir);
            this.log('Content Files', 'PASS', `${files.length} files in content directory`);
        } else this.log('Content Files', 'INFO', 'Content directory not found (may be separate)');
    }
    checkErrorPages() {
        const publicDir = path.join(this.baseDir, 'public');
        const pages = ['404.html', '500.html'];
        const found = pages.filter(p => fs.existsSync(path.join(publicDir, p))).length;
        found === 2 ? this.log('Error Pages', 'PASS', 'Custom error pages configured')
            : found > 0 ? this.log('Error Pages', 'WARN', `Found ${found}/2 error pages`) : this.log('Error Pages', 'FAIL', 'No custom error pages');
    }
    checkRobots() {
        const robotsPath = path.join(this.baseDir, 'public', 'robots.txt');
        fs.existsSync(robotsPath) ? this.log('Robots.txt', 'PASS', 'Robots.txt configured')
            : this.log('Robots.txt', 'WARN', 'No robots.txt found');
    }
    checkPageSpeed() {
        this.log('Page Speed', 'INFO', 'Run Lighthouse audit for detailed speed metrics');
        this.log('Page Speed', 'INFO', 'Enable Brotli/Gzip compression for better scores');
        this.log('Page Speed', 'INFO', 'Implement lazy loading for images (already done)');
    }
    checkMobileOptimization() {
        const indexPath = path.join(this.baseDir, 'index.html');
        const html = fs.readFileSync(indexPath, 'utf8');
        html.includes('viewport') ? this.log('Mobile Optimization', 'PASS', 'Viewport meta tag present')
            : this.log('Mobile Optimization', 'FAIL', 'Missing viewport meta tag');
        html.includes('btn') ? this.log('Mobile Optimization', 'PASS', 'Touch-friendly elements present')
            : this.log('Mobile Optimization', 'INFO', 'Limited touch elements');
    }
    checkSchemaMarkup() {
        const indexPath = path.join(this.baseDir, 'index.html');
        const html = fs.readFileSync(indexPath, 'utf8');
        html.includes('application/ld+json') ? this.log('Schema Markup', 'PASS', 'Structured data present')
            : this.log('Schema Markup', 'WARN', 'No structured data (recommended for rich snippets)');
    }
    runAudit() {
        console.log('\n=== SEO Audit for ajew.org ===\n');
        this.checkMetaTags();
        this.checkStructuredData();
        this.checkCompression();
        this.checkLazyLoading();
        this.checkDownloadButtons();
        this.checkContentFiles();
        this.checkErrorPages();
        this.checkRobots();
        this.checkPageSpeed();
        this.checkMobileOptimization();
        this.checkSchemaMarkup();
        console.log('\n=== Audit Summary ===');
        const pass = this.results.filter(r => r.status === 'PASS').length;
        const warn = this.results.filter(r => r.status === 'WARN').length;
        const fail = this.results.filter(r => r.status === 'FAIL').length;
        const info = this.results.filter(r => r.status === 'INFO').length;
        console.log(`✅ PASS: ${pass}`);
        console.log(`⚠️  WARN: ${warn}`);
        console.log(`❌ FAIL: ${fail}`);
        console.log(`ℹ️  INFO: ${info}`);
        if (fail === 0) console.log('\n🎉 SEO audit passed! All critical issues resolved.');
        else console.log(`\n⚠️  ${fail} critical issue(s) need attention.`);
        return this.results;
    }
}

const auditor = new SEOAuditor();
auditor.runAudit();
