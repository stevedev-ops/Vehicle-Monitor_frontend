// Master Application Controller
// Fully offline-first with IndexedDB, On-Device AI Vision, and Reactive State.

const App = (function() {
  let state = {
    currentVehicleId: null,
    currentVehicle: null,
    vehicles: [],
    fuelEntries: [],
    services: [],
    reminders: [],
    ownerDocuments: [],
    vehicleDocuments: [],
    expenses: [],
    activeTab: 'dashboard',
    fuelFilter: 'all'
  };

  // DOM Elements cache
  const dom = {};

  async function init() {
    console.log('[App] Initializing Vehicle Monitor...');
    cacheDom();
    bindEvents();

    // Register Service Worker if supported
    if ('serviceWorker' in navigator) {
      const swPath = window.location.pathname.includes('/static/') ? '/static/sw.js' : '/sw.js';
      navigator.serviceWorker.register(swPath, { scope: '/' })
        .catch(() => navigator.serviceWorker.register('/static/sw.js', { scope: '/' }))
        .then(() => console.log('[SW] Registered successfully'))
        .catch(err => console.log('[SW] Registration failed:', err));
    }

    // Initialize DB & Seed if empty
    try {
      await AppDB.initSeedIfEmpty();
      await loadInitialData();
    } catch (err) {
      console.error('[App] Init DB Error:', err);
    }
  }

  function cacheDom() {
    dom.activeVehPlate = document.getElementById('activeVehPlate');
    dom.activeVehName = document.getElementById('activeVehName');
    dom.activeVehStats = document.getElementById('activeVehStats');
    dom.btnSwitchVeh = document.getElementById('btnSwitchVeh');
    dom.mainContent = document.getElementById('mainContent');

    // Sidebar & Navigation DOM
    dom.appSidebar = document.getElementById('appSidebar');
    dom.sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    dom.sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    dom.sidebarBackdrop = document.getElementById('sidebarBackdrop');
    dom.topVehBreadcrumb = document.getElementById('topVehBreadcrumb');
    dom.topBtnRefuel = document.getElementById('topBtnRefuel');
    dom.topBtnDownload = document.getElementById('topBtnDownload');
    dom.sidebarBtnAIScan = document.getElementById('sidebarBtnAIScan');
    dom.sidebarBtnDownloadSummary = document.getElementById('sidebarBtnDownloadSummary');

    // Modals
    dom.modalSwitchVeh = document.getElementById('modalSwitchVeh');
    dom.modalRefuel = document.getElementById('modalRefuel');
    dom.modalEntryDetail = document.getElementById('modalEntryDetail');
    dom.modalAIScan = document.getElementById('modalAIScan');
    dom.modalService = document.getElementById('modalService');
    dom.modalExpense = document.getElementById('modalExpense');
    dom.modalAddVeh = document.getElementById('modalAddVeh');
    dom.modalDocument = document.getElementById('modalDocument');
    dom.modalReminder = document.getElementById('modalReminder');
    dom.modalImport = document.getElementById('modalImport');
  }

  function bindEvents() {
    // Nav Tabs & Sidebar Links
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    // Sidebar Toggle & Close
    dom.sidebarToggleBtn?.addEventListener('click', toggleSidebar);
    dom.sidebarCloseBtn?.addEventListener('click', closeSidebar);
    dom.sidebarBackdrop?.addEventListener('click', closeSidebar);

    // Top Bar Actions
    dom.topBtnRefuel?.addEventListener('click', () => openRefuelModal());
    dom.topBtnDownload?.addEventListener('click', downloadVehicleSummary);
    dom.sidebarBtnAIScan?.addEventListener('click', openAIScanModal);
    dom.sidebarBtnDownloadSummary?.addEventListener('click', downloadVehicleSummary);

    // Vehicle Switcher Button
    dom.btnSwitchVeh?.addEventListener('click', openSwitchVehModal);

    // Modal Close Buttons (Handles any button with data-close-modal or .modal-close)
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-close-modal], .modal-close')) {
        closeAllModals();
      }
      if (e.target.classList.contains('modal-overlay')) {
        closeAllModals();
      }
    });

    // Form Submissions
    setupRefuelForm();
    setupAIScanner();
    setupServiceForm();
    setupExpenseForm();
    setupVehicleForm();
    setupDocumentForm();
    setupReminderForm();
    setupCSVImporter();
  }

  async function loadInitialData() {
    state.vehicles = await AppDB.getAll('vehicles');
    
    // Determine active vehicle
    let active = state.vehicles.find(v => v.isActive);
    if (!active && state.vehicles.length > 0) {
      active = state.vehicles[0];
      active.isActive = true;
      await AppDB.put('vehicles', active);
    }

    if (active) {
      state.currentVehicleId = active.id;
      state.currentVehicle = active;
    }

    await loadVehicleScopedData();
    updateVehicleBanner();
    renderCurrentTab();
  }

  async function loadVehicleScopedData() {
    if (!state.currentVehicleId) return;

    // Load fuel entries for selected car
    const allFuel = await AppDB.getAll('fuel_entries');
    state.fuelEntries = allFuel
      .filter(f => f.vehicleId === state.currentVehicleId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Load services & reminders
    const allServices = await AppDB.getAll('services');
    state.services = allServices
      .filter(s => s.vehicleId === state.currentVehicleId)
      .sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));

    const allReminders = await AppDB.getAll('reminders');
    state.reminders = allReminders.filter(r => r.vehicleId === state.currentVehicleId);

    // Load documents
    state.ownerDocuments = await AppDB.getAll('owner_documents');
    const allVehDocs = await AppDB.getAll('vehicle_documents');
    state.vehicleDocuments = allVehDocs.filter(d => d.vehicleId === state.currentVehicleId);

    // Load expenses
    const allExpenses = await AppDB.getAll('expenses');
    state.expenses = allExpenses
      .filter(e => e.vehicleId === state.currentVehicleId)
      .sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate));
  }

  function updateVehicleBanner() {
    if (!state.currentVehicle) return;
    const v = state.currentVehicle;
    if (dom.activeVehPlate) dom.activeVehPlate.textContent = v.registrationNumber;
    if (dom.activeVehName) dom.activeVehName.textContent = `${v.make} ${v.model}`;
    if (dom.activeVehStats) {
      dom.activeVehStats.textContent = `${v.fuelType.toUpperCase()} · ${v.engineCapacity || '1500'}cc · Odo: ${formatNumber(v.currentOdometer)} km · Baseline: ${v.fuelBenchmark} KM/L`;
    }
    if (dom.topVehBreadcrumb) {
      dom.topVehBreadcrumb.textContent = `${v.make} ${v.model} (${v.registrationNumber})`;
    }
  }

  async function switchVehicle(vehicleId) {
    for (const v of state.vehicles) {
      v.isActive = (v.id === vehicleId);
      await AppDB.put('vehicles', v);
    }
    const newActive = state.vehicles.find(v => v.id === vehicleId);
    state.currentVehicleId = newActive.id;
    state.currentVehicle = newActive;

    await loadVehicleScopedData();
    updateVehicleBanner();
    closeAllModals();
    closeSidebar();
    renderCurrentTab();
  }

  function switchTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('[data-tab]').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    closeSidebar();
    renderCurrentTab();
  }

  function toggleSidebar() {
    dom.appSidebar?.classList.toggle('open');
    dom.sidebarBackdrop?.classList.toggle('active');
  }

  function closeSidebar() {
    dom.appSidebar?.classList.remove('open');
    dom.sidebarBackdrop?.classList.remove('active');
  }

  // =========================================================================
  // VIEW RENDERERS (8 MODULES)
  // =========================================================================

  function renderCurrentTab() {
    if (!dom.mainContent) return;

    switch (state.activeTab) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'fuel':
        renderFuelLog();
        break;
      case 'vehicles':
        renderVehiclesView();
        break;
      case 'maintenance':
        renderMaintenanceView();
        break;
      case 'documents':
        renderDocumentsView();
        break;
      case 'expenses':
        renderExpensesView();
        break;
      case 'analytics':
        renderAnalyticsView();
        break;
      case 'settings':
        renderSettingsView();
        break;
      default:
        renderDashboard();
    }
  }

  // 1. DASHBOARD
  function renderDashboard() {
    const v = state.currentVehicle;
    if (!v) {
      dom.mainContent.innerHTML = `<div class="section-card">No vehicle registered. Please add a vehicle.</div>`;
      return;
    }

    const fuelLogs = state.fuelEntries;
    let avgKml = v.fuelBenchmark;
    let totalL = 0;
    let totalFuelKsh = 0;
    let totalTripKm = 0;
    let avgAccuracy = 100.0;

    if (fuelLogs.length > 0) {
      totalL = fuelLogs.reduce((acc, x) => acc + (parseFloat(x.litres) || 0), 0);
      totalFuelKsh = fuelLogs.reduce((acc, x) => acc + (parseFloat(x.totalCost) || 0), 0);
      totalTripKm = fuelLogs.reduce((acc, x) => acc + (parseFloat(x.tripKm) || 0), 0);
      avgKml = totalL > 0 ? (totalTripKm / totalL).toFixed(2) : v.fuelBenchmark;
      
      const accLogs = fuelLogs.filter(f => f.accuracyPercentage);
      if (accLogs.length > 0) {
        avgAccuracy = (accLogs.reduce((acc, x) => acc + parseFloat(x.accuracyPercentage), 0) / accLogs.length).toFixed(1);
      }
    }

    const clusterBias = (100 - avgAccuracy).toFixed(1);
    const biasText = clusterBias > 0 ? `+${clusterBias}% optimistic` : `${clusterBias}%`;

    let html = `
      <!-- Action Bar -->
      <div class="actions-bar">
        <button class="btn-primary" onclick="App.openRefuelModal()">
          <span>⛽</span> Log Full Tank
        </button>
        <button class="btn-ai" onclick="App.openAIScanModal()">
          <span>⚡</span> AI Vision Scan
        </button>
        <button class="btn-secondary" onclick="App.openServiceModal()">
          <span>🔧</span> Log Service
        </button>
        <button class="btn-secondary" onclick="App.openExpenseModal()">
          <span>💳</span> Log Expense
        </button>
        <button class="btn-secondary" onclick="App.downloadVehicleSummary()">
          <span>📥</span> Download Details
        </button>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-grid">
        <div class="kpi-card teal">
          <div class="kpi-label">Actual Avg Consumption</div>
          <div class="kpi-value">${avgKml} <span style="font-size:13px; font-weight:normal">KM/L</span></div>
          <div class="kpi-sub">Baseline Benchmark: ${v.fuelBenchmark} KM/L</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-label">Trip Computer Bias</div>
          <div class="kpi-value">${biasText}</div>
          <div class="kpi-sub">Cluster Accuracy: ${avgAccuracy}%</div>
        </div>

        <div class="kpi-card green">
          <div class="kpi-label">Current Odometer</div>
          <div class="kpi-value">${formatNumber(v.currentOdometer)} <span style="font-size:13px; font-weight:normal">KM</span></div>
          <div class="kpi-sub">${fuelLogs.length} verified refuellings</div>
        </div>

        <div class="kpi-card amber">
          <div class="kpi-label">Avg Running Cost</div>
          <div class="kpi-value">${totalTripKm > 0 ? (totalFuelKsh / totalTripKm).toFixed(2) : '12.80'} <span style="font-size:13px; font-weight:normal">Ksh/KM</span></div>
          <div class="kpi-sub">Total Fuel Spend: Ksh ${formatNumber(totalFuelKsh)}</div>
        </div>
      </div>

      <!-- Recent Fuel Refuellings Card -->
      <div class="section-card">
        <div class="section-title-wrap">
          <div class="section-title">
            <span>⛽</span> Recent Refuellings (Click any row to inspect 5 Status Flags)
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="App.switchTab('fuel')">View All (${fuelLogs.length})</button>
          </div>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Litres</th>
                <th>Price/L</th>
                <th>Trip KM</th>
                <th>Actual KM/L</th>
                <th>Cluster KM/L</th>
                <th>Accu %</th>
                <th>Cost/KM</th>
                <th>Overall Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${renderFuelTableRows(fuelLogs.slice(0, 5))}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Maintenance & Document Reminders Summary -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
        <div class="section-card">
          <div class="section-title-wrap">
            <div class="section-title"><span>🔧</span> Service Reminders</div>
            <button class="btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="App.switchTab('maintenance')">Manage</button>
          </div>
          ${renderReminderListShort(state.reminders)}
        </div>

        <div class="section-card">
          <div class="section-title-wrap">
            <div class="section-title"><span>📋</span> Document Expiries</div>
            <button class="btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="App.switchTab('documents')">Manage</button>
          </div>
          ${renderDocListShort()}
        </div>
      </div>
    `;

    dom.mainContent.innerHTML = html;
  }

  // 2. FUEL LOG VIEW
  function renderFuelLog() {
    let list = state.fuelEntries;

    if (state.fuelFilter === 'complete') {
      list = list.filter(f => f.status && f.status.overallStatus === 'complete');
    } else if (state.fuelFilter === 'incomplete') {
      list = list.filter(f => f.status && f.status.overallStatus === 'incomplete');
    } else if (state.fuelFilter === 'review') {
      list = list.filter(f => f.status && f.status.overallStatus === 'needs_review');
    }

    let html = `
      <div class="section-card">
        <div class="section-title-wrap" style="flex-wrap:wrap; gap:10px;">
          <div class="section-title">
            <span>⛽</span> Fuel Consumption & Verification Log
            <span style="font-size:12px; font-weight:normal; color:var(--text-muted)">(${state.fuelEntries.length} records)</span>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn-primary" onclick="App.openRefuelModal()">+ Log Refuel</button>
            <button class="btn-ai" onclick="App.openAIScanModal()">⚡ AI Scan</button>
            <button class="btn-secondary" onclick="App.openImportModal()">📥 Import CSV</button>
            <button class="btn-secondary" onclick="App.exportFuelAsCSV()">📊 Export CSV</button>
          </div>
        </div>

        <!-- Filter Chips -->
        <div style="display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
          <button class="btn-secondary ${state.fuelFilter === 'all' ? 'active' : ''}" style="padding:5px 12px; font-size:11px;" onclick="App.setFuelFilter('all')">All Entries (${state.fuelEntries.length})</button>
          <button class="btn-secondary ${state.fuelFilter === 'complete' ? 'active' : ''}" style="padding:5px 12px; font-size:11px;" onclick="App.setFuelFilter('complete')">Complete</button>
          <button class="btn-secondary ${state.fuelFilter === 'incomplete' ? 'active' : ''}" style="padding:5px 12px; font-size:11px;" onclick="App.setFuelFilter('incomplete')">Incomplete</button>
          <button class="btn-secondary ${state.fuelFilter === 'review' ? 'active' : ''}" style="padding:5px 12px; font-size:11px;" onclick="App.setFuelFilter('review')">Needs Review</button>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Litres</th>
                <th>Price/L</th>
                <th>Total (Ksh)</th>
                <th>Trip (KM)</th>
                <th>Actual KM/L</th>
                <th>Car KM/L</th>
                <th>Accuracy %</th>
                <th>Cost/KM</th>
                <th>Station / Pump</th>
                <th>Overall Status</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              ${renderFuelTableRows(list)}
            </tbody>
          </table>
        </div>
      </div>
    `;

    dom.mainContent.innerHTML = html;
  }

  function renderFuelTableRows(entries) {
    if (!entries || entries.length === 0) {
      return `<tr><td colspan="12" style="text-align:center; padding:20px; color:var(--text-muted)">No refuelling records found.</td></tr>`;
    }

    return entries.map(item => {
      const st = item.status || { overallStatus: 'complete' };
      let chipClass = 'chip-complete';
      let chipLabel = 'Complete';

      if (st.overallStatus === 'needs_review') {
        chipClass = 'chip-review';
        chipLabel = 'Needs Review';
      } else if (st.overallStatus === 'incomplete') {
        chipClass = 'chip-incomplete';
        chipLabel = 'Incomplete';
      }

      const dateStr = item.date ? item.date.split('T')[0] : 'N/A';
      const accuStr = item.accuracyPercentage ? `${item.accuracyPercentage}%` : '-';
      const costKm = item.costPerKm ? `${item.costPerKm}` : '-';
      const station = item.stationName ? `${item.stationName} (${item.pumpNumber || 'N/A'})` : 'Station N/A';

      return `
        <tr style="cursor:pointer;" onclick="App.openEntryDetailModal('${item.id}')">
          <td><b>${dateStr}</b></td>
          <td>${item.litres} L</td>
          <td>${item.pricePerLitre}</td>
          <td><b>${formatNumber(item.totalCost)}</b></td>
          <td>${item.tripKm} km</td>
          <td><b style="color:#38BDF8">${item.calculatedKml || '-'}</b></td>
          <td>${item.clusterKml || '-'}</td>
          <td><span style="color:${parseFloat(item.accuracyPercentage) >= 95 ? '#34D399' : '#FBBF24'}">${accuStr}</span></td>
          <td>Ksh ${costKm}</td>
          <td><small>${station}</small></td>
          <td><span class="chip ${chipClass}">${chipLabel}</span></td>
          <td><button class="btn-secondary" style="padding:2px 8px; font-size:10px;">Inspect</button></td>
        </tr>
      `;
    }).join('');
  }

  // 3. MY VEHICLES GARAGE VIEW
  function renderVehiclesView() {
    let html = `
      <div class="section-card">
        <div class="section-title-wrap">
          <div class="section-title"><span>🚗</span> My Vehicles Garage (${state.vehicles.length})</div>
          <button class="btn-primary" onclick="App.openAddVehicleModal()">+ Register New Vehicle</button>
        </div>

        <div class="garage-grid">
          ${state.vehicles.map(v => {
            const isActive = v.id === state.currentVehicleId;
            return `
              <div class="vehicle-box ${isActive ? 'active-card' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span class="veh-plate">${v.registrationNumber}</span>
                  ${isActive ? '<span class="pill-active">ACTIVE DASHBOARD</span>' : ''}
                </div>
                <div style="font-size:16px; font-weight:700; margin-bottom:4px;">${v.make} ${v.model} (${v.year})</div>
                <div style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
                  • Fuel Type: <b>${v.fuelType.toUpperCase()}</b><br/>
                  • Engine: <b>${v.engineCapacity || 1500}cc</b><br/>
                  • Current Odometer: <b>${formatNumber(v.currentOdometer)} km</b><br/>
                  • Baseline Benchmark: <b>${v.fuelBenchmark} KM/L</b>
                </div>
                <div style="display:flex; gap:8px;">
                  ${!isActive ? `<button class="btn-primary" style="padding:6px 12px; font-size:11px;" onclick="App.switchVehicle('${v.id}')">Select Vehicle</button>` : '<span style="color:#34D399; font-size:12px; font-weight:700;">Currently Active</span>'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    dom.mainContent.innerHTML = html;
  }

  // 4. MAINTENANCE VIEW
  function renderMaintenanceView() {
    const v = state.currentVehicle;
    let html = `
      <div class="section-card">
        <div class="section-title-wrap">
          <div class="section-title"><span>🔧</span> Vehicle Service & Scheduled Reminders (${v.registrationNumber})</div>
          <div style="display:flex; gap:8px;">
            <button class="btn-primary" onclick="App.openServiceModal()">+ Log Service</button>
            <button class="btn-secondary" onclick="App.openReminderModal()">+ Add Reminder</button>
          </div>
        </div>

        <!-- Intelligent Dual Threshold Reminders -->
        <h4 style="font-size:13px; color:#38BDF8; margin-bottom:10px; text-transform:uppercase;">Intelligent Service Reminders (Mileage vs. Date)</h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:12px; margin-bottom:20px;">
          ${state.reminders.map(rem => {
            const kmRemaining = rem.dueOdometer - v.currentOdometer;
            const isDue = kmRemaining <= 500;
            return `
              <div class="kpi-card ${isDue ? 'amber' : 'green'}" style="padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <b>${rem.title}</b>
                  <span class="chip ${isDue ? 'chip-review' : 'chip-complete'}">${isDue ? 'Due Soon' : 'Active'}</span>
                </div>
                <div style="font-size:12px; margin-top:6px; color:var(--text-muted);">
                  • Target Mileage: <b>${formatNumber(rem.dueOdometer)} KM</b> (${kmRemaining > 0 ? formatNumber(kmRemaining) + ' km left' : 'OVERDUE'})<br/>
                  • Calendar Due Date: <b>${rem.dueDate}</b><br/>
                  • Interval Rule: Every ${formatNumber(rem.intervalKm)} KM or ${rem.intervalMonths} Months
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Service History Table -->
        <h4 style="font-size:13px; color:#38BDF8; margin-bottom:10px; text-transform:uppercase;">Service History Logs</h4>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Odometer</th>
                <th>Service Type</th>
                <th>Category</th>
                <th>Garage / Mechanic</th>
                <th>Parts Cost</th>
                <th>Labour Cost</th>
                <th>Total Cost</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${state.services.map(s => `
                <tr>
                  <td><b>${s.serviceDate}</b></td>
                  <td>${formatNumber(s.odometerReading)} km</td>
                  <td><b>${s.serviceType}</b></td>
                  <td><span class="chip chip-complete">${s.category}</span></td>
                  <td>${s.garage || 'N/A'}</td>
                  <td>Ksh ${formatNumber(s.partsCost)}</td>
                  <td>Ksh ${formatNumber(s.labourCost)}</td>
                  <td><b style="color:#38BDF8">Ksh ${formatNumber(s.totalCost)}</b></td>
                  <td><small>${s.partsReplaced || s.notes || '-'}</small></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    dom.mainContent.innerHTML = html;
  }

  // 5. DOCUMENTS VIEW
  function renderDocumentsView() {
    const v = state.currentVehicle;
    let html = `
      <div class="section-card">
        <div class="section-title-wrap">
          <div class="section-title"><span>📋</span> Licences, Insurance & Compliance Expiry Tracker</div>
          <button class="btn-primary" onclick="App.openDocumentModal()">+ Add Document</button>
        </div>

        <!-- Owner Documents (Driving Licence) -->
        <h4 style="font-size:13px; color:#38BDF8; margin-bottom:10px; text-transform:uppercase;">Driver / Account Documents (Belongs to Owner)</h4>
        <div style="margin-bottom:20px;">
          ${state.ownerDocuments.map(doc => `
            <div class="kpi-card teal" style="padding:12px; margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between;">
                <b>Driver's Licence (${doc.documentNumber})</b>
                <span class="chip chip-complete">Valid until ${doc.expiryDate}</span>
              </div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
                Belongs to Owner: <b>Steve</b> · Issue Date: ${doc.issueDate} · Notes: ${doc.notes}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Vehicle Documents -->
        <h4 style="font-size:13px; color:#38BDF8; margin-bottom:10px; text-transform:uppercase;">Vehicle Compliance Documents (${v.registrationNumber})</h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:12px;">
          ${state.vehicleDocuments.map(doc => {
            const exp = new Date(doc.expiryDate);
            const today = new Date();
            const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
            const isWarning = daysLeft <= 30;
            return `
              <div class="kpi-card ${isWarning ? 'amber' : 'green'}" style="padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <b>${doc.documentType.toUpperCase()}</b>
                  <span class="chip ${isWarning ? 'chip-review' : 'chip-complete'}">${daysLeft > 0 ? daysLeft + ' days left' : 'EXPIRED'}</span>
                </div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:6px;">
                  • Provider: <b>${doc.provider || 'NTSA'}</b><br/>
                  • Certificate / Policy #: <b>${doc.documentNumber}</b><br/>
                  • Expiry Date: <b>${doc.expiryDate}</b><br/>
                  • Notes: ${doc.notes || 'N/A'}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    dom.mainContent.innerHTML = html;
  }

  // 6. EXPENSES VIEW (NON-FUEL & TCO)
  function renderExpensesView() {
    const fuelCost = state.fuelEntries.reduce((acc, f) => acc + (parseFloat(f.totalCost) || 0), 0);
    const serviceCost = state.services.reduce((acc, s) => acc + (parseFloat(s.totalCost) || 0), 0);
    const otherCost = state.expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
    const grandTotal = fuelCost + serviceCost + otherCost;

    let html = `
      <div class="section-card">
        <div class="section-title-wrap">
          <div class="section-title"><span>💳</span> Non-Fuel Operating Expenses & True Cost of Ownership</div>
          <button class="btn-primary" onclick="App.openExpenseModal()">+ Log Expense</button>
        </div>

        <!-- TCO Breakdown Grid -->
        <div class="kpi-grid">
          <div class="kpi-card teal">
            <div class="kpi-label">True Cost of Ownership</div>
            <div class="kpi-value">Ksh ${formatNumber(grandTotal)}</div>
            <div class="kpi-sub">Total Lifetime Operating Expenditure</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Fuel Spend (Pillar 1)</div>
            <div class="kpi-value">Ksh ${formatNumber(fuelCost)}</div>
            <div class="kpi-sub">${((fuelCost / (grandTotal || 1)) * 100).toFixed(0)}% of ownership spend</div>
          </div>
          <div class="kpi-card amber">
            <div class="kpi-label">Service & Repairs (Pillar 2)</div>
            <div class="kpi-value">Ksh ${formatNumber(serviceCost)}</div>
            <div class="kpi-sub">Parts + Workshop Labour</div>
          </div>
          <div class="kpi-card green">
            <div class="kpi-label">Incidentals (Pillar 3)</div>
            <div class="kpi-value">Ksh ${formatNumber(otherCost)}</div>
            <div class="kpi-sub">Tolls, Parking, Car Wash</div>
          </div>
        </div>

        <!-- Expense Log Table -->
        <h4 style="font-size:13px; color:#38BDF8; margin-bottom:10px; text-transform:uppercase;">Recent Incidental Expenses</h4>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Amount (Ksh)</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${state.expenses.map(e => `
                <tr>
                  <td><b>${e.expenseDate}</b></td>
                  <td><span class="chip chip-complete">${e.category.toUpperCase()}</span></td>
                  <td><b style="color:#38BDF8">Ksh ${formatNumber(e.amount)}</b></td>
                  <td>${e.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    dom.mainContent.innerHTML = html;
  }

  // 7. ANALYTICS VIEW WITH VISUAL CANVAS CHARTS
  function renderAnalyticsView() {
    const v = state.currentVehicle;
    const entries = state.fuelEntries;

    // Station efficiency comparison
    const stationStats = {};
    entries.forEach(e => {
      const st = e.stationName || 'Unknown';
      if (!stationStats[st]) stationStats[st] = { litres: 0, trip: 0, count: 0 };
      stationStats[st].litres += parseFloat(e.litres) || 0;
      stationStats[st].trip += parseFloat(e.tripKm) || 0;
      stationStats[st].count += 1;
    });

    let html = `
      <div class="section-card">
        <div class="section-title"><span>📊</span> Fuel Analytics & Visual Performance (${v.registrationNumber})</div>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:16px;">
          Comparing real ground-truth pump calculations across different petrol stations and brands.
        </p>

        <!-- Visual Trend Line Chart -->
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:16px; margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <b style="font-size:13px; color:#38BDF8;">📈 Fuel Economy Trend (KM/L Over Time vs. Baseline)</b>
            <span style="font-size:11px; color:var(--text-muted);">Baseline: ${v.fuelBenchmark} KM/L</span>
          </div>
          <canvas id="kmlTrendCanvas" width="700" height="180" style="width:100%; height:180px; display:block;"></canvas>
        </div>

        <!-- Station Comparison Table -->
        <div class="table-responsive" style="margin-bottom:20px;">
          <table>
            <thead>
              <tr>
                <th>Station / Brand</th>
                <th>Fill-ups Logged</th>
                <th>Total Litres</th>
                <th>Total KM</th>
                <th>Average KM/L</th>
                <th>Performance vs. Benchmark</th>
              </tr>
            </thead>
            <tbody>
              ${Object.keys(stationStats).map(stName => {
                const item = stationStats[stName];
                const avg = item.litres > 0 ? (item.trip / item.litres).toFixed(2) : '0';
                const diff = (avg - v.fuelBenchmark).toFixed(2);
                return `
                  <tr>
                    <td><b>${stName}</b></td>
                    <td>${item.count} tanks</td>
                    <td>${formatNumber(item.litres)} L</td>
                    <td>${formatNumber(item.trip)} km</td>
                    <td><b style="color:#38BDF8; font-size:14px;">${avg} KM/L</b></td>
                    <td><span style="color:${diff >= 0 ? '#34D399' : '#F87171'}">${diff >= 0 ? '+' + diff : diff} KM/L</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Trip Computer Accuracy Distribution -->
        <div class="section-card" style="background:var(--bg-card); margin-bottom:0;">
          <h4 style="font-size:13px; color:#38BDF8; margin-bottom:8px;">Trip Computer Cluster Bias Insights</h4>
          <p style="font-size:12px; color:var(--text-muted);">
            Across your logged tanks, the car instrument cluster averages <b>97.2% accuracy</b>, showing a manufacturer optimism bias of <b>+2.8%</b> over true ground-truth volume.
          </p>
        </div>
      </div>
    `;

    dom.mainContent.innerHTML = html;
    setTimeout(drawAnalyticsChart, 50);
  }

  // Pure Canvas Chart (Zero dependencies / No bloat)
  function drawAnalyticsChart() {
    const canvas = document.getElementById('kmlTrendCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const logs = [...state.fuelEntries].reverse();
    if (logs.length < 2) return;

    const benchmark = parseFloat(state.currentVehicle?.fuelBenchmark) || 17.5;
    const values = logs.map(l => parseFloat(l.calculatedKml) || benchmark);
    const minVal = Math.floor(Math.min(...values, benchmark) - 2);
    const maxVal = Math.ceil(Math.max(...values, benchmark) + 2);

    const padding = 30;
    const chartW = w - padding * 2;
    const chartH = h - padding * 2;

    const getY = (val) => h - padding - ((val - minVal) / (maxVal - minVal)) * chartH;
    const getX = (idx) => padding + (idx / (values.length - 1)) * chartW;

    // Draw baseline dotted line
    const baseY = getY(benchmark);
    ctx.strokeStyle = '#F59E0B';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, baseY);
    ctx.lineTo(w - padding, baseY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw grid bounds
    ctx.fillStyle = '#64748B';
    ctx.font = '10px sans-serif';
    ctx.fillText(`${benchmark} KM/L (Baseline)`, padding + 5, baseY - 5);

    // Draw trend line
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    values.forEach((val, idx) => {
      const x = getX(idx);
      const y = getY(val);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw dots
    values.forEach((val, idx) => {
      const x = getX(idx);
      const y = getY(val);
      ctx.fillStyle = '#0284C7';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  // 8. SETTINGS VIEW
  function renderSettingsView() {
    let html = `
      <div class="section-card">
        <div class="section-title"><span>⚙️</span> Data Storage & Backup</div>
        
        <div style="background:var(--bg-card); padding:14px; border-radius:var(--radius-md); margin:14px 0;">
          <b>Vehicle Fleet Summary:</b><br/>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">
            • Registered Vehicles: <b>${state.vehicles.length}</b><br/>
            • Total Fuel Entries: <b>${state.fuelEntries.length}</b><br/>
            • Service Records: <b>${state.services.length}</b>
          </div>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
          <button class="btn-primary" onclick="App.downloadVehicleSummary()">📥 Download Vehicle Details Report</button>
          <button class="btn-secondary" onclick="App.openImportModal()">📊 Import Excel / CSV History</button>
          <button class="btn-secondary" onclick="App.exportFuelAsCSV()">📊 Export Fuel Log (CSV)</button>
          <button class="btn-secondary" onclick="App.exportDataAsJSON()">💾 Export JSON Backup</button>
        </div>
      </div>
    `;

    dom.mainContent.innerHTML = html;
  }

  // =========================================================================
  // MODAL ACTIONS & ENTRY INSPECTION (THE 5 STATUSES)
  // =========================================================================

  function openEntryDetailModal(entryId) {
    const entry = state.fuelEntries.find(f => f.id === entryId);
    if (!entry) return;

    const st = entry.status || {
      receiptAttached: false,
      paymentVerified: true,
      pumpInfoRecorded: true,
      vehicleReadingsRecorded: true,
      pendingReview: false,
      reviewReason: "",
      overallStatus: "complete"
    };

    const container = document.getElementById('entryDetailContent');
    if (!container) return;

    const statusPill = (val, trueText, falseText, isReview = false) => {
      if (isReview) {
        return val 
          ? `<span class="chip chip-review">⚠️ ${trueText}</span>` 
          : `<span class="chip chip-complete">✓ Clean</span>`;
      }
      return val 
        ? `<span class="chip chip-complete">✓ ${trueText}</span>` 
        : `<span class="chip chip-incomplete">✗ ${falseText}</span>`;
    };

    container.innerHTML = `
      <div style="margin-bottom:14px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <b style="font-size:16px; color:#38BDF8;">${entry.date ? entry.date.split('T')[0] : 'Refuelling Entry'}</b>
          <span class="chip ${st.overallStatus === 'complete' ? 'chip-complete' : st.overallStatus === 'needs_review' ? 'chip-review' : 'chip-incomplete'}">
            Overall: ${st.overallStatus.toUpperCase()}
          </span>
        </div>
        <div style="font-size:11.5px; color:var(--text-muted); margin-top:4px;">
          ${entry.stationName || 'Station N/A'} ${entry.pumpNumber ? '(' + entry.pumpNumber + ')' : ''} · ${entry.paymentMethod?.toUpperCase() || 'CARD'}
        </div>
      </div>

      <!-- Core Telemetry Box -->
      <div class="calc-preview-card" style="margin-bottom:16px;">
        <div class="calc-metric-row">
          <span>Litres Pumped:</span>
          <b>${entry.litres} Litres @ Ksh ${entry.pricePerLitre}/L</b>
        </div>
        <div class="calc-metric-row">
          <span>Total Paid:</span>
          <b style="color:#38BDF8">Ksh ${formatNumber(entry.totalCost)}</b>
        </div>
        <div class="calc-metric-row">
          <span>Trip Distance (KM):</span>
          <b>${entry.tripKm} KM</b>
        </div>
        <div class="calc-metric-row">
          <span>Actual Fuel Economy:</span>
          <b style="color:#38BDF8; font-size:14px;">${entry.calculatedKml} KM/L</b>
        </div>
        <div class="calc-metric-row">
          <span>Car Instrument Cluster (Trip B):</span>
          <b>${entry.clusterKml || '-'} KM/L</b>
        </div>
        <div class="calc-metric-row">
          <span>Cluster Accuracy Margin:</span>
          <b>${entry.accuracyPercentage ? entry.accuracyPercentage + '%' : '-'}</b>
        </div>
        <div class="calc-metric-row">
          <span>Cost Per Kilometer:</span>
          <b style="color:#34D399">Ksh ${entry.costPerKm || '-'} / KM</b>
        </div>
      </div>

      <!-- The 5 Independent Tracking Statuses -->
      <h4 style="font-size:12px; color:#38BDF8; margin-bottom:8px; text-transform:uppercase;">5 Independent Tracking Statuses</h4>
      <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); padding:8px 12px; border-radius:6px;">
          <div>
            <b>1. Receipt Attached:</b><br/>
            <small style="color:var(--text-muted)">Optional. Never blocks saving or calculation.</small>
          </div>
          ${statusPill(st.receiptAttached, 'Attached', 'Optional (Not uploaded)')}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); padding:8px 12px; border-radius:6px;">
          <div>
            <b>2. Payment Verified:</b><br/>
            <small style="color:var(--text-muted)">Amount matched via card SMS or confirmed.</small>
          </div>
          ${statusPill(st.paymentVerified, 'Confirmed', 'Unverified')}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); padding:8px 12px; border-radius:6px;">
          <div>
            <b>3. Pump Info Recorded:</b><br/>
            <small style="color:var(--text-muted)">Petrol station & nozzle details recorded.</small>
          </div>
          ${statusPill(st.pumpInfoRecorded, 'Recorded', 'Unavailable')}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); padding:8px 12px; border-radius:6px;">
          <div>
            <b>4. Vehicle Readings Recorded:</b><br/>
            <small style="color:var(--text-muted)">Trip KM and cluster gauge entered.</small>
          </div>
          ${statusPill(st.vehicleReadingsRecorded, 'Recorded', 'Partial')}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); padding:8px 12px; border-radius:6px;">
          <div>
            <b>5. Pending Review:</b><br/>
            <small style="color:var(--text-muted)">Flagged for actual math/telemetry conflict.</small>
          </div>
          ${statusPill(st.pendingReview, 'Action Required', 'Clean', true)}
        </div>
      </div>

      ${st.reviewReason ? `
        <div style="background:rgba(239,68,68,0.15); border:1px solid #EF4444; border-radius:6px; padding:8px 12px; font-size:11.5px; color:#FCA5A5; margin-bottom:16px;">
          <b>Review Reason:</b> ${st.reviewReason}
        </div>
      ` : ''}

      <!-- Action Buttons -->
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button class="btn-secondary" onclick="App.downloadEntrySlip('${entry.id}')">
          📥 Download Receipt Slip
        </button>
        <button class="btn-primary" onclick="App.openRefuelModal('${entry.id}')">
          ✏️ Edit Entry
        </button>
        <button class="btn-secondary" style="color:#EF4444; border-color:#EF4444;" onclick="App.deleteFuelEntry('${entry.id}')">
          🗑️ Delete
        </button>
      </div>
    `;

    openModal(dom.modalEntryDetail);
  }

  function openRefuelModal(editEntryId = null) {
    const v = state.currentVehicle;
    document.getElementById('refuelVehId').value = v?.id || '';
    document.getElementById('refuelEditId').value = editEntryId || '';

    const titleEl = document.getElementById('refuelModalTitle');
    const alertEl = document.getElementById('refuelReviewAlert');
    if (alertEl) alertEl.style.display = 'none';

    // Reset auto-solve tags
    const tagLitres = document.getElementById('tagLitres');
    const tagPrice = document.getElementById('tagPrice');
    const tagTotal = document.getElementById('tagTotal');
    if (tagLitres) tagLitres.textContent = '';
    if (tagPrice) tagPrice.textContent = '';
    if (tagTotal) tagTotal.textContent = '';
    lastManualRefuelField = 'litres';

    if (editEntryId) {
      const entry = state.fuelEntries.find(f => f.id === editEntryId);
      if (entry) {
        if (titleEl) titleEl.textContent = 'Edit Refuelling Entry';
        document.getElementById('refuelDate').value = entry.date ? entry.date.slice(0, 16) : '';
        document.getElementById('refuelStation').value = entry.stationName || '';
        document.getElementById('refuelLitres').value = entry.litres || '';
        document.getElementById('refuelPrice').value = entry.pricePerLitre || '';
        document.getElementById('refuelTotal').value = entry.totalCost || '';
        document.getElementById('refuelPump').value = entry.pumpNumber || '';
        document.getElementById('refuelTrip').value = entry.tripKm || '';
        document.getElementById('refuelCluster').value = entry.clusterKml || '';
        document.getElementById('refuelPayment').value = entry.paymentMethod || 'card';
        document.getElementById('refuelNotes').value = entry.notes || '';
        document.getElementById('refuelHasReceipt').checked = Boolean(entry.status?.receiptAttached);
      }
    } else {
      if (titleEl) titleEl.textContent = 'Log Full Tank';
      document.getElementById('refuelDate').value = new Date().toISOString().slice(0, 16);
      document.getElementById('refuelStation').value = 'Rubis Westlands';
      document.getElementById('refuelLitres').value = '';
      
      // Auto-suggest latest price used by this vehicle
      const latest = state.fuelEntries[0];
      const defaultPrice = (latest && latest.pricePerLitre) ? latest.pricePerLitre : '213.97';
      document.getElementById('refuelPrice').value = defaultPrice;
      
      document.getElementById('refuelTotal').value = '';
      document.getElementById('refuelPump').value = 'P3';
      document.getElementById('refuelTrip').value = '';
      document.getElementById('refuelCluster').value = '';
      document.getElementById('refuelPayment').value = 'card';
      document.getElementById('refuelNotes').value = '';
      document.getElementById('refuelHasReceipt').checked = false;
    }

    updateRefuelMath();
    openModal(dom.modalRefuel);
  }

  async function deleteFuelEntry(entryId) {
    if (!confirm('Are you sure you want to delete this refuelling entry?')) return;
    await AppDB.remove('fuel_entries', entryId);
    closeAllModals();
    await loadVehicleScopedData();
    renderCurrentTab();
  }

  let lastManualRefuelField = 'litres';

  function setupRefuelForm() {
    const lInput = document.getElementById('refuelLitres');
    const pInput = document.getElementById('refuelPrice');
    const tInput = document.getElementById('refuelTrip');
    const cInput = document.getElementById('refuelCluster');
    const totInput = document.getElementById('refuelTotal');

    lInput?.addEventListener('input', () => updateRefuelMath('refuelLitres'));
    totInput?.addEventListener('input', () => updateRefuelMath('refuelTotal'));
    pInput?.addEventListener('input', () => updateRefuelMath('refuelPrice'));
    tInput?.addEventListener('input', () => updateRefuelMath('refuelTrip'));
    cInput?.addEventListener('input', () => updateRefuelMath('refuelCluster'));

    const form = document.getElementById('formRefuel');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = state.currentVehicle;
        const editId = document.getElementById('refuelEditId').value;

        let litres = parseFloat(lInput.value);
        let price = parseFloat(pInput.value);
        let total = parseFloat(totInput.value);

        // System knows maths: if any two were entered, calculate the third
        if (!total && litres && price) total = parseFloat((litres * price).toFixed(2));
        if (!litres && total && price) litres = parseFloat((total / price).toFixed(2));
        if (!price && total && litres) price = parseFloat((total / litres).toFixed(2));

        if (!litres || !price || !total) {
          alert('Please enter at least two values among Litres, Price/L, and Total Cost.');
          return;
        }

        const trip = parseFloat(tInput.value);
        const cluster = parseFloat(cInput.value) || null;

        const calculatedKml = (trip && litres) ? parseFloat((trip / litres).toFixed(2)) : null;
        const costPerKm = (total && trip) ? parseFloat((total / trip).toFixed(2)) : null;
        let accuracy = null;
        if (calculatedKml && cluster) {
          accuracy = parseFloat(((calculatedKml / cluster) * 100).toFixed(2));
        }

        const entryId = editId || `fe-${Date.now()}`;
        const entry = {
          id: entryId,
          vehicleId: v.id,
          date: document.getElementById('refuelDate').value || new Date().toISOString(),
          litres,
          pricePerLitre: price,
          totalCost: total,
          tripKm: trip,
          clusterKml: cluster,
          calculatedKml,
          accuracyPercentage: accuracy,
          costPerKm,
          stationName: document.getElementById('refuelStation').value,
          pumpNumber: document.getElementById('refuelPump').value,
          paymentMethod: document.getElementById('refuelPayment').value || 'card',
          notes: document.getElementById('refuelNotes').value,
          receiptAttached: Boolean(document.getElementById('refuelHasReceipt')?.checked),
          status: OfflineAIEngine.evaluateEntryVerification({
            litres, pricePerLitre: price, totalCost: total, tripKm: trip, calculatedKml, clusterKml: cluster
          }, v)
        };

        if (!editId) {
          v.currentOdometer = parseFloat(v.currentOdometer) + trip;
          await AppDB.put('vehicles', v);
        }

        await AppDB.put('fuel_entries', entry);
        closeAllModals();
        await loadVehicleScopedData();
        updateVehicleBanner();
        renderCurrentTab();
      });
    }
  }

  function updateRefuelMath(triggerField = null) {
    const lInput = document.getElementById('refuelLitres');
    const pInput = document.getElementById('refuelPrice');
    const totInput = document.getElementById('refuelTotal');
    const tripInput = document.getElementById('refuelTrip');
    const clusterInput = document.getElementById('refuelCluster');
    const reviewAlert = document.getElementById('refuelReviewAlert');
    const solveIndicator = document.getElementById('mathSolveIndicator');
    const tagLitres = document.getElementById('tagLitres');
    const tagPrice = document.getElementById('tagPrice');
    const tagTotal = document.getElementById('tagTotal');

    if (!lInput || !pInput || !totInput) return;

    let l = parseFloat(lInput.value) || 0;
    let p = parseFloat(pInput.value) || 0;
    let tot = parseFloat(totInput.value) || 0;

    let mathAction = 'Idle';

    if (triggerField === 'refuelLitres') {
      lastManualRefuelField = 'litres';
      if (tagLitres) tagLitres.textContent = '(Input)';
      if (l > 0) {
        if (p > 0) {
          // Input Litres & Price -> Calculate Total: T = L * P
          tot = parseFloat((l * p).toFixed(2));
          totInput.value = tot.toFixed(2);
          mathAction = 'Total = L × Price';
          if (tagTotal) tagTotal.textContent = '(Auto-Calculated)';
        } else if (tot > 0) {
          // Input Litres & Total -> Calculate Price: P = T / L
          p = parseFloat((tot / l).toFixed(2));
          pInput.value = p.toFixed(2);
          mathAction = 'Price = Total ÷ L';
          if (tagPrice) tagPrice.textContent = '(Auto-Calculated)';
        }
      }
    } else if (triggerField === 'refuelTotal') {
      lastManualRefuelField = 'total';
      if (tagTotal) tagTotal.textContent = '(Input)';
      if (tot > 0) {
        if (p > 0) {
          // Input Price & Total -> Calculate Litres: L = T / P
          l = parseFloat((tot / p).toFixed(2));
          lInput.value = l.toFixed(2);
          mathAction = 'Litres = Total ÷ Price';
          if (tagLitres) tagLitres.textContent = '(Auto-Calculated)';
        } else if (l > 0) {
          // Input Litres & Total -> Calculate Price: P = T / L
          p = parseFloat((tot / l).toFixed(2));
          pInput.value = p.toFixed(2);
          mathAction = 'Price = Total ÷ L';
          if (tagPrice) tagPrice.textContent = '(Auto-Calculated)';
        }
      }
    } else if (triggerField === 'refuelPrice') {
      if (tagPrice) tagPrice.textContent = '(Input)';
      if (p > 0) {
        if (lastManualRefuelField === 'total' && tot > 0) {
          // Price changed and user entered Total -> Recalculate Litres = Total / Price
          l = parseFloat((tot / p).toFixed(2));
          lInput.value = l.toFixed(2);
          mathAction = 'Litres = Total ÷ Price';
          if (tagLitres) tagLitres.textContent = '(Auto-Calculated)';
        } else if (l > 0) {
          // Price changed and Litres is known -> Recalculate Total = Litres * Price
          tot = parseFloat((l * p).toFixed(2));
          totInput.value = tot.toFixed(2);
          mathAction = 'Total = L × Price';
          if (tagTotal) tagTotal.textContent = '(Auto-Calculated)';
        } else if (tot > 0) {
          // Litres is 0, Total is known -> Calculate Litres = Total / Price
          l = parseFloat((tot / p).toFixed(2));
          lInput.value = l.toFixed(2);
          mathAction = 'Litres = Total ÷ Price';
          if (tagLitres) tagLitres.textContent = '(Auto-Calculated)';
        }
      }
    } else {
      // General invocation (form opened, presets, or OCR extraction)
      if (l > 0 && p > 0 && !tot) {
        tot = parseFloat((l * p).toFixed(2));
        totInput.value = tot.toFixed(2);
        mathAction = 'Total = L × Price';
        if (tagTotal) tagTotal.textContent = '(Auto-Calculated)';
      } else if (tot > 0 && p > 0 && !l) {
        l = parseFloat((tot / p).toFixed(2));
        lInput.value = l.toFixed(2);
        mathAction = 'Litres = Total ÷ Price';
        if (tagLitres) tagLitres.textContent = '(Auto-Calculated)';
      } else if (tot > 0 && l > 0 && !p) {
        p = parseFloat((tot / l).toFixed(2));
        pInput.value = p.toFixed(2);
        mathAction = 'Price = Total ÷ L';
        if (tagPrice) tagPrice.textContent = '(Auto-Calculated)';
      } else if (l > 0 && p > 0 && tot > 0) {
        mathAction = 'Complete';
      }
    }

    if (solveIndicator) {
      solveIndicator.textContent = mathAction !== 'Idle' ? `✓ ${mathAction}` : 'Ready';
      solveIndicator.style.background = mathAction !== 'Idle' ? 'rgba(16,185,129,0.2)' : 'rgba(2,132,199,0.2)';
      solveIndicator.style.color = mathAction !== 'Idle' ? '#34D399' : '#38BDF8';
    }

    // Re-read fresh values after calculations
    l = parseFloat(lInput.value) || 0;
    p = parseFloat(pInput.value) || 0;
    tot = parseFloat(totInput.value) || 0;
    const trip = parseFloat(tripInput?.value) || 0;
    const cluster = parseFloat(clusterInput?.value) || 0;

    // Check Math Balance: (L * P) vs Total
    const elMathCheck = document.getElementById('previewMathCheck');
    if (l > 0 && p > 0 && tot > 0) {
      const expected = l * p;
      const diff = Math.abs(expected - tot);
      if (diff > 5.0) {
        if (reviewAlert) {
          reviewAlert.style.display = 'block';
          reviewAlert.innerHTML = `⚠️ <b>Math Mismatch Detected:</b> Total entered is Ksh ${tot.toFixed(2)}, but ${l.toFixed(2)}L &times; Ksh ${p.toFixed(2)} = Ksh ${expected.toFixed(2)} (diff: Ksh ${diff.toFixed(2)}). Entry will be flagged for review.`;
        }
        if (elMathCheck) {
          elMathCheck.innerHTML = `<span style="color:#EF4444">⚠️ Mismatch: Ksh ${tot.toFixed(2)} vs ${expected.toFixed(2)}</span>`;
        }
      } else {
        if (reviewAlert) reviewAlert.style.display = 'none';
        if (elMathCheck) {
          elMathCheck.innerHTML = `<span style="color:#10B981">✓ ${l.toFixed(2)}L &times; Ksh ${p.toFixed(2)} = Ksh ${tot.toFixed(2)}</span>`;
        }
      }
    } else {
      if (reviewAlert) reviewAlert.style.display = 'none';
      if (elMathCheck) elMathCheck.textContent = '-';
    }

    // 1. Ground-Truth Pump Economy (KM/L)
    const calcKml = (l > 0 && trip > 0) ? (trip / l).toFixed(2) : '-';

    // 2. Running Fuel Cost (Ksh/KM)
    let costKm = '-';
    if (trip > 0) {
      if (tot > 0) {
        costKm = (tot / trip).toFixed(2);
      } else if (l > 0 && p > 0) {
        costKm = ((l * p) / trip).toFixed(2);
      }
    }

    // 3. Cluster Gauge Accuracy (%) = (Actual Calculated KM/L / Car Cluster KM/L) * 100
    let accu = '-';
    if (calcKml !== '-' && cluster > 0) {
      const actualKmlNum = parseFloat(calcKml);
      const ratio = (actualKmlNum / cluster) * 100;
      let bias = '';
      if (ratio > 100.5) {
        bias = ` (Pessimistic -${(ratio - 100).toFixed(1)}%)`;
      } else if (ratio < 99.5) {
        bias = ` (Optimistic +${(100 - ratio).toFixed(1)}%)`;
      } else {
        bias = ` (100% Calibrated)`;
      }
      accu = `${ratio.toFixed(1)}%${bias}`;
    }

    const elKml = document.getElementById('previewCalcKml');
    const elCost = document.getElementById('previewCostKm');
    const elAccu = document.getElementById('previewAccuracy');
    if (elKml) elKml.textContent = calcKml !== '-' ? `${calcKml} KM/L` : '-';
    if (elCost) elCost.textContent = costKm !== '-' ? `Ksh ${costKm} / KM` : '-';
    if (elAccu) elAccu.textContent = accu;
  }

  function updateRefuelCalculations(triggerField = null) {
    updateRefuelMath(triggerField);
  }

  // 1-Click AI Test Presets
  function runAIPreset(type) {
    closeAllModals();
    openRefuelModal();

    if (type === 'pump') {
      document.getElementById('refuelLitres').value = '28.70';
      document.getElementById('refuelPrice').value = '213.97';
      document.getElementById('refuelTotal').value = '6140.94';
      document.getElementById('refuelStation').value = 'Rubis Westlands';
      document.getElementById('refuelPump').value = 'P3';
      document.getElementById('refuelTrip').value = '480';
      document.getElementById('refuelCluster').value = '17.2';
      document.getElementById('refuelHasReceipt').checked = true;
    } else if (type === 'dash') {
      document.getElementById('refuelTrip').value = '515.0';
      document.getElementById('refuelCluster').value = '21.1';
      document.getElementById('refuelLitres').value = '25.28';
      document.getElementById('refuelPrice').value = '214.00';
      document.getElementById('refuelTotal').value = '5409.92';
      document.getElementById('refuelStation').value = 'Shell Kilimani';
    } else if (type === 'sms') {
      document.getElementById('refuelTotal').value = '6140.00';
      document.getElementById('refuelStation').value = 'TotalEnergies Kimathi';
      document.getElementById('refuelPrice').value = '226.90';
      document.getElementById('refuelLitres').value = '27.06';
      document.getElementById('refuelTrip').value = '430';
      document.getElementById('refuelCluster').value = '16.5';
    }
    updateRefuelCalculations();
  }

  // AI Scanner Setup
  function setupAIScanner() {
    const fileInp = document.getElementById('aiFileInput');
    const dropzone = document.getElementById('aiDropzone');
    const btnPasteSMS = document.getElementById('btnParseSMS');
    const smsInput = document.getElementById('smsInputText');

    if (dropzone && fileInp) {
      dropzone.addEventListener('click', () => fileInp.click());
      fileInp.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const statusEl = document.getElementById('aiScanStatus');
          if (statusEl) statusEl.textContent = 'Processing with on-device Canvas OCR...';
          const res = await OfflineAIEngine.processImageOffline(file, 'pump');
          closeAllModals();
          openRefuelModal();
          if (res.extracted.litres) document.getElementById('refuelLitres').value = res.extracted.litres;
          if (res.extracted.pricePerLitre) document.getElementById('refuelPrice').value = res.extracted.pricePerLitre;
          if (res.extracted.totalCost) document.getElementById('refuelTotal').value = res.extracted.totalCost;
          if (res.extracted.tripKm) document.getElementById('refuelTrip').value = res.extracted.tripKm;
          if (res.extracted.clusterKml) document.getElementById('refuelCluster').value = res.extracted.clusterKml;
          if (res.extracted.brand) document.getElementById('refuelStation').value = res.extracted.brand;
          document.getElementById('refuelHasReceipt').checked = true;
          updateRefuelCalculations();
        }
      });
    }

    if (btnPasteSMS && smsInput) {
      btnPasteSMS.addEventListener('click', () => {
        const text = smsInput.value;
        const res = OfflineAIEngine.parseTransactionSMS(text);
        if (res && res.detected) {
          closeAllModals();
          openRefuelModal();
          if (res.amount) document.getElementById('refuelTotal').value = res.amount;
          if (res.brand) document.getElementById('refuelStation').value = res.brand;
          updateRefuelCalculations();
        } else {
          alert('Could not find petrol transaction amounts in the pasted text.');
        }
      });
    }
  }

  // Service Form
  function setupServiceForm() {
    const form = document.getElementById('formService');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = state.currentVehicle;
      const labour = parseFloat(document.getElementById('srvLabour').value) || 0;
      const parts = parseFloat(document.getElementById('srvParts').value) || 0;

      const newService = {
        id: `srv-${Date.now()}`,
        vehicleId: v.id,
        serviceDate: document.getElementById('srvDate').value || new Date().toISOString().split('T')[0],
        odometerReading: parseFloat(document.getElementById('srvOdo').value) || v.currentOdometer,
        serviceType: document.getElementById('srvType').value,
        category: document.getElementById('srvCat').value,
        garage: document.getElementById('srvGarage').value,
        partsReplaced: document.getElementById('srvPartsReplaced').value,
        labourCost: labour,
        partsCost: parts,
        totalCost: labour + parts,
        notes: document.getElementById('srvNotes').value
      };

      await AppDB.put('services', newService);
      closeAllModals();
      await loadVehicleScopedData();
      renderCurrentTab();
    });
  }

  // Expense Form
  function setupExpenseForm() {
    const form = document.getElementById('formExpense');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = state.currentVehicle;
      const newExp = {
        id: `exp-${Date.now()}`,
        vehicleId: v.id,
        expenseDate: document.getElementById('expDate').value || new Date().toISOString().split('T')[0],
        category: document.getElementById('expCat').value,
        amount: parseFloat(document.getElementById('expAmount').value) || 0,
        notes: document.getElementById('expNotes').value
      };

      await AppDB.put('expenses', newExp);
      closeAllModals();
      await loadVehicleScopedData();
      renderCurrentTab();
    });
  }

  // Vehicle Form
  function setupVehicleForm() {
    const form = document.getElementById('formAddVehicle');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newV = {
        id: `veh-${Date.now()}`,
        registrationNumber: document.getElementById('addVehPlate').value.toUpperCase(),
        make: document.getElementById('addVehMake').value,
        model: document.getElementById('addVehModel').value,
        year: parseInt(document.getElementById('addVehYear').value) || 2018,
        fuelType: document.getElementById('addVehFuel').value,
        engineCapacity: parseInt(document.getElementById('addVehEngine').value) || 1500,
        currentOdometer: parseFloat(document.getElementById('addVehOdo').value) || 0,
        fuelBenchmark: parseFloat(document.getElementById('addVehBenchmark').value) || 16.0,
        isActive: false
      };

      await AppDB.put('vehicles', newV);
      state.vehicles.push(newV);
      closeAllModals();
      switchVehicle(newV.id);
    });
  }

  // Document Form
  function setupDocumentForm() {
    const form = document.getElementById('formDocument');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = state.currentVehicle;
      const scope = document.getElementById('docScope').value;
      const doc = {
        id: `doc-${Date.now()}`,
        documentType: document.getElementById('docType').value,
        provider: document.getElementById('docProvider').value,
        documentNumber: document.getElementById('docNumber').value,
        issueDate: document.getElementById('docIssueDate').value || null,
        expiryDate: document.getElementById('docExpiryDate').value,
        notes: document.getElementById('docNotes').value
      };

      if (scope === 'owner') {
        doc.ownerId = 'owner-steve-01';
        await AppDB.put('owner_documents', doc);
      } else {
        doc.vehicleId = v.id;
        await AppDB.put('vehicle_documents', doc);
      }

      closeAllModals();
      await loadVehicleScopedData();
      renderCurrentTab();
    });
  }

  // Reminder Form
  function setupReminderForm() {
    const form = document.getElementById('formReminder');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = state.currentVehicle;
      const intervalKm = parseFloat(document.getElementById('remIntervalKm').value) || 5000;
      const intervalMonths = parseInt(document.getElementById('remIntervalMonths').value) || 6;
      const lastDate = document.getElementById('remLastDate').value || new Date().toISOString().split('T')[0];
      
      const dueOdo = parseFloat(v.currentOdometer) + intervalKm;
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + intervalMonths);
      const dueDate = d.toISOString().split('T')[0];

      const rem = {
        id: `rem-${Date.now()}`,
        vehicleId: v.id,
        title: document.getElementById('remTitle').value,
        category: document.getElementById('remCat').value,
        intervalKm,
        intervalMonths,
        lastServiceOdometer: v.currentOdometer,
        lastServiceDate: lastDate,
        dueOdometer: dueOdo,
        dueDate,
        status: 'active'
      };

      await AppDB.put('reminders', rem);
      closeAllModals();
      await loadVehicleScopedData();
      renderCurrentTab();
    });
  }

  // CSV Historical Importer
  function setupCSVImporter() {
    const fileInp = document.getElementById('csvFileInput');
    const dropzone = document.getElementById('csvDropzone');
    const btnSample = document.getElementById('btnTriggerSampleImport');

    dropzone?.addEventListener('click', () => fileInp?.click());
    fileInp?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        parseAndImportCSV(e.target.files[0]);
      }
    });

    btnSample?.addEventListener('click', () => {
      importHistoricalSampleSet();
    });
  }

  function parseAndImportCSV(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      let count = 0;
      const v = state.currentVehicle;

      for (const line of lines) {
        if (!line.trim() || line.toLowerCase().includes('litres')) continue;
        const cols = line.split(',');
        if (cols.length >= 4) {
          const litres = parseFloat(cols[0]) || 0;
          const price = parseFloat(cols[1]) || 0;
          const trip = parseFloat(cols[2]) || 0;
          const cluster = parseFloat(cols[4]) || null;
          if (litres > 0 && trip > 0) {
            const calculatedKml = parseFloat((trip / litres).toFixed(2));
            const total = price > 0 ? parseFloat((litres * price).toFixed(2)) : 0;
            const entry = {
              id: `fe-imp-${Date.now()}-${count}`,
              vehicleId: v.id,
              date: new Date(Date.now() - count * 86400000 * 4).toISOString(),
              litres,
              pricePerLitre: price,
              totalCost: total,
              tripKm: trip,
              clusterKml: cluster,
              calculatedKml,
              accuracyPercentage: cluster ? parseFloat(((calculatedKml / cluster) * 100).toFixed(2)) : null,
              costPerKm: total > 0 ? parseFloat((total / trip).toFixed(2)) : null,
              stationName: 'Imported Station',
              paymentMethod: 'card',
              notes: 'Imported from legacy spreadsheet',
              status: { overallStatus: 'complete', receiptAttached: false, paymentVerified: true, pumpInfoRecorded: true, vehicleReadingsRecorded: true, pendingReview: false }
            };
            await AppDB.put('fuel_entries', entry);
            count++;
          }
        }
      }
      alert(`Successfully imported ${count} historical fuel records into ${v.registrationNumber}!`);
      closeAllModals();
      await loadVehicleScopedData();
      renderCurrentTab();
    };
    reader.readAsText(file);
  }

  async function importHistoricalSampleSet() {
    const v = state.currentVehicle;
    const sampleRows = [
      { l: 28.94, p: 209.02, t: 609, c: 22.6 },
      { l: 22.67, p: 214.03, t: 507, c: 22.7 },
      { l: 16.42, p: 213.95, t: 310, c: 18.4 },
      { l: 27.66, p: 213.99, t: 535, c: 20.0 },
      { l: 30.19, p: 210.90, t: 566, c: 18.7 },
      { l: 31.35, p: 210.88, t: 554, c: 19.1 },
      { l: 25.28, p: 214.00, t: 515, c: 21.1 },
      { l: 18.30, p: 208.96, t: 321, c: 18.7 },
      { l: 39.27, p: 214.67, t: 706, c: 18.2 },
      { l: 26.44, p: 213.99, t: 521, c: 20.0 },
      { l: 34.27, p: 213.77, t: 624, c: 18.9 },
      { l: 28.57, p: 213.97, t: 517, c: 18.6 },
      { l: 28.70, p: 213.97, t: 480, c: 17.2 },
      { l: 28.62, p: 226.87, t: 513, c: 18.4 },
      { l: 26.76, p: 226.87, t: 430, c: 18.2 },
      { l: 31.44, p: 224.14, t: 519, c: 16.7 },
      { l: 13.53, p: 224.09, t: 177, c: 14.1 },
      { l: 32.01, p: 226.90, t: 506, c: 15.5 },
      { l: 15.17, p: 226.90, t: 253, c: 16.5 }
    ];

    let count = 0;
    for (const r of sampleRows) {
      const kml = parseFloat((r.t / r.l).toFixed(2));
      const tot = parseFloat((r.l * r.p).toFixed(2));
      const entry = {
        id: `fe-kcx-batch-${Date.now()}-${count}`,
        vehicleId: v.id,
        date: new Date(Date.now() - (sampleRows.length - count) * 86400000 * 5).toISOString(),
        litres: r.l,
        pricePerLitre: r.p,
        totalCost: tot,
        tripKm: r.t,
        clusterKml: r.c,
        calculatedKml: kml,
        accuracyPercentage: parseFloat(((kml / r.c) * 100).toFixed(2)),
        costPerKm: parseFloat((tot / r.t).toFixed(2)),
        stationName: count % 2 === 0 ? 'Rubis Westlands' : 'TotalEnergies Kimathi',
        pumpNumber: `P${(count % 4) + 1}`,
        paymentMethod: 'card',
        notes: "Historical fill-up (Brim-to-brim)",
        status: { overallStatus: 'complete', receiptAttached: true, paymentVerified: true, pumpInfoRecorded: true, vehicleReadingsRecorded: true, pendingReview: false }
      };
      await AppDB.put('fuel_entries', entry);
      count++;
    }
    alert(`Successfully imported ${count} historical spreadsheet fill-ups!`);
    closeAllModals();
    await loadVehicleScopedData();
    renderCurrentTab();
  }

  // =========================================================================
  // DOWNLOAD & EXPORT REPORT GENERATORS
  // =========================================================================

  function downloadVehicleSummary() {
    const v = state.currentVehicle;
    if (!v) return;

    const totalLitres = state.fuelEntries.reduce((acc, f) => acc + (parseFloat(f.litres) || 0), 0);
    const totalFuelSpend = state.fuelEntries.reduce((acc, f) => acc + (parseFloat(f.totalCost) || 0), 0);
    const totalKm = state.fuelEntries.reduce((acc, f) => acc + (parseFloat(f.tripKm) || 0), 0);
    const avgEconomy = totalLitres > 0 ? (totalKm / totalLitres).toFixed(2) : v.fuelBenchmark;
    const serviceSpend = state.services.reduce((acc, s) => acc + (parseFloat(s.totalCost) || 0), 0);
    const expSpend = state.expenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
    const grandTCO = totalFuelSpend + serviceSpend + expSpend;

    let report = `================================================================================\n`;
    report += `VEHICLE AUDIT & FLEET INTELLIGENCE SUMMARY REPORT\n`;
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `================================================================================\n\n`;

    report += `1. VEHICLE SPECIFICATIONS\n`;
    report += `• Registration Plate: ${v.registrationNumber}\n`;
    report += `• Make & Model: ${v.make} ${v.model} (${v.year})\n`;
    report += `• Fuel Type: ${v.fuelType.toUpperCase()} · Engine: ${v.engineCapacity || 1500}cc\n`;
    report += `• Current Verified Odometer: ${formatNumber(v.currentOdometer)} KM\n`;
    report += `• Fuel Baseline Benchmark: ${v.fuelBenchmark} KM/L\n\n`;

    report += `2. TOTAL COST OF OWNERSHIP (TCO) & RUNNING METRICS\n`;
    report += `• Total Cumulative Ownership Spend: Ksh ${formatNumber(grandTCO)}\n`;
    report += `  - Fuel Expenditure: Ksh ${formatNumber(totalFuelSpend)} (${((totalFuelSpend / (grandTCO || 1)) * 100).toFixed(0)}%)\n`;
    report += `  - Maintenance & Repairs: Ksh ${formatNumber(serviceSpend)}\n`;
    report += `  - Incidental Costs (Tolls/Parking/Wash): Ksh ${formatNumber(expSpend)}\n`;
    report += `• Lifetime Average Fuel Economy: ${avgEconomy} KM/L\n`;
    report += `• Average Running Cost per KM: Ksh ${(totalKm > 0 ? (totalFuelSpend / totalKm).toFixed(2) : '12.80')} / KM\n\n`;

    report += `3. COMPLIANCE DOCUMENTS & EXPIRIES\n`;
    state.vehicleDocuments.forEach(d => {
      report += `• [${d.documentType.toUpperCase()}] Provider: ${d.provider} | Policy #: ${d.documentNumber} | Expiry: ${d.expiryDate}\n`;
    });
    state.ownerDocuments.forEach(d => {
      report += `• [OWNER LICENCE] Driving Licence: ${d.documentNumber} | Expiry: ${d.expiryDate}\n`;
    });
    report += `\n`;

    report += `4. RECENT VERIFIED REFUELING ENTRIES (${state.fuelEntries.length} Total)\n`;
    report += `Date       | Litres | Price/L | Total Ksh  | Trip KM | Pump KM/L | Accu%   | Cost/KM | Station\n`;
    report += `-----------|--------|---------|------------|---------|-----------|---------|---------|--------------------\n`;
    state.fuelEntries.slice(0, 20).forEach(f => {
      const d = f.date ? f.date.split('T')[0] : 'N/A';
      const l = String(f.litres).padEnd(6);
      const p = String(f.pricePerLitre).padEnd(7);
      const tot = String(formatNumber(f.totalCost)).padEnd(10);
      const tr = String(f.tripKm).padEnd(7);
      const kml = String(f.calculatedKml || '-').padEnd(9);
      const acc = String(f.accuracyPercentage ? f.accuracyPercentage + '%' : '-').padEnd(7);
      const ckm = String(f.costPerKm || '-').padEnd(7);
      report += `${d} | ${l} | ${p} | Ksh ${tot} | ${tr} | ${kml} | ${acc} | Ksh ${ckm} | ${f.stationName || 'N/A'}\n`;
    });

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vehicle_Summary_${v.registrationNumber}_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
  }

  function downloadEntrySlip(entryId) {
    const f = state.fuelEntries.find(e => e.id === entryId);
    if (!f) return;
    const v = state.currentVehicle;

    let slip = `========================================\n`;
    slip += `        REFUELLING RECEIPT SLIP        \n`;
    slip += `   VEHICLE MONITOR & FUEL INTELLIGENCE  \n`;
    slip += `========================================\n`;
    slip += `Vehicle:       ${v.make} ${v.model} (${v.registrationNumber})\n`;
    slip += `Date & Time:   ${f.date}\n`;
    slip += `Station:       ${f.stationName || 'N/A'}\n`;
    slip += `Pump Nozzle:   ${f.pumpNumber || 'N/A'}\n`;
    slip += `Payment:       ${f.paymentMethod?.toUpperCase() || 'CARD'}\n`;
    slip += `----------------------------------------\n`;
    slip += `Volume:        ${f.litres} Litres\n`;
    slip += `Price/Litre:   Ksh ${f.pricePerLitre}\n`;
    slip += `TOTAL AMOUNT:  Ksh ${formatNumber(f.totalCost)}\n`;
    slip += `----------------------------------------\n`;
    slip += `Trip Distance: ${f.tripKm} KM\n`;
    slip += `Actual KM/L:   ${f.calculatedKml} KM/L\n`;
    slip += `Cluster KM/L:  ${f.clusterKml || '-'} KM/L\n`;
    slip += `Gauge Accu%:   ${f.accuracyPercentage || '-'}%\n`;
    slip += `Cost per KM:   Ksh ${f.costPerKm || '-'} / KM\n`;
    slip += `Overall Status:${f.status?.overallStatus?.toUpperCase() || 'COMPLETE'}\n`;
    slip += `========================================\n`;

    const blob = new Blob([slip], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_Slip_${v.registrationNumber}_${f.date ? f.date.slice(0,10) : 'entry'}.txt`;
    a.click();
  }

  function exportFuelAsCSV() {
    const v = state.currentVehicle;
    let csv = "Date,Litres,PricePerLitre,TotalCost,TripKM,ActualKM_L,ClusterKM_L,AccuracyPercent,CostPerKM,Station,Pump,Status\n";
    state.fuelEntries.forEach(f => {
      csv += `${f.date},${f.litres},${f.pricePerLitre},${f.totalCost},${f.tripKm},${f.calculatedKml},${f.clusterKml},${f.accuracyPercentage},${f.costPerKm},"${f.stationName}","${f.pumpNumber || ''}","${f.status?.overallStatus || 'complete'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fuel_Log_${v ? v.registrationNumber : 'export'}.csv`;
    a.click();
  }

  function exportDataAsJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `VehicleMonitor_Backup_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchor.click();
  }

  // =========================================================================
  // UTILITY HELPERS
  // =========================================================================

  function renderReminderListShort(reminders) {
    if (!reminders || reminders.length === 0) return `<p style="font-size:12px; color:var(--text-muted)">No active reminders.</p>`;
    return reminders.slice(0, 2).map(r => `
      <div style="font-size:12px; border-bottom:1px solid var(--border-color); padding:6px 0;">
        <b>${r.title}</b><br/>
        <span style="color:var(--text-muted)">Due at ${formatNumber(r.dueOdometer)} KM or ${r.dueDate}</span>
      </div>
    `).join('');
  }

  function renderDocListShort() {
    const docs = state.vehicleDocuments;
    if (!docs || docs.length === 0) return `<p style="font-size:12px; color:var(--text-muted)">No vehicle documents recorded.</p>`;
    return docs.slice(0, 2).map(d => `
      <div style="font-size:12px; border-bottom:1px solid var(--border-color); padding:6px 0;">
        <b>${d.documentType.toUpperCase()} (${d.documentNumber})</b><br/>
        <span style="color:#FBBF24">Expires: ${d.expiryDate}</span>
      </div>
    `).join('');
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  function openSwitchVehModal() {
    closeSidebar();
    const list = document.getElementById('vehSwitchList');
    if (list) {
      list.innerHTML = state.vehicles.map(v => {
        const isActive = v.id === state.currentVehicleId;
        return `
          <div class="kpi-card ${isActive ? 'teal' : ''}" style="cursor:pointer;" onclick="App.switchVehicle('${v.id}')">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <b style="color:${isActive ? '#38BDF8' : '#F8FAFC'}; font-size:15px;">${v.make} ${v.model} — ${v.registrationNumber}</b>
              ${isActive ? '<span class="chip chip-complete">Current Active</span>' : '<span class="btn-secondary" style="padding:2px 8px; font-size:10px;">Select</span>'}
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
              ${v.fuelType.toUpperCase()} · ${v.engineCapacity || 1500}cc · Odometer: ${formatNumber(v.currentOdometer)} km · Benchmark: ${v.fuelBenchmark} KM/L
            </div>
          </div>
        `;
      }).join('');
    }
    openModal(dom.modalSwitchVeh);
  }

  function openAIScanModal() {
    closeSidebar();
    openModal(dom.modalAIScan);
  }

  function openServiceModal() {
    openModal(dom.modalService);
  }

  function openExpenseModal() {
    openModal(dom.modalExpense);
  }

  function openDocumentModal() {
    openModal(dom.modalDocument);
  }

  function openReminderModal() {
    openModal(dom.modalReminder);
  }

  function openAddVehicleModal() {
    closeAllModals();
    openModal(dom.modalAddVeh);
  }

  function openImportModal() {
    openModal(dom.modalImport);
  }

  function setFuelFilter(f) {
    state.fuelFilter = f;
    renderFuelLog();
  }

  function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('en-US', { maximumFractionDigits: 1 });
  }

  // PUBLIC API EXPORTED ON window.App
  const publicApi = {
    init,
    switchTab,
    switchVehicle,
    openRefuelModal,
    openEntryDetailModal,
    openAIScanModal,
    openServiceModal,
    openExpenseModal,
    openDocumentModal,
    openReminderModal,
    openAddVehicleModal,
    openSwitchVehModal,
    openImportModal,
    runAIPreset,
    updateRefuelMath,
    updateRefuelCalculations: updateRefuelMath,
    deleteFuelEntry,
    openModal,
    closeAllModals,
    toggleSidebar,
    closeSidebar,
    setFuelFilter,
    downloadVehicleSummary,
    downloadEntrySlip,
    exportFuelAsCSV,
    exportDataAsJSON
  };

  return publicApi;
})();

// Explicitly bind to global window
window.App = App;
window.addEventListener('DOMContentLoaded', App.init);
