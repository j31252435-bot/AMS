// =============================================
// SHARED DATA & SUPABASE CONFIG — rooms.js
// =============================================

// Initialize and share the client globally (if not already done in HTML)
if (!window._supabase && window.supabase && window.SUPABASE_URL) {
  window._supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
}

const _supabase = window._supabase;


window.LANDLORD_PHONE = '254717056096';
const LANDLORD_PHONE = window.LANDLORD_PHONE;

// ---- GLOBAL STATE CACHE ----
window.AppState = {
  rooms: null,
  payments: null,
  tenants: null,
  notices: null,
  maintenance: null
};

window.clearCache = function(key) {
  if (key) window.AppState[key] = null;
  else {
    window.AppState.rooms = null;
    window.AppState.payments = null;
    window.AppState.tenants = null;
    window.AppState.notices = null;
    window.AppState.maintenance = null;
  }
};

// ---- AUTH HELPER ----
async function getCurrentUser() {
  const { data: { session } } = await _supabase.auth.getSession();
  return session?.user || null;
}

// ---- ROOMS DATA ----
async function loadRooms(forceRefresh = false) {
  if (!forceRefresh && window.AppState.rooms) return window.AppState.rooms;
  const { data, error } = await _supabase
    .from('rooms')
    .select('*')
    .order('room_number', { ascending: true });
  
  if (error) {
    console.error('Error loading rooms:', error);
    alert('Failed to load rooms: ' + error.message);
    return [];
  }
  
  // Map database columns to application properties and sort numerically
  window.AppState.rooms = data.map(r => ({
    roomNumber: r.room_number,
    rent: r.monthly_rent,
    status: r.status,
    roomPassword: r.room_password,
    apartmentId: r.apartment_id
  })).sort((a, b) => {
    const numA = parseInt(a.roomNumber.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.roomNumber.replace(/\D/g, ''), 10) || 0;
    return numA - numB;
  });
  return window.AppState.rooms;
}

async function updateRoom(roomNumber, updates) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  // Map application properties back to database columns
  const dbUpdates = {};
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.rent) dbUpdates.monthly_rent = updates.rent;
  if (updates.roomPassword) dbUpdates.room_password = updates.roomPassword;
  if (updates.newRoomNumber && updates.newRoomNumber !== roomNumber) {
    dbUpdates.room_number = updates.newRoomNumber;
  }

  const { data, error } = await _supabase
    .from('rooms')
    .update(dbUpdates)
    .eq('room_number', roomNumber)
    .select()
    .single();

  if (error) {
    console.error('Error updating room:', error);
    if (error.code === '23503') {
      alert('Cannot change room number because there are existing tenants or records tied to this room. Remove them first.');
    } else {
      alert('Failed to update room: ' + error.message);
    }
    return null;
  }
  window.clearCache('rooms');
  return data;
}

async function deleteRoom(roomNumber) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await _supabase
    .from('rooms')
    .delete()
    .eq('room_number', roomNumber);

  if (error) {
    console.error('Error deleting room:', error);
    if (error.code === '23503') {
      alert('Cannot delete room because it is occupied or has records tied to it.');
    } else {
      alert('Failed to delete room: ' + error.message);
    }
    return false;
  }
  window.clearCache('rooms');
  return true;
}

async function findRoom(roomNumber) {
  const { data, error } = await _supabase
    .from('rooms')
    .select('*')
    .eq('room_number', roomNumber.trim())
    .single();

  if (error || !data) return null;
  
  return {
    roomNumber: data.room_number,
    rent: data.monthly_rent,
    status: data.status,
    roomPassword: data.room_password
  };
}

// Secure lookup for Tenant Portal
async function verifyRoomAccess(roomNumber, roomPassword) {
  const { data, error } = await _supabase
    .from('rooms')
    .select('*')
    .eq('room_number', roomNumber.trim())
    .eq('room_password', roomPassword.trim())
    .single();

  if (error || !data) return null;
  
  return {
    roomNumber: data.room_number,
    rent: data.monthly_rent,
    status: data.status,
    roomPassword: data.room_password
  };
}

async function getRoomStats() {
  const rooms = await loadRooms();
  const getCount = (status) => rooms.filter(r => r.status?.toLowerCase() === status.toLowerCase()).length;
  
  return {
    total: rooms.length,
    vacant: getCount('vacant'),
    occupied: getCount('occupied'),
    reserved: getCount('reserved')
  };
}

// ---- PAYMENTS DATA ----
async function loadPayments(forceRefresh = false) {
  if (!forceRefresh && window.AppState.payments) return window.AppState.payments;
  const { data, error } = await _supabase
    .from('payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading payments:', error);
    alert('Failed to load payments: ' + error.message);
    return [];
  }

  window.AppState.payments = data.map(p => ({
    id: p.id,
    tenantName: p.tenant_name,
    unitNumber: p.room_number || p.unit_number,
    amount: p.amount,
    phone: p.phone,
    transactionCode: p.transaction_code,
    date: p.created_at,
    status: p.status,
    month: p.month,
    receiptImage: p.receipt_image
  }));
  return window.AppState.payments;
}

async function updatePaymentStatus(paymentId, status) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const { data, error } = await _supabase
    .from('payments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating payment:', error);
    return null;
  }
  
  window.clearCache('payments');
  
  return {
    id: data.id,
    tenantName: data.tenant_name,
    unitNumber: data.room_number || data.unit_number,
    status: data.status
  };
}

async function getPaymentStats() {
  const payments = await loadPayments();
  const rooms = await loadRooms();
  const currentMonth = "May 2026";
  const monthlyPayments = payments.filter(p => p.month === currentMonth);

  const verifiedCount = monthlyPayments.filter(p => p.status === 'verified').length;

  return {
    totalCollected: monthlyPayments.filter(p => p.status === 'verified').reduce((sum, p) => sum + p.amount, 0),
    paidTenants: verifiedCount,
    unpaidTenants: Math.max(0, rooms.length - verifiedCount),
    latePayments: monthlyPayments.filter(p => p.status === 'pending' && p.date && new Date(p.date).getDate() > 5).length,
    pendingVerifications: payments.filter(p => p.status === 'pending').length
  };
}

// ---- TENANTS ----
async function loadTenants(forceRefresh = false) {
  if (!forceRefresh && window.AppState.tenants) return window.AppState.tenants;
  const { data, error } = await _supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading tenants:', error);
    alert('Failed to load tenants: ' + error.message);
    return [];
  }

  window.AppState.tenants = data;
  return data;
}

async function registerTenant(tenantData) {
  const { data, error } = await _supabase
    .from('tenants')
    .insert([tenantData])
    .select()
    .single();

  if (error) {
    console.error('Error registering tenant:', error);
    return null;
  }
  window.clearCache('tenants');
  return data;
}

// ---- NOTICES ----
async function loadNotices(forceRefresh = false) {
  if (!forceRefresh && window.AppState.notices) return window.AppState.notices;
  const { data, error } = await _supabase
    .from('notices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading notices:', error);
    return [];
  }
  window.AppState.notices = data;
  return data;
}

async function postNotice(noticeData) {
  const { data, error } = await _supabase
    .from('notices')
    .insert([noticeData])
    .select()
    .single();

  if (error) {
    console.error('Error posting notice:', error);
    return null;
  }
  window.clearCache('notices');
  return data;
}

// ---- MAINTENANCE ----
async function loadMaintenanceRequests(forceRefresh = false) {
  if (!forceRefresh && window.AppState.maintenance) return window.AppState.maintenance;
  const { data, error } = await _supabase
    .from('maintenance_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading maintenance:', error);
    return [];
  }
  window.AppState.maintenance = data;
  return data;
}

async function createMaintenanceRequest(reqData) {
  const { data, error } = await _supabase
    .from('maintenance_requests')
    .insert([reqData])
    .select()
    .single();

  if (error) {
    console.error('Error creating maintenance request:', error);
    return null;
  }
  window.clearCache('maintenance');
  return data;
}

async function updateMaintenanceStatus(id, status) {
  const { data, error } = await _supabase
    .from('maintenance_requests')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating maintenance status:', error);
    return null;
  }
  window.clearCache('maintenance');
  return data;
}

// ---- UTILS ----
function formatRoomTitle(roomNumber) {
  const num = String(roomNumber).replace(/\D/g, '');
  return `ROOM ${num.padStart(2, '0')}`;
}

function formatRent(amount) {
  return 'KES ' + Number(amount).toLocaleString('en-KE');
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}
