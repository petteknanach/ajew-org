// Generate full archive download links
// Creates tar.gz or zip of entire content/ folder

const FullArchiveGenerator = {
    async generateFullArchive(format = 'tar.gz') {
        const button = document.getElementById('generate-archive');
        if (button) button.disabled = true;
        
        try {
            const response = await fetch('/api/generate-archive', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format })
            });
            
            if (response.ok) {
                const data = await response.json();
                window.location.href = data.downloadUrl;
            } else {
                alert('Failed to generate archive');
            }
        } catch (error) {
            console.error('Archive generation failed:', error);
            alert('Archive generation failed');
        } finally {
            if (button) button.disabled = false;
        }
    },
    
    generateTarGz() { this.generateFullArchive('tar.gz'); },
    generateZip() { this.generateFullArchive('zip'); }
};

// Add archive button to page
function addArchiveButton() {
    const header = document.querySelector('.navbar');
    if (!header) return;
    
    const archiveGroup = document.createElement('div');
    archiveGroup.className = 'nav-group nav-group-archive';
    archiveGroup.innerHTML = `
        <div class="dropdown">
            <button class="btn btn-archive">📦 Archive</button>
            <div class="dropdown-content">
                <a href="#" onclick="FullArchiveGenerator.generateTarGz()">📦 Full Archive (tar.gz)</a>
                <a href="#" onclick="FullArchiveGenerator.generateZip()">📦 Full Archive (zip)</a>
                <a href="/content/">🗂️ Browse Content Directory</a>
            </div>
        </div>
    `;
    
    header.appendChild(archiveGroup);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addArchiveButton);
} else {
    addArchiveButton();
}
