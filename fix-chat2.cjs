const fs = require('fs');

let code = fs.readFileSync('src/pages/chat/index.astro', 'utf8');
code = code.replace(/\r\n/g, '\n');

const beforeHTML = `<main class="container">
    <!-- Chat Rooms List -->
    <div class="rooms-section" id="roomsSection">
      <div class="rooms-header">
        <h2>💬 Chat Rooms</h2>
      </div>`;

const afterHTML = `<main class="container">
    <!-- Welcome Section (hidden by default) -->
    <div id="welcomeSection" style="display: none; background: #e0f2fe; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; border: 1px solid #bae6fd;">
      <h2 style="margin: 0 0 0.5rem; color: #0369a1;" id="welcomeTitle">Welcome!</h2>
      <p style="margin: 0; color: #0c4a6e; font-size: 1.05rem;">We're glad you're here. Choose an existing chat room below to join the discussion, or you can start a new topic.</p>
    </div>

    <!-- Chat Rooms List -->
    <div class="rooms-section" id="roomsSection">
      <div class="rooms-header">
        <h2>💬 Chat Rooms</h2>
        <button id="createRoomBtn" class="new-room-btn" onclick="showModal()" style="display: none;">+ New Chat</button>
      </div>`;

if(code.includes(beforeHTML)) {
    code = code.replace(beforeHTML, afterHTML);
    console.log('Replaced HTML');
} else console.log('HTML not found');

const beforeJS = `    // Check user
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        currentUser = session.user;
        // Also fetch subscription from DB so we know their tier locally`;

const afterJS = `    // Check user
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        currentUser = session.user;
        
        // --- NEW: Update UI for logged-in user ---
        const headerLinks = document.querySelector('.header-links');
        if (headerLinks) {
            headerLinks.innerHTML = \`
                <a href="/profile" class="header-link">Profile</a>
                <button onclick="logout()" class="header-link logo-btn" style="border:none; cursor:pointer;">Logout</button>
            \`;
        }
        
        const welcomeSection = document.getElementById('welcomeSection');
        if (welcomeSection) {
            const displayName = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'Friend';
            document.getElementById('welcomeTitle').textContent = 'Welcome back, ' + displayName + '!';
            welcomeSection.style.display = 'block';
        }

        const createRoomBtn = document.getElementById('createRoomBtn');
        if (createRoomBtn) {
            createRoomBtn.style.display = 'block';
        }
        // --- END NEW ---

        // Also fetch subscription from DB so we know their tier locally`;

if(code.includes(beforeJS)) {
    code = code.replace(beforeJS, afterJS);
    console.log('Replaced JS');
} else console.log('JS not found');

const beforeExports = `    window.hideModal = () => document.getElementById('modalOverlay').classList.remove('show');
  </script>`;

const afterExports = `    window.hideModal = () => document.getElementById('modalOverlay').classList.remove('show');
    window.showModal = () => document.getElementById('modalOverlay').classList.add('show');
    window.logout = async () => {
      await supabase.auth.signOut();
      window.location.reload();
    };
  </script>`;

if(code.includes(beforeExports)) {
    code = code.replace(beforeExports, afterExports);
    console.log('Replaced Exports');
} else console.log('Exports not found');

fs.writeFileSync('src/pages/chat/index.astro', code, 'utf8');
console.log('Saved');
