// ============================================================
// AUTH HELPERS
// ============================================================

const EMP_CACHE_KEY = 'kpi_emp_cache';
const EMP_CACHE_TTL = 5 * 60 * 1000; // 5 menit

function getCachedEmployee() {
  try {
    const raw = sessionStorage.getItem(EMP_CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj._ts > EMP_CACHE_TTL) { sessionStorage.removeItem(EMP_CACHE_KEY); return null; }
    return obj.data;
  } catch { return null; }
}

function setCachedEmployee(emp) {
  try { sessionStorage.setItem(EMP_CACHE_KEY, JSON.stringify({ data: emp, _ts: Date.now() })); } catch {}
}

function clearEmployeeCache() {
  sessionStorage.removeItem(EMP_CACHE_KEY);
}

async function getCurrentEmployee() {
  // Gunakan cache dulu — tidak perlu API call tiap pindah halaman
  const cached = getCachedEmployee();
  if (cached) return cached;

  const userId = getUserId();
  if (!userId) return null;
  const token = getToken();
  try {
    const data = await sbGet(
      'employees',
      `?select=*,jabatan(nama,division_id,divisions(nama))&user_id=eq.${userId}&limit=1`,
      token
    );
    const emp = (data && data[0]) ? data[0] : null;
    if (emp) setCachedEmployee(emp);
    return emp;
  } catch {
    return null;
  }
}

async function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/index.html';
    return null;
  }
  const emp = await getCurrentEmployee();
  if (!emp) {
    await authSignOut();
    window.location.href = '/index.html';
    return null;
  }
  return emp;
}

async function requireRole(roles) {
  const emp = await requireAuth();
  if (!emp) return null;
  if (!roles.includes(emp.role)) {
    showToast('Akses ditolak. Anda tidak memiliki izin.', 'error');
    setTimeout(() => { window.location.href = '/dashboard.html'; }, 1500);
    return null;
  }
  return emp;
}

async function logout() {
  clearEmployeeCache();
  await authSignOut();
  window.location.href = '/index.html';
}

function formatRupiah(n) {
  if (n === null || n === undefined || isNaN(n)) return 'Rp 0';
  const num = Math.abs(Math.round(Number(n)));
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (Number(n) < 0 ? '-' : '') + 'Rp ' + formatted;
}

function formatPoin(n) {
  if (n === null || n === undefined || isNaN(n)) return '0';
  const num = Number(n);
  if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(1).replace('.0', '') + 'k';
  }
  return num.toFixed(1).replace('.0', '');
}

function getPeriodLabel(period) {
  if (!period) return '';
  const [year, month] = period.split('-');
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[parseInt(month) - 1] + ' ' + year;
}

function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Bottom nav primary items per role (max 4 shown, rest go in nav sheet)
const bnDefs = {
  karyawan: [
    { href: '/dashboard.html',    icon: '&#9732;', label: 'Beranda' },
    { href: '/kpi/view.html',     icon: '&#9733;', label: 'KPI Saya' },
    { href: '/kpi/simulasi.html', icon: '&#9881;', label: 'Simulasi' },
  ],
  hr: [
    { href: '/dashboard.html',       icon: '&#9732;', label: 'Beranda' },
    { href: '/kpi/input.html',       icon: '&#9998;', label: 'Input KPI' },
    { href: '/admin/employees.html', icon: '&#9824;', label: 'Karyawan' },
    { href: '/kpi/view.html',        icon: '&#9733;', label: 'KPI Saya' },
  ],
  finance: [
    { href: '/dashboard.html',      icon: '&#9732;', label: 'Beranda' },
    { href: '/kpi/view.html',       icon: '&#9733;', label: 'KPI Saya' },
    { href: '/payroll/index.html',  icon: '&#9829;', label: 'Payroll' },
    { href: '/admin/settings.html', icon: '&#9881;', label: 'Settings' },
  ],
  ceo: [
    { href: '/dashboard.html',      icon: '&#9732;', label: 'Beranda' },
    { href: '/kpi/view.html',       icon: '&#9733;', label: 'KPI Saya' },
    { href: '/payroll/index.html',  icon: '&#9829;', label: 'Payroll' },
    { href: '/admin/employees.html',icon: '&#9824;', label: 'Karyawan' },
  ],
};

function openNavSheet() {
  const overlay = document.getElementById('navSheetOverlay');
  if (overlay) { overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeNavSheet() {
  const overlay = document.getElementById('navSheetOverlay');
  if (overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }
}

function initBottomNav(employee) {
  const role = employee.role;
  const currentPath = window.location.pathname;

  const allLinks = [
    { href: '/dashboard.html',       icon: '&#9732;', label: 'Dashboard',         roles: ['karyawan','hr','finance','ceo'] },
    { href: '/kpi/view.html',        icon: '&#9733;', label: 'KPI Saya',           roles: ['karyawan','hr','finance','ceo'] },
    { href: '/kpi/simulasi.html',    icon: '&#9881;', label: 'Simulasi KPI',       roles: ['karyawan','hr','finance','ceo'] },
    { href: '/kpi/input.html',       icon: '&#9998;', label: 'Input KPI',          roles: ['hr','ceo'] },
    { href: '/kpi/input-bulk.html',  icon: '&#9783;', label: 'Input Massal',       roles: ['hr','ceo'] },
    { href: '/kpi/template.html',    icon: '&#9889;', label: 'Template KPI',       roles: ['hr','ceo'] },
    { href: '/admin/employees.html', icon: '&#9824;', label: 'Karyawan',           roles: ['hr','ceo'] },
    { href: '/admin/struktur.html',  icon: '&#127968;', label: 'Divisi & Jabatan', roles: ['hr','ceo'] },
    { href: '/admin/products.html',  icon: '&#9827;', label: 'Produk',             roles: ['hr','ceo'] },
    { href: '/admin/pengkali.html',  icon: '&#9733;', label: 'Pengkali KPI',       roles: ['hr','ceo'] },
    { href: '/payroll/index.html',   icon: '&#9829;', label: 'Payroll',            roles: ['finance','ceo'] },
    { href: '/admin/settings.html',  icon: '&#9881;', label: 'Pengaturan',         roles: ['finance','ceo'] },
  ];

  const visibleLinks = allLinks.filter(l => l.roles.includes(role));
  const primaryItems = bnDefs[role] || [];
  const hasMore = visibleLinks.length > primaryItems.length;

  function isActive(href) {
    return currentPath === href || (href !== '/dashboard.html' && currentPath.includes(href));
  }

  // Bottom nav bar
  const bnItems = primaryItems.map(item => `
    <a href="${item.href}" class="bn-item ${isActive(item.href) ? 'active' : ''}">
      <span class="bn-icon">${item.icon}</span>
      <span class="bn-label">${item.label}</span>
    </a>`).join('');

  const moreBtn = hasMore ? `
    <button class="bn-item" onclick="openNavSheet()">
      <span class="bn-icon">&#9776;</span>
      <span class="bn-label">Menu</span>
    </button>` : '';

  // Nav sheet (all links for this role)
  const sheetLinks = visibleLinks.map(link => `
    <a href="${link.href}" class="nav-sheet-link ${isActive(link.href) ? 'active' : ''}">
      <span class="ns-icon">${link.icon}</span>${link.label}
    </a>`).join('');

  const sheetFooter = `
    <div style="border-top:1px solid var(--border);margin-top:10px;padding-top:10px;">
      <div style="display:flex;align-items:center;gap:10px;padding:8px 14px 12px;">
        <div style="width:36px;height:36px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:14px;flex-shrink:0;">${employee.nama.charAt(0).toUpperCase()}</div>
        <div>
          <div style="font-weight:600;font-size:14px;">${employee.nama}</div>
          <div style="font-size:11px;color:var(--gray-400);text-transform:uppercase;">${role}</div>
        </div>
      </div>
      <button onclick="logout()" class="nav-sheet-link" style="width:100%;border:none;cursor:pointer;background:none;color:var(--danger);font-weight:600;">
        <span class="ns-icon">&#10005;</span>Keluar
      </button>
    </div>`;

  // Inject into DOM
  let bnEl = document.getElementById('bottomNavContainer');
  if (!bnEl) {
    bnEl = document.createElement('div');
    bnEl.id = 'bottomNavContainer';
    document.body.appendChild(bnEl);
  }
  bnEl.innerHTML = `
    <nav class="bottom-nav">
      <div class="bottom-nav-inner">${bnItems}${moreBtn}</div>
    </nav>
    <div class="nav-sheet-overlay" id="navSheetOverlay" onclick="closeNavSheet()">
      <div class="nav-sheet" onclick="event.stopPropagation()">
        <div class="nav-sheet-handle"></div>
        <div class="nav-sheet-title">Navigasi</div>
        ${sheetLinks}
        ${sheetFooter}
      </div>
    </div>`;
}

function getSidebar(role, activePage) {
  const allLinks = [
    { href: '/dashboard.html', icon: '&#9732;', label: 'Dashboard', roles: ['karyawan', 'hr', 'finance', 'ceo'] },
    { href: '/kpi/view.html', icon: '&#9733;', label: 'KPI Saya', roles: ['karyawan', 'hr', 'finance', 'ceo'] },
    { href: '/kpi/simulasi.html', icon: '&#9881;', label: 'Simulasi KPI', roles: ['karyawan', 'hr', 'finance', 'ceo'] },
    { href: '/kpi/input.html', icon: '&#9998;', label: 'Input KPI', roles: ['hr', 'ceo'] },
    { href: '/kpi/input-bulk.html', icon: '&#9783;', label: 'Input KPI Massal', roles: ['hr', 'ceo'] },
    { href: '/kpi/template.html', icon: '&#9889;', label: 'Template KPI', roles: ['hr', 'ceo'] },
    { href: '/admin/employees.html', icon: '&#9824;', label: 'Karyawan', roles: ['hr', 'ceo'] },
    { href: '/admin/struktur.html', icon: '&#127968;', label: 'Divisi & Jabatan', roles: ['hr', 'ceo'] },
    { href: '/admin/products.html', icon: '&#9827;', label: 'Produk', roles: ['hr', 'ceo'] },
    { href: '/admin/pengkali.html', icon: '&#9733;', label: 'Pengkali KPI', roles: ['hr', 'ceo'] },
    { href: '/payroll/index.html', icon: '&#9829;', label: 'Payroll', roles: ['finance', 'ceo'] },
    { href: '/admin/settings.html', icon: '&#9881;', label: 'Pengaturan', roles: ['finance', 'ceo'] },
  ];

  const visibleLinks = allLinks.filter(l => l.roles.includes(role));
  const currentPath = window.location.pathname;

  const navItems = visibleLinks.map(link => {
    const activeClass = (currentPath === link.href || (link.href !== '/dashboard.html' && currentPath.includes(link.href))) ? 'active' : '';
    return `<a href="${link.href}" class="nav-link ${activeClass}" data-label="${link.label}">
        <span class="nav-icon">${link.icon}</span>
        <span class="nav-label">${link.label}</span>
      </a>`;
  }).join('');

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header" style="padding:20px 20px 16px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;">
        <div class="sidebar-logo" style="display:flex;align-items:center;gap:12px;">
          <div class="logo-icon">ADS</div>
          <div class="logo-text sidebar-logo-text">
            <div class="logo-name">KPI System</div>
            <div class="logo-sub">Albanna Digital</div>
          </div>
        </div>
        <button class="sidebar-collapse-btn" id="sidebarCollapseBtn" title="Sembunyikan sidebar">&#8249;</button>
      </div>
      <nav class="sidebar-nav">
        ${navItems}
      </nav>
      <div class="sidebar-footer">
        <div class="user-info" id="sidebarUserInfo">
          <div class="user-avatar" id="sidebarAvatar">-</div>
          <div class="user-details">
            <div class="user-name" id="sidebarUserName">Loading...</div>
            <div class="user-role" id="sidebarUserRole">-</div>
          </div>
        </div>
        <button class="btn-logout" onclick="logout()" style="display:flex;align-items:center;gap:6px;cursor:pointer;">
          <span>&#x2715;</span><span>Keluar</span>
        </button>
      </div>
    </aside>
  `;
}

function prefetchSidebarPages(role) {
  const allLinks = [
    '/dashboard.html', '/kpi/view.html', '/kpi/input.html', '/kpi/template.html',
    '/admin/employees.html', '/admin/struktur.html', '/admin/products.html',
    '/payroll/index.html', '/admin/settings.html'
  ];
  // Prefetch setelah 1 detik supaya tidak ganggu load utama
  setTimeout(() => {
    allLinks.forEach(href => {
      if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    });
  }, 1000);
}

function initSidebar(employee) {
  const sidebarContainer = document.getElementById('sidebarContainer');
  if (sidebarContainer) {
    sidebarContainer.innerHTML = getSidebar(employee.role);
  }
  prefetchSidebarPages(employee.role);
  const nameEl = document.getElementById('sidebarUserName');
  const roleEl = document.getElementById('sidebarUserRole');
  const avatarEl = document.getElementById('sidebarAvatar');
  if (nameEl) nameEl.textContent = employee.nama;
  if (roleEl) roleEl.textContent = employee.role.toUpperCase();
  if (avatarEl) avatarEl.textContent = employee.nama.charAt(0).toUpperCase();

  const topBarUser = document.getElementById('topBarUser');
  if (topBarUser) topBarUser.textContent = employee.nama;

  // Restore saved collapsed state
  if (localStorage.getItem('sidebar_collapsed') === 'true') {
    document.body.classList.add('sidebar-collapsed');
  }

  function updateCollapseBtn() {
    const btn = document.getElementById('sidebarCollapseBtn');
    if (!btn) return;
    const collapsed = document.body.classList.contains('sidebar-collapsed');
    btn.innerHTML = collapsed ? '&#8250;' : '&#8249;';
    btn.title = collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar';
  }
  updateCollapseBtn();

  // Desktop collapse button (inside sidebar)
  const collapseBtn = document.getElementById('sidebarCollapseBtn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-collapsed');
      const collapsed = document.body.classList.contains('sidebar-collapsed');
      localStorage.setItem('sidebar_collapsed', collapsed);
      updateCollapseBtn();
    });
  }

  // Mobile hamburger + backdrop
  const hamburger = document.getElementById('hamburger');
  const sidebar   = document.getElementById('sidebar');

  // Create backdrop element
  let backdrop = document.getElementById('sidebarBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'sidebarBackdrop';
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  function openSidebar() {
    sidebar.classList.add('open');
    backdrop.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('show');
    document.body.style.overflow = '';
  }

  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      if (sidebar.classList.contains('open')) closeSidebar();
      else openSidebar();
    });
  }
  if (backdrop) {
    backdrop.addEventListener('click', closeSidebar);
  }
  // Close sidebar on nav link click (mobile)
  sidebar && sidebar.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  // Init bottom navigation bar (mobile)
  initBottomNav(employee);
}

// Toast notification
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#4f46e5' };
  toast.style.cssText = `
    background:${colors[type] || colors.info};
    color:white;
    padding:12px 20px;
    border-radius:8px;
    font-size:14px;
    font-weight:500;
    box-shadow:0 4px 12px rgba(0,0,0,0.15);
    animation:slideIn 0.3s ease;
    max-width:320px;
    cursor:pointer;
  `;
  toast.textContent = message;
  toast.onclick = () => toast.remove();
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
}

function showLoading(show = true) {
  let overlay = document.getElementById('loadingOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.7);display:flex;align-items:center;justify-content:center;z-index:9998;';
    document.body.appendChild(overlay);
  }
  overlay.style.display = show ? 'flex' : 'none';
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}
