// Verification script for self-hosted optimizations
// Run this to verify all optimizations are working

const fs = require('fs');
const path = require('path');

class OptimizationVerifier {
    constructor() {
        this.results = [];
        this.baseDir = '/workspace/.openclaw/workspace/ajew-org';
    }
    
    log(status, message, details = '') {
        const result = { status, message, details, timestamp: new Date().toISOString() };
        this.results.push(result);
        const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
        console.log(`${icon} ${status}: ${message} ${details}`);
    }
    
    verifyHTAccess() {
        const htaccessPath = path.join(this.baseDir, 'public', '.htaccess');
        try {
            const content = fs.readFileSync(htaccessPath, 'utf8');
            
            // Check compression
            if (content.includes('mod_deflate') || content.includes('BROTLI')) {
                this.log('PASS', '.htaccess has compression enabled');
            } else {
                this.log('FAIL', '.htaccess missing compression directives');
            }
            
            // Check caching
            if (content.includes('ExpiresActive') || content.includes('ExpiresByType')) {
                this.log('PASS', '.htaccess has caching headers');
            } else {
                this.log('WARN', '.htaccess missing caching headers');
            }
            
            // Check security headers
            const securityHeaders = ['X-XSS-Protection', 'X-Content-Type-Options', 'Referrer-Policy'];
            const foundHeaders = securityHeaders.filter(h => content.includes(h));
            if (foundHeaders.length >= 2) {
                this.log('PASS', `.htaccess has ${foundHeaders.length}/3 security headers`);
            } else {
                this.log('WARN', '.htaccess missing some security headers');
            }
            
            // Check download headers for text files
            if (content.includes('Content-Disposition') && content.includes('.txt')) {
                this.log('PASS', '.htaccess forces text file downloads');
            } else {
                this.log('WARN', '.htaccess may not force text downloads');
            }
            
        } catch (error) {
            this.log('FAIL', 'Cannot read .htaccess', error.message);
        }
    }
    
    verifyScripts() {
        const scriptDir = path.join(this.baseDir, 'scripts');
        const scripts = [
            'lazy-load.js',
            'reader-optimizer.js',
            'full-archive.js'
        ];
        
        scripts.forEach(script => {
            const scriptPath = path.join(scriptDir, script);
            if (fs.existsSync(scriptPath)) {
                const content = fs.readFileSync(scriptPath, 'utf8');
                this.log('PASS', `Script exists: ${script}`);
                
                // Check for key functionality
                if (script === 'lazy-load.js') {
                    if (content.includes('IntersectionObserver')) {
                        this.log('PASS', '  - Uses IntersectionObserver');
                    }
                    if (content.includes('prefetch')) {
                        this.log('PASS', '  - Has prefetch functionality');
                    }
                }
                
                if (script === 'reader-optimizer.js') {
                    if (content.includes('checksum')) {
                        this.log('PASS', '  - Has checksum verification');
                    }
                    if (content.includes('lazyLoaded')) {
                        this.log('PASS', '  - Has lazy loading support');
                    }
                }
                
                if (script === 'full-archive.js') {
                    if (content.includes('tar.gz') || content.includes('zip')) {
                        this.log('PASS', '  - Supports archive formats');
                    }
                }
            } else {
                this.log('FAIL', `Script missing: ${script}`);
            }
        });
    }
    
    verifyDownloadButtons() {
        const htmlPath = path.join(this.baseDir, 'public', 'download-buttons.html');
        if (fs.existsSync(htmlPath)) {
            const content = fs.readFileSync(htmlPath, 'utf8');
            if (content.includes('Download') && content.includes('.txt')) {
                this.log('PASS', 'Download buttons HTML exists');
            } else {
                this.log('WARN', 'Download buttons HTML incomplete');
            }
        } else {
            this.log('WARN', 'Download buttons HTML not found');
        }
    }
    
    verifyLargeFiles() {
        const publicDir = path.join(this.baseDir, 'public');
        const txtFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.txt'));
        
        if (txtFiles.length > 0) {
            this.log('PASS', `Found ${txtFiles.length} text files in public directory`);
            
            // Check if they're meant to be downloadable
            let downloadableCount = 0;
            txtFiles.forEach(file => {
                const filePath = path.join(publicDir, file);
                const stats = fs.statSync(filePath);
                if (stats.size > 0) {
                    downloadableCount++;
                }
            });
            
            if (downloadableCount === txtFiles.length) {
                this.log('PASS', 'All text files have content and are downloadable');
            } else {
                this.log('WARN', 'Some text files may be empty');
            }
        } else {
            this.log('WARN', 'No text files found in public directory');
        }
    }
    
    verifyContentIntegrity() {
        const contentDir = path.join(this.baseDir, 'public', 'content');
        if (fs.existsSync(contentDir)) {
            const files = fs.readdirSync(contentDir);
            if (files.length > 0) {
                this.log('PASS', `Content directory has ${files.length} files`);
            } else {
                this.log('WARN', 'Content directory is empty');
            }
        } else {
            this.log('INFO', 'Content directory not found (may be separate)');
        }
    }
    
    runAllChecks() {
        console.log('=== Optimization Verification ===\n');
        
        console.log('--- Server Configuration ---');
        this.verifyHTAccess();
        
        console.log('\n--- Scripts ---');
        this.verifyScripts();
        
        console.log('\n--- Download Functionality ---');
        this.verifyDownloadButtons();
        
        console.log('\n--- Content Files ---');
        this.verifyLargeFiles();
        
        console.log('\n--- Content Integrity ---');
        this.verifyContentIntegrity();
        
        console.log('\n=== Summary ===');
        const passes = this.results.filter(r => r.status === 'PASS').length;
        const warns = this.results.filter(r => r.status === 'WARN').length;
        const fails = this.results.filter(r => r.status === 'FAIL').length;
        
        console.log(`Passed: ${passes}`);
        console.log(`Warnings: ${warns}`);
        console.log(`Failed: ${fails}`);
        
        if (fails === 0) {
            console.log('\n✅ All critical checks passed!');
        } else {
            console.log('\n❌ Some checks failed. Please review.');
        }
        
        return this.results;
    }
}

// Run verification
const verifier = new OptimizationVerifier();
const results = verifier.runAllChecks();

// Export for use in other scripts
module.exports = { OptimizationVerifier, results };
