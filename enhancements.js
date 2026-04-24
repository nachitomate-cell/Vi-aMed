(() => {
  const STORAGE_KEY = 'vinamed-enhanced-state-v1';
  const SESSION_KEY = 'vinamed-enhanced-session-v1';
  const TIMEOUT_MS = 10 * 60 * 1000;
  const USERS = {
    '11.111.111-1': { password: 'Demo1234', role: 'admision', name: 'Camila Soto', email: 'admision@vinamed.cl' },
    '22.222.222-2': { password: 'Demo1234', role: 'medico', name: 'Dr. Martin Rojas', email: 'medico@vinamed.cl' },
    '33.333.333-3': { password: 'Demo1234', role: 'direccion', name: 'Paula Caceres', email: 'direccion@vinamed.cl' }
  };
  const TOUR_KEY = 'vinamed-enhanced-tour-seen-v1';
  const STATUS_LABELS = { admitido: 'Admitido', espera: 'En espera', 'en-box': 'En box', borrador: 'Informe en borrador', validado: 'Informe validado', entregado: 'Informe entregado' };
  const FIXES = new Map([
    ['ViÃ±aMed', 'ViñaMed'], ['ClÃ­nico', 'Clínico'], ['ClÃ­nica', 'Clínica'], ['EcografÃ­a', 'Ecografía'], ['EcogrÃ¡fico', 'Ecográfico'],
    ['GeneraciÃ³n', 'Generación'], ['ImagenologÃ­a', 'Imagenología'], ['RehabilitaciÃ³n', 'Rehabilitación'], ['PÃ©rez', 'Pérez'], ['GonzÃ¡lez', 'González'],
    ['PÃ©lvico', 'Pélvico'], ['ObstÃ©trico', 'Obstétrico'], ['MÃ©dico', 'Médico'], ['MÃ©dica', 'Médica'], ['RegiÃ³n', 'Región'], ['anatÃ³mica', 'anatómica'],
    ['IndicaciÃ³n', 'Indicación'], ['clÃ­nica', 'clínica'], ['nÃ³dulo', 'nódulo'], ['ImpresiÃ³n', 'Impresión'], ['diagnÃ³stica', 'diagnóstica'],
    ['ConclusiÃ³n', 'Conclusión'], ['ecogrÃ¡ficos', 'ecográficos'], ['AtenciÃ³n', 'Atención'], ['EnfermerÃ­a', 'Enfermería'], ['menÃº', 'menú'],
    ['CuraciÃ³n', 'Curación'], ['RamÃ­rez', 'Ramírez'], ['MuÃ±oz', 'Muñoz'], ['MarÃ­a', 'María'], ['hÃ­gado', 'hígado'], ['tÃ©cnico', 'técnico'],
    ['bÃºsqueda', 'búsqueda'], ['clÃ­nicos', 'clínicos'], ['crÃ­tico', 'crítico'], ['instalada correctamente', 'instalada correctamente'], ['Â¡', '¡'], ['â€”', '—'], ['Â·', '·'],
    ['ðŸ”´', '🔴'], ['ðŸŸ¢', '🟢'], ['âš ï¸', '⚠️'], ['âœ…', '✅'], ['ðŸ”„', '🔄'], ['ðŸ–¨ï¸', '🖨️'], ['â„¹ï¸', 'ℹ️'], ['ðŸŽ‰', '🎉'], ['ðŸ“‹', '📋'], ['ðŸ“²', '📲']
  ]);


  const MACROS_ECO = {
    'Abdominal': 'Hígado de tamaño, forma y ecogenicidad normal. Vesícula biliar alitiásica de paredes finas. Vías biliares intra y extrahepáticas de calibre conservado. Páncreas y bazo sin alteraciones. Ambos riñones de tamaño y morfología conservados, sin signos de uropatía obstructiva. Vejiga a repleción parcial, de paredes finas.',
    'Pélvico': 'Vejiga de buena repleción, de paredes finas, sin imágenes en su lumen. Útero en AVF, de tamaño y ecogenicidad conservada. Endometrio central y homogéneo. Ambos ovarios de volumen y aspecto ecográfico habitual. Ausencia de líquido libre en fondo de saco de Douglas.',
    'Partes Blandas': 'Se explora región de interés. Piel y tejido celular subcutáneo de grosor y ecogenicidad conservados. No se observan colecciones ni masas sólidas subyacentes. Planos musculares de estructura fibrilar normal. Ausencia de adenopatías o hipervascularización al modo Doppler color.'
  };

  const ECO_DRAFT_KEY = 'borrador_eco_actual';
  const ECO_FIELDS = ['eco-nombre', 'eco-rut', 'eco-edad', 'eco-sexo', 'eco-fecha', 'eco-solicitante', 'eco-codigo', 'eco-region', 'eco-indicacion', 'eco-informante', 'eco-firma', 'eco-hallazgos', 'eco-diagnostico', 'eco-recomendaciones', 'eco-estado'];

  function saveBorradorLocally() {
    const data = {};
    ECO_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) data[id] = el.value;
    });
    const activeChip = document.querySelector('#chip-group .chip.selected');
    data['selected_tipo'] = activeChip ? activeChip.getAttribute('data-tipo') : '';
    localStorage.setItem(ECO_DRAFT_KEY, JSON.stringify(data));
  }

  function loadBorradorLocally() {
    try {
      const raw = localStorage.getItem(ECO_DRAFT_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      ECO_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el && data[id] !== undefined) el.value = data[id];
      });
      if (data['selected_tipo']) {
        const chip = document.querySelector(`#chip-group .chip[data-tipo="${data['selected_tipo']}"]`);
        if (chip && typeof window.selectChip === 'function') {
          window.selectChip(chip, data['selected_tipo']);
        }
      }
      handleLegalLock();
      if(typeof window.updateEcoPreview === 'function') window.updateEcoPreview();
    } catch (e) {}
  }

  function handleLegalLock() {
    const estado = document.getElementById('eco-estado')?.value || 'borrador';
    const isLocked = estado === 'validado';
    const fieldsToLock = document.querySelectorAll('#eco-form-wrap input, #eco-form-wrap textarea, #eco-form-wrap select');
    
    fieldsToLock.forEach(el => {
      if (el.id !== 'eco-estado') {
        el.disabled = isLocked;
      }
    });

    const chipGroup = document.getElementById('chip-group');
    if (chipGroup) {
      chipGroup.style.pointerEvents = isLocked ? 'none' : 'auto';
      chipGroup.style.opacity = isLocked ? '0.6' : '1';
    }

    const printBtn = document.getElementById('vmPrintBtn');
    if (printBtn) {
      printBtn.disabled = !isLocked;
      printBtn.style.opacity = isLocked ? '1' : '0.5';
      printBtn.style.pointerEvents = isLocked ? 'auto' : 'none';
    }
  }

  function replaceMojibakeInNode(node) {
    if (!node || !node.nodeValue) return;
    let value = node.nodeValue;
    FIXES.forEach((good, bad) => { value = value.split(bad).join(good); });
    node.nodeValue = value;
  }
  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) return replaceMojibakeInNode(node);
    node.childNodes.forEach(walk);
  }
  function normalizeString(value) {
    let next = String(value);
    FIXES.forEach((good, bad) => { next = next.split(bad).join(good); });
    return next;
  }
  function fixAttributes() {
    document.querySelectorAll('[placeholder],[title],[aria-label],[alt],option,meta').forEach((el) => {
      ['placeholder', 'title', 'aria-label', 'alt', 'content'].forEach((attr) => {
        if (el.hasAttribute && el.hasAttribute(attr)) {
          el.setAttribute(attr, normalizeString(el.getAttribute(attr)));
        }
      });
      if (el.tagName === 'OPTION') el.textContent = normalizeString(el.textContent);
    });
  }
  function fixText() {
    walk(document.body);
    fixAttributes();
    document.title = 'ViñaMed - Portal Clínico';
    const apple = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    const desc = document.querySelector('meta[name="description"]');
    if (apple) apple.content = 'ViñaMed';
    if (desc) desc.content = 'Portal Clínico ViñaMed - Imagenología y Rehabilitación';
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .vm-top-chip{display:inline-flex;align-items:center;gap:.45rem;padding:.32rem .72rem;border-radius:999px;border:1px solid rgba(61,255,160,.16);background:rgba(61,255,160,.08);font-size:.74rem;color:#dce8f4}
      .vm-top-chip strong{color:#3dffa0}
      .vm-login{position:fixed;inset:0;z-index:500;display:none;align-items:center;justify-content:center;padding:1rem;background:rgba(5,9,18,.86);backdrop-filter:blur(10px)}
      .vm-login.open{display:flex}
      .vm-login-card{width:min(920px,100%);display:grid;grid-template-columns:1.15fr .85fr;background:#0f1623;border:1px solid rgba(0,180,216,.18);border-radius:22px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.45)}
      .vm-login-hero{padding:2rem;background:linear-gradient(135deg,rgba(61,255,160,.10),rgba(0,180,216,.12))}
      .vm-login-form{padding:2rem;display:grid;gap:.9rem}
      .vm-login-note,.vm-inline-note{padding:.8rem .9rem;border:1px solid rgba(0,180,216,.16);border-radius:14px;background:rgba(255,255,255,.03);font-size:.82rem;color:#b8c6db;line-height:1.5}
      .vm-login .field input,.vm-login .field select{background:#0a1220}
      .vm-error{font-size:.78rem;color:#ffb4c0;min-height:1.1rem}
      .vm-audit{margin-top:1rem;background:var(--card);border:1px solid var(--border2);border-radius:var(--r);padding:1rem}
      .vm-audit-item{padding:.8rem .9rem;border-left:2px solid rgba(61,255,160,.32);background:rgba(255,255,255,.03);border-radius:0 10px 10px 0;margin-bottom:.7rem}
      .vm-audit-item:last-child{margin-bottom:0}
      .vm-audit-item strong{display:block;color:var(--text);font-size:.84rem}
      .vm-audit-item small{display:block;color:var(--muted);font-size:.72rem;margin-top:.18rem}
      .vm-info-banner{margin:0 0 1rem;background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.22);border-radius:14px;padding:.95rem 1rem;color:#f7dba0;font-size:.82rem;line-height:1.55}
      body{font-size:15.5px}
      .vm-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
      .nav-item,.quick-card,.stat-sub,.box-state,.qc-desc,.activity-item,.roadmap-item,.pdf-value,.field label,.field input,.field select,.field textarea{letter-spacing:.01em}
      .nav-label,.stat-sub,.clock,.sf-role,.help,.roadmap-item,.qc-desc,.welcome-banner p,.pdf-sub{color:#7d8daa!important}
      .welcome-banner{padding:1.7rem 1.55rem!important}
      .welcome-banner h1{font-size:clamp(1.45rem,3.3vw,1.95rem)!important}
      .stat-card,.quick-card,.box-card,.form-card,.ph-wrap,.sidebar-footer,.pdf-section,.informe-item{border-radius:16px!important}
      .quick-card,.box-card,.stat-card,.form-card,.informe-item{box-shadow:0 12px 34px rgba(0,0,0,.16)}
      .field input,.field select,.field textarea{min-height:50px;border-color:rgba(0,180,216,.16)!important}
      .field textarea{line-height:1.55}
      .sec-title,.form-card-title,.qc-label,.ii-name,.roadmap-item strong{letter-spacing:.01em}
      .btn,.btn-icon{transition:transform .18s ease, background-color .18s ease, border-color .18s ease}
      .vm-locked{opacity:.5;pointer-events:none;filter:grayscale(.2)}
      .vm-modal-extra{margin-top:.8rem;padding-top:.8rem;border-top:1px solid var(--border)}
      .vm-report-state{margin-top:.8rem}
      .vm-print-btn{margin-left:.5rem}
      .vm-badge{display:inline-flex;align-items:center;padding:.18rem .55rem;border-radius:999px;background:rgba(61,255,160,.10);border:1px solid rgba(61,255,160,.18);color:#3dffa0;font-size:.7rem;font-weight:700}
      .vm-status{display:inline-flex;align-items:center;gap:.4rem;padding:.2rem .55rem;border-radius:999px;border:1px solid rgba(0,180,216,.18);font-size:.72rem}
      .vm-status.dot:before{content:'';width:.5rem;height:.5rem;border-radius:50%;background:currentColor;display:inline-block}
      .vm-overlay-note{font-size:.82rem;color:#aebbd0;line-height:1.6}
      .vm-tour-launch{margin-top:.8rem;width:100%}
      .vm-tour{position:fixed;inset:0;z-index:520;display:none;pointer-events:none}
      .vm-tour.open{display:block}
      .vm-tour-card{position:fixed;width:min(420px,calc(100vw - 2rem));background:linear-gradient(180deg, rgba(19,29,49,.98), rgba(13,21,36,.98));border:1px solid rgba(87,226,171,.16);border-radius:24px;box-shadow:0 24px 80px rgba(0,0,0,.45);padding:1.15rem;pointer-events:auto}
      .vm-tour-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:.35rem}
      .vm-tour-title-wrap{display:flex;align-items:flex-start;gap:.95rem}
      .vm-tour-illustration{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(135deg, rgba(87,226,171,.14), rgba(0,180,216,.14));border:1px solid rgba(87,226,171,.16);color:#57e2ab;flex-shrink:0}
      .vm-tour-illustration svg{width:26px;height:26px}
      .vm-tour-close{min-width:auto;padding:.55rem .8rem}
      .vm-tour-card h3{margin:0 0 .35rem;font-family:'Syne',sans-serif;font-size:1.35rem}
      .vm-tour-step{display:inline-flex;padding:.22rem .55rem;border-radius:999px;background:rgba(87,226,171,.12);border:1px solid rgba(87,226,171,.18);color:#57e2ab;font-size:.72rem;font-weight:700;margin-bottom:.8rem}
      .vm-tour-body{color:#c7d4e7;font-size:.94rem;line-height:1.75}
      .vm-tour-caption{margin-top:.85rem;padding:.8rem .9rem;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid rgba(0,180,216,.12);color:#9fb2cb;font-size:.82rem;line-height:1.6}
      .vm-tour-progress{display:flex;gap:.45rem;margin-top:.9rem}
      .vm-tour-dot{width:.55rem;height:.55rem;border-radius:999px;background:rgba(255,255,255,.14);transition:transform .2s ease, background .2s ease}
      .vm-tour-dot.active{background:#57e2ab;transform:scale(1.15)}
      .vm-tour-actions{display:flex;flex-wrap:wrap;gap:.6rem;justify-content:space-between;align-items:center;margin-top:1rem}
      .vm-tour-actions .left,.vm-tour-actions .right{display:flex;gap:.6rem;flex-wrap:wrap}
      .vm-tour-target{position:relative;z-index:519;box-shadow:0 0 0 2px rgba(87,226,171,.55), 0 0 0 6px rgba(87,226,171,.10)!important;border-radius:18px!important}
      .vm-tour-anchor{display:flex;align-items:center;gap:.45rem;margin-top:.75rem;color:#57e2ab;font-size:.78rem;font-weight:600}
      .vm-tour-anchor:before{content:'';width:.55rem;height:.55rem;border-radius:999px;background:#57e2ab;box-shadow:0 0 0 6px rgba(87,226,171,.12)}
      @media(max-width:900px){.vm-login-card{grid-template-columns:1fr}.vm-grid-2{grid-template-columns:1fr}}
      
      /* Print styles are handled by the #pdf-informe @media print block in index.html */
      .eco-form-locked input:disabled, .eco-form-locked textarea:disabled, .eco-form-locked select:disabled {
        opacity: .55; cursor: not-allowed;
      }
      #eco-form-wrap .vm-lock-indicator {
        display:none; padding:.5rem .8rem; border-radius:8px; font-size:.78rem; font-weight:600;
        background:rgba(61,255,160,.08); border:1px solid rgba(61,255,160,.18); color:#3dffa0; margin-bottom:.75rem;
      }
      #eco-form-wrap .vm-lock-indicator.visible { display:flex; align-items:center; gap:.5rem; }
    `;
    document.head.appendChild(style);
  }

  function loadPersistedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (Array.isArray(saved.patients)) App.patients = saved.patients;
      if (Array.isArray(saved.informes)) App.informes = saved.informes;
      if (saved.boxStates) App.boxStates = saved.boxStates;
      App.audit = Array.isArray(saved.audit) ? saved.audit : [];
    } catch {}
  }
  function savePersistedState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      patients: App.patients,
      informes: App.informes,
      boxStates: App.boxStates,
      audit: App.audit || []
    }));
  }
  function loadSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (Date.now() - session.lastActivity > TIMEOUT_MS) return null;
      return session;
    } catch { return null; }
  }
  function saveSession(session) {
    if (!session) return;
    session.lastActivity = Date.now();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  function touchSession() {
    if (!window.vmSession) return;
    saveSession(window.vmSession);
  }
  function addAudit(action, detail) {
    App.audit = App.audit || [];
    const actor = window.vmSession ? `${window.vmSession.name} (${window.vmSession.roleLabel})` : 'Sistema';
    App.audit.unshift({ action, detail, actor, ts: new Date().toISOString() });
    App.audit = App.audit.slice(0, 40);
    savePersistedState();
    renderAudit();
  }

  function injectChrome() {
    const spacer = document.querySelector('header .spacer');
    if (spacer && !document.getElementById('vmRoleChip')) {
      const chip = document.createElement('div');
      chip.className = 'vm-top-chip';
      chip.id = 'vmRoleChip';
      chip.innerHTML = '<strong>Modo protegido</strong><span id="vmRoleText">Sin sesión</span>';
      spacer.before(chip);
    }
    const dashboard = document.getElementById('page-dashboard');
    if (dashboard && !document.getElementById('vmAuditCard')) {
      const section = document.createElement('section');
      section.className = 'vm-audit';
      section.id = 'vmAuditCard';
      section.innerHTML = '<div class="sec-title">Bitácora local</div><div id="vmAuditList"></div><button class="btn btn-secondary vm-tour-launch" id="vmTourLaunch" type="button">Ver tour guiado</button>';
      dashboard.appendChild(section);
    }
    const patientModal = document.querySelector('#patientModal .modal');
    if (patientModal && !document.getElementById('p-prioridad')) {
      const extra = document.createElement('div');
      extra.className = 'vm-modal-extra';
      extra.innerHTML = '<div class="field-row"><div class="field"><label>Prioridad</label><select id="p-prioridad"><option value="normal">Normal</option><option value="preferente">Preferente</option><option value="critica">Crítica</option></select></div><div class="field"><label>Estado inicial</label><select id="p-estado"><option value="admitido">Admitido</option><option value="espera">En espera</option><option value="en-box">En box</option></select></div></div><div class="field"><label>Teléfono / observación</label><input id="p-contacto" type="text" placeholder="Ej: +56 9 1234 5678 o nota clínica breve"></div><div id="vmPatientError" class="vm-error"></div>';
      patientModal.insertBefore(extra, patientModal.querySelector('.modal-actions'));
      patientModal.parentElement.setAttribute('role', 'dialog');
      patientModal.parentElement.setAttribute('aria-modal', 'true');
    }
    const informanteField = document.getElementById('eco-informante')?.closest('.field');
    if (informanteField && !document.getElementById('eco-firma')) {
      const firma = document.createElement('div');
      firma.className = 'field';
      firma.innerHTML = '<label>Firma / código profesional *</label><input id="eco-firma" type="text" placeholder="RUT o registro profesional">';
      informanteField.after(firma);
    }
    const recField = document.getElementById('eco-recomendaciones')?.closest('.field');
    if (recField && !document.getElementById('eco-estado')) {
      const stateField = document.createElement('div');
      stateField.className = 'field vm-report-state';
      stateField.innerHTML = '<label>Estado del documento</label><select id="eco-estado"><option value="borrador">Borrador</option><option value="validado">Validado</option><option value="entregado">Entregado</option></select><div class="help">La impresión solo se habilita para informes validados o entregados.</div><div id="vmEcoError" class="vm-error"></div>';
      recField.after(stateField);
    }
    const ecoActions = document.querySelector('.eco-actions');
    if (ecoActions && !document.getElementById('vmPrintBtn')) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost vm-print-btn';
      btn.id = 'vmPrintBtn';
      btn.type = 'button';
      btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>Imprimir validado';
      ecoActions.appendChild(btn);
    }
  }
  function renderAudit() {
    const list = document.getElementById('vmAuditList');
    if (!list) return;
    const items = (App.audit || []).slice(0, 6);
    list.innerHTML = items.length ? items.map(item => `<div class="vm-audit-item"><strong>${item.action}</strong><div>${item.detail}</div><small>${item.actor} · ${new Date(item.ts).toLocaleString('es-CL')}</small></div>`).join('') : '<div class="vm-overlay-note">Aún no hay acciones auditadas en esta estación.</div>';
  }

  function renderSessionUi() {
    const roleText = document.getElementById('vmRoleText');
    if (!roleText) return;
    roleText.textContent = window.vmSession ? `${window.vmSession.roleLabel} · ${window.vmSession.name}` : 'Sin sesión';
    const restricted = ['page-eco'];
    const canSeeReports = !!window.vmSession && ['medico', 'direccion'].includes(window.vmSession.role);
    restricted.forEach(id => {
      const page = document.getElementById(id);
      const nav = document.querySelector(`.nav-item[data-page="${id.replace('page-','')}"]`);
      if (page) page.classList.toggle('vm-locked', !canSeeReports);
      if (nav) nav.classList.toggle('vm-locked', !canSeeReports);
    });
  }

  const TOUR_STEPS = [
    {
      icon: 'pulse',
      title: 'Resumen del día',
      body: 'El dashboard es la vista de control. Desde aquí ves pacientes activos, boxes disponibles, actividad reciente y accesos rápidos para entrar a los módulos clínicos sin perder contexto.',
      caption: 'Ideal para recepción, coordinación y supervisión rápida del turno.',
      selector: '.welcome-banner, .stats-row',
      anchor: 'Este bloque resume el estado general del turno.',
      action: () => { closePatientModal(); navigate('dashboard'); }
    },
    {
      icon: 'user',
      title: 'Admisión de pacientes',
      body: 'El registro de paciente valida el RUT, evita duplicados y permite dejar prioridad, estado inicial y observaciones. La idea es que la admisión ya salga clara para el resto del equipo.',
      caption: 'Este paso reduce errores de identificación y mejora la trazabilidad interna.',
      selector: '#patientModal .modal',
      anchor: 'Aquí se registran pacientes y se define su estado inicial.',
      action: () => { navigate('dashboard'); openPatientModal(); }
    },
    {
      icon: 'scan',
      title: 'Informes ecográficos',
      body: 'En Box Ecografía se completa la identificación clínica, el tipo de estudio, hallazgos, impresión diagnóstica y firma profesional. Además, el informe ahora puede quedar en borrador o validado.',
      caption: 'Guardar e imprimir ya no ocurren juntos: primero se documenta, después se emite.',
      selector: '#eco-form-wrap .eco-layout',
      anchor: 'Este formulario construye el informe clínico.',
      action: () => { closePatientModal(); navigate('eco'); if (typeof openEcoForm === 'function') openEcoForm(); }
    },
    {
      icon: 'print',
      title: 'Vista previa y emisión',
      body: 'La vista previa permite revisar el contenido antes de emitir. La impresión se habilita como paso aparte para disminuir errores operativos y evitar documentos incompletos.',
      caption: 'Piensa este bloque como la última revisión antes de entregar o imprimir.',
      selector: '#eco-preview, .eco-actions',
      anchor: 'Desde aquí se revisa y luego se emite el documento.',
      action: () => { closePatientModal(); navigate('eco'); if (typeof openEcoForm === 'function') openEcoForm(); }
    },
    {
      icon: 'layers',
      title: 'Bitácora y próximos módulos',
      body: 'En el dashboard puedes volver a abrir este tour y revisar la bitácora local. Las vistas de enfermería, fichas rápidas e inventario siguen marcadas como siguientes módulos del portal.',
      caption: 'La demo ya ordena el flujo principal, pero aún faltan backend, firma electrónica y operación multiusuario real.',
      selector: '#vmAuditCard',
      anchor: 'Este panel te deja retomar la guía y revisar trazabilidad local.',
      action: () => { closePatientModal(); navigate('dashboard'); }
    }
  ];
  let vmTourIndex = 0;

  function cleanupTourState() {
    try { closePatientModal(); } catch {}
    const tour = document.getElementById('vmTour');
    tour?.classList.remove('open');
    document.querySelectorAll('.vm-tour-target').forEach((el) => el.classList.remove('vm-tour-target'));
  }

  function resolveTourTarget(step) {
    if (!step?.selector) return null;
    return step.selector.split(',').map((part) => document.querySelector(part.trim())).find(Boolean) || null;
  }

  function positionTourCard(target) {
    const card = document.querySelector('#vmTour .vm-tour-card');
    if (!card) return;
    const margin = 16;
    const rect = target?.getBoundingClientRect();
    const cardWidth = Math.min(420, window.innerWidth - 32);
    card.style.width = `${cardWidth}px`;

    if (!rect) {
      card.style.top = `${Math.max(88, margin)}px`;
      card.style.left = `${Math.max(margin, window.innerWidth - cardWidth - margin)}px`;
      return;
    }

    const preferRight = rect.right + cardWidth + margin < window.innerWidth;
    const preferLeft = rect.left - cardWidth - margin > 0;
    let left;
    if (preferRight) left = rect.right + margin;
    else if (preferLeft) left = rect.left - cardWidth - margin;
    else left = Math.min(window.innerWidth - cardWidth - margin, Math.max(margin, rect.left));

    let top = rect.top;
    const maxTop = window.innerHeight - card.offsetHeight - margin;
    top = Math.min(Math.max(margin, top), Math.max(margin, maxTop));

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  function ensureTourUi() {
    if (document.getElementById('vmTour')) return;
    const overlay = document.createElement('div');
    overlay.id = 'vmTour';
    overlay.className = 'vm-tour';
    overlay.innerHTML = `
      <div class="vm-tour-card" role="dialog" aria-modal="true" aria-labelledby="vmTourTitle">
        <div class="vm-tour-head">
          <div class="vm-tour-title-wrap">
            <div class="vm-tour-illustration" id="vmTourIllustration"></div>
            <div>
              <div class="vm-tour-step" id="vmTourStep"></div>
              <h3 id="vmTourTitle"></h3>
            </div>
          </div>
          <button class="btn btn-ghost vm-tour-close" id="vmTourCloseStep" type="button">Cerrar</button>
        </div>
        <div class="vm-tour-body" id="vmTourBody"></div>
        <div class="vm-tour-caption" id="vmTourCaption"></div>
        <div class="vm-tour-anchor" id="vmTourAnchor"></div>
        <div class="vm-tour-progress" id="vmTourProgress"></div>
        <div class="vm-tour-actions">
          <div class="left">
            <button class="btn btn-ghost" id="vmTourSkip" type="button">Cerrar tour</button>
          </div>
          <div class="right">
            <button class="btn btn-ghost" id="vmTourBack" type="button">Anterior</button>
            <button class="btn btn-primary" id="vmTourNext" type="button">Siguiente</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.getElementById('vmTourSkip').addEventListener('click', closeTour);
    document.getElementById('vmTourCloseStep').addEventListener('click', closeTour);
    document.getElementById('vmTourBack').addEventListener('click', () => goTour(-1));
    document.getElementById('vmTourNext').addEventListener('click', () => goTour(1));
    overlay.addEventListener('click', (event) => {
      if (event.target.id === 'vmTour') closeTour();
    });
  }
  function renderTourStep() {
    ensureTourUi();
    cleanupTourState();
    const step = TOUR_STEPS[vmTourIndex];
    if (typeof step.action === 'function') step.action();
    fixText();
    const overlay = document.getElementById('vmTour');
    overlay.classList.add('open');
    const target = resolveTourTarget(step);
    if (target) {
      target.classList.add('vm-tour-target');
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    document.getElementById('vmTourIllustration').innerHTML = getTourIcon(step.icon);
    document.getElementById('vmTourStep').textContent = `Paso ${vmTourIndex + 1} de ${TOUR_STEPS.length}`;
    document.getElementById('vmTourTitle').textContent = step.title;
    document.getElementById('vmTourBody').textContent = step.body;
    document.getElementById('vmTourCaption').textContent = step.caption || '';
    document.getElementById('vmTourAnchor').textContent = step.anchor || 'Revisa la sección marcada para seguir este paso.';
    document.getElementById('vmTourBack').disabled = vmTourIndex === 0;
    document.getElementById('vmTourNext').textContent = vmTourIndex === TOUR_STEPS.length - 1 ? 'Finalizar' : 'Siguiente';
    document.getElementById('vmTourProgress').innerHTML = TOUR_STEPS.map((_, index) => `<span class="vm-tour-dot ${index === vmTourIndex ? 'active' : ''}"></span>`).join('');
    window.requestAnimationFrame(() => positionTourCard(target));
  }
  function getTourIcon(name) {
    const icons = {
      pulse: '<svg viewBox="0 0 24 24"><path d="M3 12h4l2-5 4 10 2-5h6"></path></svg>',
      user: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
      scan: '<svg viewBox="0 0 24 24"><path d="M4 7V5a2 2 0 0 1 2-2h2"></path><path d="M18 3h2a2 2 0 0 1 2 2v2"></path><path d="M20 17v2a2 2 0 0 1-2 2h-2"></path><path d="M6 21H4a2 2 0 0 1-2-2v-2"></path><path d="M7 12h10"></path></svg>',
      print: '<svg viewBox="0 0 24 24"><path d="M6 9V4h12v5"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="7"></rect></svg>',
      layers: '<svg viewBox="0 0 24 24"><path d="M12 3 3 8l9 5 9-5-9-5Z"></path><path d="m3 12 9 5 9-5"></path><path d="m3 16 9 5 9-5"></path></svg>'
    };
    return icons[name] || icons.layers;
  }
  function openTour(startAt = 0) {
    vmTourIndex = startAt;
    renderTourStep();
    localStorage.setItem(TOUR_KEY, 'seen');
  }
  function goTour(direction) {
    const next = vmTourIndex + direction;
    if (next < 0) return;
    if (next >= TOUR_STEPS.length) {
      closeTour();
      navigate('dashboard');
      closePatientModal();
      return;
    }
    vmTourIndex = next;
    renderTourStep();
  }
  function closeTour() {
    cleanupTourState();
    navigate('dashboard');
  }

  function refreshTourPosition() {
    const overlay = document.getElementById('vmTour');
    if (!overlay || !overlay.classList.contains('open')) return;
    positionTourCard(resolveTourTarget(TOUR_STEPS[vmTourIndex]));
  }

  function injectLogin() {
    if (document.getElementById('vmLogin')) return;
    const div = document.createElement('div');
    div.id = 'vmLogin';
    div.className = 'vm-login';
    div.innerHTML = `
      <div class="vm-login-card">
        <section class="vm-login-hero">
          <div class="logo-text" style="margin-bottom:1rem"><span class="brand">ViñaMed</span><span class="sub">Portal Clínico reforzado</span></div>
          <h2 style="font-family:'Syne',sans-serif;font-size:2rem;margin-bottom:.6rem">Control local más serio para una operación clínica</h2>
          <p class="vm-overlay-note">Esta capa agrega inicio de sesión por rol, cierre por inactividad, persistencia local, validación de RUT, auditoría y emisión controlada de informes. Sigue siendo una demo avanzada: para producción real aún falta backend, cifrado y firma electrónica.</p>
          <div class="vm-login-note" style="margin-top:1rem">Credenciales demo:<br>11.111.111-1 / Demo1234 (Admisión)<br>22.222.222-2 / Demo1234 (Médico)<br>33.333.333-3 / Demo1234 (Dirección)</div>
        </section>
        <section class="vm-login-form" id="loginFormSection">
          <div class="field">
            <label>RUT de Usuario</label>
            <input id="rut-login" type="text" placeholder="Ej: 12.345.678-9" autocomplete="username">
            <span id="rut-feedback" style="font-size:0.75rem; margin-top:4px; display:block; min-height:14px; font-weight:600;"></span>
          </div>
          <div class="field"><label>Contraseña</label><input id="vmPassword" type="password" autocomplete="current-password"></div>
          <div class="field"><label>Rol esperado</label><select id="vmRole"><option value="admision">Admisión</option><option value="medico">Médico informante</option><option value="direccion">Dirección clínica</option></select></div>
          <div class="vm-inline-note">La sesión se cierra automáticamente tras 10 minutos sin actividad para proteger los datos del navegador.</div>
          <div id="vmLoginError" class="vm-error"></div>
          <button class="btn btn-primary" id="vmLoginBtn" type="button" disabled>Entrar al portal</button>
          <div style="text-align:center; margin-top:0.5rem;">
            <a href="#" id="vmForgotPwdLink" style="color:#00b4d8; font-size:0.85rem; text-decoration:none;">¿Olvidaste tu contraseña?</a>
          </div>
        </section>
        <section class="vm-login-form" id="recoveryFormSection" style="display:none;">
          <h3 style="font-family:'Syne',sans-serif;font-size:1.4rem;margin-bottom:0.5rem;color:var(--text)">Recuperar Contraseña</h3>
          <p class="vm-overlay-note" style="margin-bottom:1rem;">Ingresa el correo electrónico asociado a tu cuenta para enviarte un enlace de recuperación.</p>
          <div class="field">
            <label>Correo Electrónico</label>
            <input id="vmRecoveryEmail" type="email" placeholder="ejemplo@vinamed.cl">
          </div>
          <div id="vmRecoveryMsg" style="font-size:0.85rem; margin-top:4px; display:block; min-height:14px; font-weight:600;"></div>
          <button class="btn btn-primary" id="vmSendRecoveryBtn" type="button" style="margin-top:1rem;">Enviar enlace</button>
          <div style="text-align:center; margin-top:1rem;">
            <a href="#" id="vmBackToLoginLink" style="color:#aebbd0; font-size:0.85rem; text-decoration:none;">Volver al inicio de sesión</a>
          </div>
        </section>
      </div>`;
    document.body.appendChild(div);
    document.getElementById('rut-login').value = '';
    document.getElementById('vmPassword').value = 'Demo1234';
  }

  function requireSession() {
    injectLogin();
    if (!window.vmSession) document.getElementById('vmLogin').classList.add('open');
    renderSessionUi();
  }

  function login() {
    const rut = document.getElementById('rut-login').value.trim();
    const password = document.getElementById('vmPassword').value;
    const role = document.getElementById('vmRole').value;
    const error = document.getElementById('vmLoginError');
    const user = USERS[rut];
    if (!user || user.password !== password || user.role !== role) {
      error.textContent = 'Credenciales inválidas para este rol.';
      return;
    }
    window.vmSession = { ...user, rut, roleLabel: role === 'admision' ? 'Admisión' : role === 'medico' ? 'Médico' : 'Dirección clínica', lastActivity: Date.now() };
    saveSession(window.vmSession);
    document.getElementById('vmLogin').classList.remove('open');
    addAudit('Inicio de sesión', `${user.name} ingresó con perfil ${window.vmSession.roleLabel}.`);
    showToast('Sesión iniciada', user.name + ' ya puede trabajar en el portal', '🔐');
    renderSessionUi();
    if (!localStorage.getItem(TOUR_KEY)) {
      setTimeout(() => openTour(0), 350);
    }
  }

  function logout(reason) {
    window.vmSession = null;
    sessionStorage.removeItem(SESSION_KEY);
    document.getElementById('vmLogin').classList.add('open');
    renderSessionUi();
    showToast('Sesión cerrada', reason || 'Se cerró la sesión local.', '⏳');
  }

  function setupAccessibility() {
    document.querySelectorAll('.nav-item,.box-card,.quick-card,.chip').forEach(el => {
      if (!el.matches('button,a,input,select,textarea')) {
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            el.click();
          }
        });
      }
    });
    const overlay = document.getElementById('patientModal');
    if (overlay) {
      overlay.setAttribute('aria-hidden', 'true');
      const mo = new MutationObserver(() => overlay.setAttribute('aria-hidden', overlay.classList.contains('open') ? 'false' : 'true'));
      mo.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function isValidRut(rut) {
    const clean = String(rut).replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length < 8) return false;
    const body = clean.slice(0, -1); const dv = clean.slice(-1);
    let sum = 0; let mul = 2;
    for (let i = body.length - 1; i >= 0; i--) { sum += Number(body[i]) * mul; mul = mul === 7 ? 2 : mul + 1; }
    const expected = 11 - (sum % 11);
    const expectedDv = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);
    return dv === expectedDv;
  }
  function reportState() { return document.getElementById('eco-estado')?.value || 'borrador'; }
  function canUseReports() { return window.vmSession && ['medico', 'direccion'].includes(window.vmSession.role); }

  function bindEnhancements() {
    document.getElementById('vmLoginBtn')?.addEventListener('click', login);
    
    document.getElementById('rut-login')?.addEventListener('input', function(e) {
      let raw = e.target.value.replace(/[^0-9kK]/g, '').toUpperCase();
      let formatted = '';
      if (raw.length > 1) {
        let body = raw.slice(0, -1);
        let dv = raw.slice(-1);
        formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
      } else {
        formatted = raw;
      }
      e.target.value = formatted;
      
      const feedback = document.getElementById('rut-feedback');
      const btn = document.getElementById('vmLoginBtn');
      
      if (raw.length < 8) {
        e.target.style.borderColor = 'rgba(0,180,216,.16)';
        feedback.textContent = '';
        btn.disabled = true;
      } else if (window.isValidRut(formatted)) {
        e.target.style.borderColor = '#3dffa0';
        feedback.style.color = '#3dffa0';
        feedback.textContent = 'RUT Válido';
        btn.disabled = false;
      } else {
        e.target.style.borderColor = '#ffb4c0';
        feedback.style.color = '#ffb4c0';
        feedback.textContent = 'RUT Inválido';
        btn.disabled = true;
      }
    });

    document.getElementById('vmForgotPwdLink')?.addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('loginFormSection').style.display = 'none';
      document.getElementById('recoveryFormSection').style.display = 'grid';
      document.getElementById('vmRecoveryMsg').textContent = '';
      document.getElementById('vmRecoveryEmail').value = '';
      document.getElementById('vmRecoveryEmail').style.display = 'block';
      document.getElementById('vmSendRecoveryBtn').style.display = 'block';
    });

    document.getElementById('vmBackToLoginLink')?.addEventListener('click', function(e) {
      e.preventDefault();
      document.getElementById('recoveryFormSection').style.display = 'none';
      document.getElementById('loginFormSection').style.display = 'grid';
    });

    document.getElementById('vmSendRecoveryBtn')?.addEventListener('click', function() {
      const email = document.getElementById('vmRecoveryEmail').value.trim();
      const msg = document.getElementById('vmRecoveryMsg');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email)) {
        msg.style.color = '#3dffa0';
        msg.textContent = 'Si el correo existe en nuestra base de datos, hemos enviado un enlace de recuperación.';
        document.getElementById('vmRecoveryEmail').style.display = 'none';
        this.style.display = 'none';
      } else {
        msg.style.color = '#ffb4c0';
        msg.textContent = 'Por favor, ingresa un correo válido.';
      }
    });

    document.getElementById('vmTourLaunch')?.addEventListener('click', () => openTour(0));
    document.getElementById('logoutBtn')?.addEventListener('click', () => setTimeout(() => logout('Sesión cerrada manualmente.'), 0));
    document.getElementById('vmPrintBtn')?.addEventListener('click', () => {
      if (!canUseReports()) return showToast('Acceso restringido', 'Solo médico o dirección pueden emitir informes.', '🔒');
      if (!['validado', 'entregado'].includes(reportState())) return showToast('Impresión bloqueada', 'Valida el informe antes de imprimir.', '⚠️');
      populatePDF();
      addAudit('Preparación de impresión', `Informe listo para impresión de ${document.getElementById('eco-nombre').value || 'paciente sin nombre'}.`);
      setTimeout(() => window.print(), 250);
    });
    ['click','keydown','mousemove','touchstart'].forEach(evt => document.addEventListener(evt, touchSession, { passive: true }));
    window.addEventListener('resize', refreshTourPosition);
    window.addEventListener('scroll', refreshTourPosition, true);
    setInterval(() => {
      if (!window.vmSession) return;
      if (Date.now() - (window.vmSession.lastActivity || 0) > TIMEOUT_MS) logout('Cierre automático por inactividad para proteger los datos clínicos.');
    }, 30000);

    // Tarea 1: Macros
    document.getElementById('chip-group')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const tipo = chip.getAttribute('data-tipo');
      if (tipo && MACROS_ECO[tipo]) {
        const hallazgos = document.getElementById('eco-hallazgos');
        if (hallazgos && hallazgos.value.trim() === '') {
          hallazgos.value = MACROS_ECO[tipo];
          if(typeof window.updateEcoPreview === 'function') window.updateEcoPreview();
          saveBorradorLocally();
        }
      }
    });

    // Tarea 2 y 4: Auto-guardado y Actualización en tiempo real
    const ecoForm = document.getElementById('eco-form-wrap');
    if (ecoForm) {
      ecoForm.addEventListener('input', () => {
        if(typeof window.updateEcoPreview === 'function') window.updateEcoPreview();
        saveBorradorLocally();
      });
      ecoForm.addEventListener('change', () => {
        if(typeof window.updateEcoPreview === 'function') window.updateEcoPreview();
        saveBorradorLocally();
      });
    }

    // Tarea 3: Legal Lock logic listener
    document.getElementById('eco-estado')?.addEventListener('change', handleLegalLock);
  }
  const originalShowToast = window.showToast;
  window.showToast = function(msg, icon) {
    fixText();
    if (typeof originalShowToast === 'function') {
      // The inline showToast accepts (msg, icon) — 2 params only
      const safeMsg = normalizeString(String(msg || ''));
      const safeIcon = normalizeString(String(icon || '✅'));
      return originalShowToast(safeMsg, safeIcon);
    }
  };

  const originalToggleBox = window.toggleBox;
  window.toggleBox = function(boxId) {
    if (!window.vmSession) return requireSession();
    originalToggleBox(boxId);
    savePersistedState();
    addAudit('Cambio de box', `${boxId} quedó ${App.boxStates[boxId] ? 'ocupado' : 'disponible'}.`);
  };

  const originalSavePatient = window.savePatient;
  window.savePatient = function() {
    if (!window.vmSession) return requireSession();
    const error = document.getElementById('vmPatientError');
    if (error) error.textContent = '';
    const nombre = document.getElementById('p-nombre').value.trim();
    const rut = document.getElementById('p-rut').value.trim();
    if (!nombre || !rut) {
      if (error) error.textContent = 'Nombre y RUT son obligatorios.';
      return showToast('Datos incompletos', 'Completa nombre y RUT para registrar al paciente.', '⚠️');
    }
    if (!isValidRut(rut)) {
      if (error) error.textContent = 'El RUT no pasó la validación del dígito verificador.';
      return showToast('RUT inválido', 'Revisa el formato y el dígito verificador.', '⚠️');
    }
    if (App.patients.some(p => String(p.rut).trim().toUpperCase() === rut.toUpperCase())) {
      if (error) error.textContent = 'Ya existe un paciente con ese RUT en la sesión actual.';
      return showToast('Paciente duplicado', 'No se puede registrar dos veces el mismo RUT.', '⚠️');
    }
    const before = App.patients.length;
    originalSavePatient();
    const after = App.patients.length;
    if (after > before) {
      const latest = App.patients[App.patients.length - 1];
      latest.priority = document.getElementById('p-prioridad')?.value || 'normal';
      latest.status = document.getElementById('p-estado')?.value || 'admitido';
      latest.contact = document.getElementById('p-contacto')?.value.trim() || '';
      savePersistedState();
      addAudit('Admisión registrada', `${latest.nombre} ingresó con estado ${STATUS_LABELS[latest.status] || latest.status}.`);
      renderAudit();
    }
  };

  window.previewPDF = function() {
    if (!canUseReports()) return showToast('Acceso restringido', 'Solo médico o dirección pueden preparar informes.', '🔒');
    populatePDF();
    showToast('Vista previa lista', 'Revisa el formato. La impresión queda en el botón separado.', '🖨️');
  };

  const originalPopulatePDF = window.populatePDF;
  window.populatePDF = function() {
    originalPopulatePDF();
    const firma = document.getElementById('eco-firma')?.value.trim() || 'Pendiente';
    const estado = reportState();
    // Append estado + firma to the existing bottom code line
    const codeBottom = document.getElementById('pdf-codigo-bottom');
    if (codeBottom) {
      codeBottom.textContent += ` · Estado: ${STATUS_LABELS[estado] || estado} · Firma: ${firma}`;
    }
  };

  window.updateEcoPreview = function() {
    const nombre = document.getElementById('eco-nombre')?.value.trim() || '';
    const rut = document.getElementById('eco-rut')?.value.trim() || '';
    const edad = document.getElementById('eco-edad')?.value || '';
    const sexo = document.getElementById('eco-sexo')?.value || '';
    const fecha = document.getElementById('eco-fecha')?.value || '';
    const tipo = App.selectedTipo;
    const region = document.getElementById('eco-region')?.value.trim() || '';
    const indic = document.getElementById('eco-indicacion')?.value.trim() || '';
    const hall = document.getElementById('eco-hallazgos')?.value.trim() || '';
    const diag = document.getElementById('eco-diagnostico')?.value.trim() || '';
    const rec = document.getElementById('eco-recomendaciones')?.value.trim() || '';
    const informanteRaw = document.getElementById('eco-informante')?.value || '';
    const informante = informanteRaw.split('|')[0] || informanteRaw;
    const firma = document.getElementById('eco-firma')?.value.trim() || 'Pendiente';
    const estado = reportState();
    const preview = document.getElementById('eco-preview');
    if (!preview) return;
    if (!nombre && !hall && !tipo) {
      preview.textContent = 'Completar los campos para generar la vista previa...';
      preview.classList.remove('has-content');
      return;
    }
    const fechaStr = fecha ? new Date(fecha + 'T12:00').toLocaleDateString('es-CL',{ day:'2-digit', month:'long', year:'numeric' }) : 'Pendiente';
    const text = [
      `INFORME ECOGRÁFICO — ${tipo || 'Sin tipo'}`,
      `Estado del documento: ${STATUS_LABELS[estado] || estado}`,
      `Fecha del examen: ${fechaStr}`,
      '',
      `Paciente: ${nombre || 'Pendiente'} | RUT: ${rut || 'Pendiente'} | Edad: ${edad || '-'} años | Sexo: ${sexo || '-'}`,
      region ? `Región: ${region}` : '',
      indic ? `Indicación clínica: ${indic}` : '',
      '',
      'HALLAZGOS',
      hall || 'Completar hallazgos.',
      '',
      'IMPRESIÓN ECOGRÁFICA',
      diag || 'Completar impresión diagnóstica.',
      '',
      informante ? `Médico informante: ${informante}` : '',
      `Firma / código: ${firma}`,
      rec ? `\nRecomendaciones: ${rec}` : ''
    ].filter(l => l !== '').join('\n');
    preview.textContent = text;
    preview.classList.add('has-content');
  };

  const originalSaveEcoInforme = window.saveEcoInforme;
  window.saveEcoInforme = function() {
    if (!canUseReports()) return showToast('Acceso restringido', 'Solo médico o dirección pueden guardar informes.', '🔒');
    const error = document.getElementById('vmEcoError');
    if (error) error.textContent = '';
    const nombre = document.getElementById('eco-nombre').value.trim();
    const rut = document.getElementById('eco-rut').value.trim();
    const fecha = document.getElementById('eco-fecha').value;
    const solicitante = document.getElementById('eco-solicitante').value.trim();
    const informante = document.getElementById('eco-informante').value;
    const firma = document.getElementById('eco-firma')?.value.trim();
    const estado = reportState();
    if (!nombre || !rut || !fecha || !solicitante || !informante || !firma) {
      if (error) error.textContent = 'Completa nombre, RUT, fecha, solicitante, médico informante y firma/código.';
      return showToast('Campos clínicos faltantes', 'El informe requiere identificación completa antes de guardarse.', '⚠️');
    }
    if (!isValidRut(rut)) {
      if (error) error.textContent = 'El RUT del informe es inválido.';
      return showToast('RUT inválido', 'No se puede validar un informe con RUT incorrecto.', '⚠️');
    }
    const before = App.informes.length;
    const previousPrint = window.print;
    window.print = function() {};
    originalSaveEcoInforme();
    window.print = previousPrint;
    if (App.informes.length > before) {
      const inf = App.informes[App.informes.length - 1];
      inf.rut = rut; inf.fecha = fecha; inf.solicitante = solicitante; inf.informante = informante; inf.firma = firma; inf.estado = estado;
      savePersistedState();
      addAudit(estado === 'borrador' ? 'Informe guardado en borrador' : 'Informe guardado y validado', `${inf.nombre} - ${inf.tipo} quedó en estado ${STATUS_LABELS[estado] || estado}.`);
      showToast('Informe guardado', 'La impresión ahora es manual y solo para informes validados.', estado === 'borrador' ? '📝' : '✅');
    }
    updateEcoPreview();
  };

  function boot() {
    injectStyles();
    fixText();
    loadPersistedState();
    App.audit = App.audit || [];
    injectChrome();
    injectLogin();
    ensureTourUi();
    setupAccessibility();
    bindEnhancements();
    window.vmSession = loadSession();
    requireSession();
    renderAudit();
    updateEcoPreview();
    updateDashboardStats();
    addAudit('Aplicación reforzada', 'Se activó la capa de seguridad, persistencia y auditoría local.');
    loadBorradorLocally(); // Tarea 2: Cargar borrador al inicio
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
