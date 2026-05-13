const fs = require('fs');

let code = fs.readFileSync('src/pages/chat/index.astro', 'utf8');

const beforeExports = `    window.hideModal = () => document.getElementById('modalOverlay').classList.remove('show');
    window.showModal = () => document.getElementById('modalOverlay').classList.add('show');
    window.logout = async () => {
      await supabase.auth.signOut();
      window.location.reload();
    };
  </script>`;

const afterExports = `    window.hideModal = () => document.getElementById('modalOverlay').classList.remove('show');
    window.showModal = () => document.getElementById('modalOverlay').classList.add('show');
    window.logout = async () => {
      await supabase.auth.signOut();
      window.location.reload();
    };
    window.createRoom = () => {
      const title = document.getElementById('newRoomTitle').value.trim();
      if (!title) return alert('Chat title is required');
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      hideModal();
      openRoom(slug, title);
    };
  </script>`;

if(code.includes(beforeExports)) {
    code = code.replace(beforeExports, afterExports);
    console.log('Replaced Exports to add createRoom');
} else {
    console.log('Could not find exports block');
}

fs.writeFileSync('src/pages/chat/index.astro', code, 'utf8');
