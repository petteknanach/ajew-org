import{s as m}from"./supabaseClient.BFCJicIh.js";let r=null,i=null,c=null;async function w(){const{data:{session:e}}=await m.auth.getSession();if(e){i=e.user;const t=document.querySelector(".header-links");t&&(t.innerHTML=`
                <a href="/profile" class="header-link">Profile</a>
                <button onclick="logout()" class="header-link logo-btn" style="border:none; cursor:pointer;">Logout</button>
            `);const s=document.getElementById("welcomeSection");if(s){const a=i.user_metadata?.display_name||i.email?.split("@")[0]||"Friend";document.getElementById("welcomeTitle").textContent="Welcome back, "+a+"!",s.style.display="block"}const o=document.getElementById("createRoomBtn");o&&(o.style.display="block");const{data:n}=await m.from("subscriptions").select("tier").eq("email",i.email).single();n&&(i.tier=n.tier)}return i}async function p(){const e=[{slug:"general",title:"General Chat",description:"Discuss Breslov teachings"},{slug:"hitbodedut",title:"Hitbodedut Corner",description:"Personal prayer discussions"},{slug:"stories",title:"Stories of the Rebbe",description:"Discuss Sippurey Maasiyot"}],t=document.getElementById("roomsGrid");t.innerHTML=e.map(s=>`
        <div class="room-card" onclick="openRoom('${s.slug}', '${l(s.title)}')">
          <div class="room-card-title">${l(s.title)}</div>
          <div class="room-card-desc">${l(s.description||"No description")}</div>
        </div>
      `).join("")}function l(e){if(!e)return"";const t=document.createElement("div");return t.textContent=e,t.innerHTML}async function y(e,t){r=e,document.getElementById("chatTitle").textContent=t,document.getElementById("roomsSection").style.display="none",document.getElementById("chatSection").classList.add("active"),await g(e),c&&clearInterval(c),c=setInterval(()=>g(e),3e3)}async function g(e){const t=document.getElementById("messages");try{const o=await(await fetch(`/api/chat?room=${e}`)).json();if(!o||o.length===0){t.innerHTML='<div class="empty-state">No messages yet. Be the first!</div>';return}t.innerHTML=o.reverse().map(n=>{const a=new Date(n.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),d=n.username?n.username.charAt(0).toUpperCase():"?";return`
            <div class="message ${i&&n.email===i.email?"my-message":""}">
              <div class="message-header">
                <div class="message-avatar">${d}</div>
                <span class="message-author">${l(n.username||"Guest")}</span>
                <span class="message-time">${a}</span>
              </div>
              <div class="message-content">${l(n.message)}</div>
            </div>
          `}).join(""),t.scrollTop=t.scrollHeight}catch(s){console.error("Load messages error:",s),t.innerHTML='<div class="empty-state">Unable to load messages. Try again later.</div>'}}async function h(){const e=document.getElementById("messageInput"),t=e.value.trim();if(!t||!r)return;if(!i){u();return}if((i.tier||"free")==="free"){u();return}try{const{data:{session:o}}=await m.auth.getSession(),n=o?.access_token||"",a=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({room:r,message:t})});if(!a.ok){const d=await a.json();if(d.error==="Subscription required"){u();return}throw new Error(d.error)}e.value="",await g(r)}catch(o){alert("Failed to send: "+o.message)}}function u(){document.getElementById("messages").innerHTML=`
        <div class="subscribe-prompt">
          <h3>🔒 Subscription Required</h3>
          <p>To send messages, please subscribe for $1/year.</p>
          <a href="/subscribe">Subscribe Now</a>
        </div>
      `}function v(){r=null,c&&clearInterval(c),document.getElementById("roomsSection").style.display="block",document.getElementById("chatSection").classList.remove("active"),p()}document.getElementById("messageInput").addEventListener("keypress",e=>{e.key==="Enter"&&h()});w();p();window.openRoom=y;window.sendMessage=h;window.showRooms=v;window.hideModal=()=>document.getElementById("modalOverlay").classList.remove("show");window.showModal=()=>document.getElementById("modalOverlay").classList.add("show");window.logout=async()=>{await m.auth.signOut(),window.location.reload()};window.createRoom=()=>{const e=document.getElementById("newRoomTitle").value.trim();if(!e)return alert("Chat title is required");const t=e.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");hideModal(),y(t,e)};
