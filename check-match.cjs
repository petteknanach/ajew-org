const fs = require('fs');

let code = fs.readFileSync('src/pages/chat/index.astro', 'utf8');

const beforeHTML = `<main class="container">
    <!-- Chat Rooms List -->
    <div class="rooms-section" id="roomsSection">
      <div class="rooms-header">
        <h2>💬 Chat Rooms</h2>
      </div>`;

console.log('HTML match:', code.includes(beforeHTML));

const beforeJS = `    // Check user
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        currentUser = session.user;
        // Also fetch subscription from DB so we know their tier locally`;

console.log('JS match:', code.includes(beforeJS));

const beforeExports = `    window.hideModal = () => document.getElementById('modalOverlay').classList.remove('show');
  </script>`;
  
console.log('Exports match:', code.includes(beforeExports));
