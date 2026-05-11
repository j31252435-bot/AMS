// =============================================
// TENANT SEARCH PAGE — tenant.js
// =============================================

let db = window._supabase;

// Ensure DB is ready even if rooms.js loads slightly after
function getDB() {
  if (!db) db = window._supabase;
  return db;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Wait briefly to ensure supabase client is ready
  await new Promise(r => setTimeout(r, 150));
  db = window._supabase;
  if (!db) { console.error('Supabase not ready'); return; }
  await renderVacantRooms();
  
  document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('passwordInput').focus();
  });
  document.getElementById('passwordInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchRoom();
  });
});

// ---- Search ----
window.searchRoom = async function() {
  const roomNumber = document.getElementById('searchInput').value.trim();
  const roomPassword = document.getElementById('passwordInput').value.trim();
  const section = document.getElementById('resultSection');
  const btn = document.getElementById('searchBtn');

  if (!roomNumber || !roomPassword) {
    section.innerHTML = `
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center fade-in">
        <p class="text-amber-700 font-medium text-sm">⚠️ Please enter both Room Number and Password.</p>
      </div>`;
    return;
  }

  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = 'Searching...';

  // Securely verify access
  const room = await verifyRoomAccess(roomNumber, roomPassword);

  btn.disabled = false;
  btn.innerHTML = originalHtml;

  if (!room) {
    section.innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center fade-in">
        <svg class="w-12 h-12 mx-auto mb-3 text-red-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
        </svg>
        <p class="text-red-700 font-bold mb-1">Access Denied</p>
        <p class="text-red-500 text-sm">Incorrect Room Number or Password. Please check your credentials or contact management.</p>
      </div>`;
    return;
  }

  section.innerHTML = buildRoomCard(room, true);
  // Reset tabs to Info
  setTimeout(() => {
    switchTenantTab('info');
    loadTenantNotices();
    loadTenantFixHistory(room.roomNumber);
  }, 50);
}

// ---- Tab System ----
window.switchTenantTab = function(tab) {
  document.querySelectorAll('.tenant-tab-content').forEach(c => c.classList.add('hidden'));
  document.querySelectorAll('.tenant-tab-btn').forEach(b => {
    b.classList.remove('border-teal-600', 'text-teal-600');
    b.classList.add('border-transparent', 'text-gray-400');
  });

  const target = document.getElementById('tab-' + tab);
  const btn = document.getElementById('btn-tab-' + tab);
  
  if (target) target.classList.remove('hidden');
  if (btn) {
    btn.classList.add('border-teal-600', 'text-teal-600');
    btn.classList.remove('border-transparent', 'text-gray-400');
  }
};

// ---- Build Room Card ----
function buildRoomCard(room, isSearch) {
  const whatsappMsg = encodeURIComponent(`Hello, I'm interested in Room ${room.roomNumber} at Dan's Rentals. Is it still ${room.status}?`);
  const whatsappUrl = `https://wa.me/${LANDLORD_PHONE}?text=${whatsappMsg}`;
  const callUrl = `tel:+${LANDLORD_PHONE}`;
  const viewingMsg = encodeURIComponent(`Hi, I would like to schedule a viewing for Room ${room.roomNumber} at Dan's Rentals. Please let me know available times.`);
  const viewingUrl = `https://wa.me/${LANDLORD_PHONE}?text=${viewingMsg}`;

  return `
    <div class="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 fade-in">
      <!-- Tabs Header -->
      <div class="flex border-b border-gray-50 px-6">
        <button onclick="switchTenantTab('info')" id="btn-tab-info" class="tenant-tab-btn flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all">Info</button>
        <button onclick="switchTenantTab('notices')" id="btn-tab-notices" class="tenant-tab-btn flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 border-transparent text-gray-400 transition-all">Notices</button>
        <button onclick="switchTenantTab('fixes')" id="btn-tab-fixes" class="tenant-tab-btn flex-1 py-4 text-xs font-bold uppercase tracking-widest border-b-2 border-transparent text-gray-400 transition-all">Fixes</button>
      </div>

      <div class="p-6">
        <!-- INFO TAB -->
        <div id="tab-info" class="tenant-tab-content space-y-5">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-2xl font-bold text-gray-900">${formatRoomTitle(room.roomNumber)}</h3>
              <p class="text-sm text-gray-500 uppercase font-bold tracking-wider">Property Details</p>
            </div>
            <span class="badge badge-${room.status}">${room.status}</span>
          </div>

          <div class="bg-teal-50 rounded-2xl px-5 py-4 border border-teal-100 shadow-sm">
            <p class="text-xs text-teal-600 font-bold uppercase tracking-widest mb-1">Monthly Rent</p>
            <p class="text-3xl font-bold text-teal-800">${formatRent(room.rent)}</p>
          </div>

          <div>
            <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Details</p>
            <p class="text-sm text-gray-600 leading-relaxed">Contact management for more information about this unit.</p>
          </div>

          <div class="pt-4 border-t border-gray-50">
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">Contact Management</p>
            <div class="grid grid-cols-1 gap-3">
              <a href="${whatsappUrl}" target="_blank" class="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-100 transition-all hover:brightness-95 active:scale-95">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.317 0-4.478-.672-6.32-1.828l-.352-.216-3.451 1.157 1.157-3.451-.216-.352A9.955 9.955 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                Message Management
              </a>
            </div>
          </div>
        </div>

        <!-- NOTICES TAB -->
        <div id="tab-notices" class="tenant-tab-content hidden space-y-4">
          <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Management Updates</h4>
          <div id="tenantNoticesList" class="space-y-3">
            <div class="animate-pulse flex space-x-4">
              <div class="rounded-full bg-gray-200 h-10 w-10"></div>
              <div class="flex-1 space-y-6 py-1">
                <div class="h-2 bg-gray-200 rounded"></div>
                <div class="h-2 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- FIXES TAB -->
        <div id="tab-fixes" class="tenant-tab-content hidden space-y-5">
          <div>
            <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Report an Issue</h4>
            <p class="text-xs text-gray-500 mb-4">Submit a repair request to management.</p>
            
            <div class="space-y-3">
              <input type="text" id="maintIssue" placeholder="Brief issue (e.g. Leaking Sink)" class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm focus:ring-2 focus:ring-teal-500">
              <textarea id="maintDesc" rows="3" placeholder="Provide more details..." class="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm focus:ring-2 focus:ring-teal-500"></textarea>
              <button onclick="submitMaintenanceRequestFlow('${room.roomNumber}')" id="maintSubmitBtn" class="w-full py-3 bg-teal-600 text-white font-bold rounded-xl shadow-md transition-all active:scale-95">Submit Request</button>
            </div>
          </div>

          <div class="pt-4 border-t border-gray-50">
            <h4 class="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Your Fix History</h4>
            <div id="tenantFixHistory" class="space-y-3 text-center py-4">
              <p class="text-[10px] text-gray-400 italic">No recent maintenance requests found.</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

window.loadTenantNotices = async function() {
  const list = document.getElementById('tenantNoticesList');
  if (!list) return;

  const notices = await loadNotices();
  if (notices.length === 0) {
    list.innerHTML = `<p class="text-[10px] text-gray-400 italic py-4 text-center">No management updates at this time.</p>`;
    return;
  }

  list.innerHTML = notices.map(n => `
    <div class="${n.priority === 'high' ? 'bg-red-50 border border-red-100' : 'bg-gray-50'} rounded-2xl p-4 fade-in">
      ${n.priority === 'high' ? `
        <div class="flex items-center gap-2 mb-1">
          <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <p class="text-[10px] font-bold text-red-700 uppercase">High Priority</p>
        </div>
      ` : ''}
      <h5 class="font-bold text-gray-900 text-sm mb-1">${n.title}</h5>
      <p class="text-xs text-gray-600 leading-relaxed">${n.content}</p>
      <div class="mt-2">
        <p class="text-[9px] text-gray-400 font-medium uppercase tracking-widest">${timeAgo(n.created_at)}</p>
      </div>
    </div>
  `).join('');
};

window.loadTenantFixHistory = async function(roomNumber) {
  const historyCont = document.getElementById('tenantFixHistory');
  if (!historyCont) return;

  const requests = await loadMaintenanceRequests();
  const roomRequests = requests.filter(r => r.room_number === roomNumber);

  if (roomRequests.length === 0) {
    historyCont.innerHTML = `<p class="text-[10px] text-gray-400 italic py-4 text-center">No recent maintenance requests found.</p>`;
    return;
  }

  historyCont.innerHTML = roomRequests.map(r => `
    <div class="bg-gray-50 rounded-xl p-3 text-left">
      <div class="flex justify-between items-center mb-1">
        <h6 class="font-bold text-gray-900 text-xs">${r.issue}</h6>
        <span class="text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${r.status === 'resolved' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}">${r.status}</span>
      </div>
      <div class="flex justify-between items-center mt-1">
        <p class="text-[10px] text-gray-400">${timeAgo(r.created_at)}</p>
        <button onclick="deleteTenantFix('${r.id}', '${r.room_number}')" class="text-[9px] font-bold text-red-400 hover:text-red-600 uppercase">Delete</button>
      </div>
    </div>
  `).join('');
};

window.deleteTenantFix = async function(id, roomNumber) {
  if (!confirm('Delete this request?')) return;
  const { error } = await getDB().from('maintenance_requests').delete().eq('id', id);
  if (!error) { 
    window.clearCache('maintenance');
    alert('Record deleted'); 
    loadTenantFixHistory(roomNumber); 
  }
  else alert('Failed: ' + error.message);
};

window.submitMaintenanceRequestFlow = async function(roomNumber) {
  const issue = document.getElementById('maintIssue').value.trim();
  const description = document.getElementById('maintDesc').value.trim();

  if (!issue) return alert('Please specify the issue');

  const btn = document.getElementById('maintSubmitBtn');
  btn.disabled = true;
  btn.innerHTML = 'Submitting...';

  const result = await createMaintenanceRequest({ room_number: roomNumber, issue, description });
  if (result) {
    alert('Your maintenance request has been submitted successfully.');
    document.getElementById('maintIssue').value = '';
    document.getElementById('maintDesc').value = '';
    loadTenantFixHistory(roomNumber);
  } else {
    alert('Failed to submit request. Please try again.');
  }
  btn.disabled = false;
  btn.innerHTML = 'Submit Request';
};

// ---- Vacant Rooms List ----
async function renderVacantRooms() {
  const rooms = await loadRooms();
  const vacant = (rooms || []).filter(r => (r.status || '').toLowerCase() === 'vacant');
  const list = document.getElementById('vacantList');
  const noVacant = document.getElementById('noVacant');

  if (!list) return;

  if (vacant.length === 0) {
    list.innerHTML = '';
    if (noVacant) noVacant.classList.remove('hidden');
    return;
  }
  if (noVacant) noVacant.classList.add('hidden');

  list.innerHTML = vacant.map((room, i) => `
    <div class="bg-white rounded-2xl shadow-sm p-4 border border-gray-100 flex gap-4 items-center cursor-pointer hover:shadow-md transition fade-in" style="animation-delay:${i*0.08}s" onclick="showVacantDetail('${room.roomNumber}')">
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-gray-900">${formatRoomTitle(room.roomNumber)}</h4>
          <span class="badge badge-vacant text-[10px]">Vacant</span>
        </div>
        <p class="text-xs text-gray-500">Residential Unit</p>
        <p class="text-sm font-bold text-teal-700">${formatRent(room.rent)}<span class="text-xs font-normal text-gray-400">/mo</span></p>
      </div>
    </div>
  `).join('');
}

async function showVacantDetail(roomNumber) {
  document.getElementById('searchInput').value = roomNumber;
  document.getElementById('passwordInput').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- Cross-tab sync (Disabled for Supabase, but keeping structure if needed) ----
// window.addEventListener('storage', ...)
