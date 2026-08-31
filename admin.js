(function () {
  'use strict';

  const Store = window.LehrplanStore;
  const { mdToHtml, escapeHtml: esc } = window.MiniMarkdown;

  let state = Store.loadData();
  let currentView = { type: 'meta' };
  let saveTimer = null;

  // --------------------------------------------------------------------
  // Hilfsfunktionen: Daten finden/verändern
  // --------------------------------------------------------------------

  function findById(arr, id) {
    return arr.find((x) => x.id === id);
  }

  function findUnitAndGrade(unitId) {
    for (const g of state.grades) {
      const u = g.units.find((x) => x.id === unitId);
      if (u) return { grade: g, unit: u };
    }
    return { grade: null, unit: null };
  }

  function setPath(path, value) {
    const [scope, ownerId, field] = path.split('|');
    if (scope === 'meta') {
      state.meta[field] = value;
      return;
    }
    if (scope === 'unit') {
      const { unit } = findUnitAndGrade(ownerId);
      if (unit) unit[field] = value;
      return;
    }
    if (scope === 'general') {
      const s = findById(state.general, ownerId);
      if (s) s[field] = value;
      return;
    }
    if (scope === 'grade') {
      const g = findById(state.grades, ownerId);
      if (g) g[field] = value;
    }
  }

  function moveInArray(arr, id, delta) {
    const idx = arr.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= arr.length) return;
    const [item] = arr.splice(idx, 1);
    arr.splice(newIdx, 0, item);
  }

  // --------------------------------------------------------------------
  // Speicherstatus
  // --------------------------------------------------------------------

  function timeString() {
    return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }
  function setSaveStatus(text, saved) {
    const el = document.getElementById('save-status');
    el.textContent = text;
    el.classList.toggle('saved', !!saved);
  }
  function scheduleSave() {
    setSaveStatus('Wird lokal gespeichert …', false);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      Store.saveData(state);
      setSaveStatus('Änderungen lokal gespeichert · ' + timeString(), true);
    }, 500);
  }
  function persistNow() {
    clearTimeout(saveTimer);
    Store.saveData(state);
    setSaveStatus('Änderungen lokal gespeichert · ' + timeString(), true);
  }

  // --------------------------------------------------------------------
  // Rendering: Navigation
  // --------------------------------------------------------------------

  function viewKeyOf(view) {
    if (view.type === 'meta') return 'meta';
    if (view.type === 'general') return 'general';
    if (view.type === 'grade') return 'grade:' + view.gradeId;
    return '';
  }
  function parseViewKey(key) {
    if (key === 'meta') return { type: 'meta' };
    if (key === 'general') return { type: 'general' };
    if (key.startsWith('grade:')) return { type: 'grade', gradeId: key.slice(6) };
    return { type: 'meta' };
  }
  function navButtonHtml(key, label, sub) {
    const active = viewKeyOf(currentView) === key;
    return `<button data-nav="${esc(key)}" class="${active ? 'active' : ''} ${sub ? 'nav-sub' : ''}">${esc(
      label
    )}</button>`;
  }
  function renderNav() {
    const nav = document.getElementById('admin-nav');
    let html = '';
    html += navButtonHtml('meta', '⚙️ Allgemeine Angaben');
    html += navButtonHtml('general', '📄 Allgemeine Informationen');
    html += '<div class="nav-group-label">Jahrgangsstufen</div>';
    state.grades.forEach((g) => {
      html += navButtonHtml('grade:' + g.id, g.label, true);
    });
    html += `<button data-action="add-grade" class="nav-sub" style="opacity:.85;">+ Neue Jahrgangsstufe</button>`;
    nav.innerHTML = html;
  }

  // --------------------------------------------------------------------
  // Rendering: Editor-Bausteine
  // --------------------------------------------------------------------

  function markupHelpText() {
    return (
      '<strong>Formatierungshilfe:</strong> Leerzeile = neuer Absatz &nbsp;·&nbsp; ' +
      '<code>- Text</code> = Aufzählungspunkt &nbsp;·&nbsp; ' +
      '<code>### Text</code> = Zwischenüberschrift &nbsp;·&nbsp; ' +
      '<code>&gt; Text</code> = hervorgehobener Hinweis &nbsp;·&nbsp; ' +
      '<code>**Text**</code> = fett &nbsp;·&nbsp; ' +
      '<code>| Spalte 1 | Spalte 2 |</code> = Tabellenzeile (erste Zeile = Kopfzeile)'
    );
  }

  function editorBlockHtml(label, path, value) {
    return `
    <div class="field">
      <label>${esc(label)}</label>
      <div class="editor-block">
        <div class="editor-tabs">
          <button type="button" class="tab-btn active" data-tab="edit">Bearbeiten</button>
          <button type="button" class="tab-btn" data-tab="preview">Vorschau</button>
        </div>
        <textarea data-path="${esc(path)}" rows="6">${esc(value || '')}</textarea>
        <div class="preview-pane md" hidden></div>
      </div>
    </div>`;
  }

  // --------------------------------------------------------------------
  // Rendering: Allgemeine Angaben
  // --------------------------------------------------------------------

  function metaViewHtml() {
    const m = state.meta;
    return `
    <div class="card">
      <div class="card-head"><h3>Allgemeine Angaben</h3></div>
      <div class="field-row">
        <div class="field"><label for="f-schoolName">Name der Schule</label>
          <input type="text" id="f-schoolName" data-path="meta||schoolName" value="${esc(m.schoolName)}"></div>
        <div class="field"><label for="f-fach">Fach</label>
          <input type="text" id="f-fach" data-path="meta||fach" value="${esc(m.fach)}"></div>
        <div class="field"><label for="f-schulform">Schulform</label>
          <input type="text" id="f-schulform" data-path="meta||schulform" value="${esc(m.schulform)}"></div>
        <div class="field"><label for="f-stand">Fassung vom / Stand</label>
          <input type="text" id="f-stand" data-path="meta||stand" value="${esc(m.stand)}"></div>
      </div>
      <h3 style="margin-top:1.2rem;font-size:.95rem;">Verantwortliche der Fachgruppe</h3>
      <div class="field-row">
        <div class="field"><label for="f-vorsitz">Fachkonferenzvorsitz</label>
          <input type="text" id="f-vorsitz" data-path="meta||vorsitz" value="${esc(m.vorsitz)}"></div>
        <div class="field"><label for="f-stellv">Stellvertretung</label>
          <input type="text" id="f-stellv" data-path="meta||stellvertretung" value="${esc(m.stellvertretung)}"></div>
        <div class="field"><label for="f-material">Pflege der Lehr-/Lernmaterialien</label>
          <input type="text" id="f-material" data-path="meta||materialpflege" value="${esc(m.materialpflege)}"></div>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Passwort für den geschützten Bereich ändern</h3></div>
      <form id="password-form">
        <div class="field-row">
          <div class="field"><label for="pw-current">Aktuelles Passwort</label>
            <input type="password" id="pw-current" autocomplete="current-password" required></div>
          <div class="field"><label for="pw-new">Neues Passwort</label>
            <input type="password" id="pw-new" autocomplete="new-password" minlength="6" required></div>
          <div class="field"><label for="pw-confirm">Neues Passwort bestätigen</label>
            <input type="password" id="pw-confirm" autocomplete="new-password" minlength="6" required></div>
        </div>
        <div id="password-alert"></div>
        <button type="submit" class="btn btn-primary">Passwort ändern</button>
      </form>
    </div>
    <div class="card">
      <div class="card-head"><h3>Veröffentlichen</h3></div>
      <p class="field-hint" style="font-size:.88rem;">
        Änderungen werden zunächst nur lokal in diesem Browser gespeichert.
        Damit sie auf der öffentlichen Seite für alle sichtbar werden, oben
        rechts auf <strong>„Daten exportieren“</strong> klicken. Das lädt eine
        Datei <code>default-data.js</code> herunter, die im Projekt die
        gleichnamige Datei ersetzt (siehe README.md, Abschnitt
        „Veröffentlichen“) und dann committet/hochgeladen wird.
      </p>
    </div>`;
  }

  // --------------------------------------------------------------------
  // Rendering: Allgemeine Informationen
  // --------------------------------------------------------------------

  function generalCardHtml(s, idx, total) {
    return `
    <div class="card">
      <div class="card-head">
        <h3 style="flex:1 1 auto;">
          <input type="text" class="title-input" data-path="general|${s.id}|title" value="${esc(s.title)}">
        </h3>
        <div class="card-actions">
          <div class="move-buttons">
            <button class="btn btn-sm" data-action="move-general-up" data-general-id="${s.id}" ${
      idx === 0 ? 'disabled' : ''
    } title="Nach oben">▲</button>
            <button class="btn btn-sm" data-action="move-general-down" data-general-id="${s.id}" ${
      idx === total - 1 ? 'disabled' : ''
    } title="Nach unten">▼</button>
          </div>
          <button class="btn btn-sm btn-danger" data-action="delete-general" data-general-id="${s.id}">Löschen</button>
        </div>
      </div>
      ${editorBlockHtml('Inhalt', `general|${s.id}|body`, s.body)}
    </div>`;
  }

  function generalViewHtml() {
    const sections = state.general;
    let html = `<div class="markup-help">${markupHelpText()}</div>`;
    if (!sections.length) {
      html += '<p class="empty-state">Es wurden noch keine allgemeinen Informationen angelegt.</p>';
    }
    sections.forEach((s, idx) => {
      html += generalCardHtml(s, idx, sections.length);
    });
    html += `<button class="btn btn-primary" data-action="add-general">+ Neue allgemeine Information hinzufügen</button>`;
    return html;
  }

  // --------------------------------------------------------------------
  // Rendering: Jahrgangsstufen & Unterrichtsvorhaben
  // --------------------------------------------------------------------

  function unitCardHtml(u, idx, total) {
    return `
    <div class="card">
      <div class="field">
        <label>Titel des Unterrichtsvorhabens</label>
        <input type="text" data-path="unit|${u.id}|title" value="${esc(u.title)}">
      </div>
      <div class="field-row">
        <div class="field"><label>Kürzel (optional, z. B. „5.1-1“)</label>
          <input type="text" data-path="unit|${u.id}|code" value="${esc(u.code)}"></div>
        <div class="field"><label>Zeitbedarf</label>
          <input type="text" data-path="unit|${u.id}|zeitbedarf" value="${esc(
      u.zeitbedarf
    )}" placeholder="z. B. ca. 20 U-Std."></div>
      </div>
      <div class="card-actions" style="margin-bottom:.6rem;">
        <button class="btn btn-sm" data-action="move-unit-up" data-unit-id="${u.id}" ${
      idx === 0 ? 'disabled' : ''
    }>▲ Nach oben</button>
        <button class="btn btn-sm" data-action="move-unit-down" data-unit-id="${u.id}" ${
      idx === total - 1 ? 'disabled' : ''
    }>▼ Nach unten</button>
        <button class="btn btn-sm btn-danger" data-action="delete-unit" data-unit-id="${u.id}">Unterrichtsvorhaben löschen</button>
      </div>
      ${editorBlockHtml('Kompetenzschwerpunkte', `unit|${u.id}|kompetenzen`, u.kompetenzen)}
      ${editorBlockHtml('Fachliche Konkretisierungen', `unit|${u.id}|konkretisierungen`, u.konkretisierungen)}
      ${editorBlockHtml('Hinweise &amp; Absprachen', `unit|${u.id}|absprachen`, u.absprachen)}
    </div>`;
  }

  function gradeViewHtml(gradeId) {
    const g = findById(state.grades, gradeId);
    if (!g) return '<p class="empty-state">Diese Jahrgangsstufe wurde gelöscht. Bitte links eine andere auswählen.</p>';
    const idx = state.grades.findIndex((x) => x.id === gradeId);
    let html = `
    <div class="card">
      <div class="card-head">
        <h3 style="flex:1 1 auto;">
          <input type="text" class="title-input" data-path="grade|${g.id}|label" value="${esc(g.label)}">
        </h3>
        <div class="card-actions">
          <div class="move-buttons">
            <button class="btn btn-sm" data-action="move-grade-up" data-grade-id="${g.id}" ${
      idx === 0 ? 'disabled' : ''
    } title="Nach oben">▲</button>
            <button class="btn btn-sm" data-action="move-grade-down" data-grade-id="${g.id}" ${
      idx === state.grades.length - 1 ? 'disabled' : ''
    } title="Nach unten">▼</button>
          </div>
          <button class="btn btn-sm btn-danger" data-action="delete-grade" data-grade-id="${
            g.id
          }">Jahrgangsstufe löschen</button>
        </div>
      </div>
      <p class="field-hint">Diese Bezeichnung erscheint als Überschrift auf der öffentlichen Seite, z. B. „Jahrgangsstufe 5“.</p>
    </div>
    <div class="markup-help">${markupHelpText()}</div>`;

    if (!g.units.length) {
      html += '<p class="empty-state">Für diese Jahrgangsstufe wurden noch keine Unterrichtsvorhaben angelegt.</p>';
    }
    g.units.forEach((u, uIdx) => {
      html += unitCardHtml(u, uIdx, g.units.length);
    });
    html += `<button class="btn btn-primary" data-action="add-unit" data-grade-id="${g.id}">+ Neues Unterrichtsvorhaben hinzufügen</button>`;
    return html;
  }

  // --------------------------------------------------------------------
  // Haupt-Render
  // --------------------------------------------------------------------

  function renderMain() {
    const el = document.getElementById('admin-content');
    if (currentView.type === 'meta') el.innerHTML = metaViewHtml();
    else if (currentView.type === 'general') el.innerHTML = generalViewHtml();
    else if (currentView.type === 'grade') el.innerHTML = gradeViewHtml(currentView.gradeId);
  }

  function renderAll() {
    renderNav();
    renderMain();
  }

  // --------------------------------------------------------------------
  // Aktionen (Hinzufügen/Löschen/Verschieben)
  // --------------------------------------------------------------------

  function handleAction(action, ds) {
    switch (action) {
      case 'add-grade': {
        const label = window.prompt(
          'Bezeichnung der neuen Jahrgangsstufe (z. B. „Jahrgangsstufe 11“ oder „EF“):',
          'Neue Jahrgangsstufe'
        );
        if (label === null) return;
        const g = { id: Store.uid('jg'), label: label.trim() || 'Neue Jahrgangsstufe', units: [] };
        state.grades.push(g);
        persistNow();
        currentView = { type: 'grade', gradeId: g.id };
        renderAll();
        break;
      }
      case 'delete-grade': {
        const g = findById(state.grades, ds.gradeId);
        if (!g) return;
        if (
          !confirm(
            `Jahrgangsstufe „${g.label}“ inkl. ${g.units.length} Unterrichtsvorhaben wirklich löschen?`
          )
        )
          return;
        state.grades = state.grades.filter((x) => x.id !== ds.gradeId);
        persistNow();
        currentView = { type: 'meta' };
        renderAll();
        break;
      }
      case 'move-grade-up':
      case 'move-grade-down': {
        moveInArray(state.grades, ds.gradeId, action === 'move-grade-up' ? -1 : 1);
        persistNow();
        renderAll();
        break;
      }
      case 'add-general': {
        const s = { id: Store.uid('gen'), title: 'Neue Information', body: '' };
        state.general.push(s);
        persistNow();
        renderAll();
        break;
      }
      case 'delete-general': {
        if (!confirm('Diesen Abschnitt wirklich löschen?')) return;
        state.general = state.general.filter((x) => x.id !== ds.generalId);
        persistNow();
        renderAll();
        break;
      }
      case 'move-general-up':
      case 'move-general-down': {
        moveInArray(state.general, ds.generalId, action === 'move-general-up' ? -1 : 1);
        persistNow();
        renderAll();
        break;
      }
      case 'add-unit': {
        const g = findById(state.grades, ds.gradeId);
        if (!g) return;
        const u = {
          id: Store.uid('uv'),
          code: '',
          title: 'Neues Unterrichtsvorhaben',
          zeitbedarf: '',
          kompetenzen: '',
          konkretisierungen: '',
          absprachen: '',
        };
        g.units.push(u);
        persistNow();
        renderAll();
        break;
      }
      case 'delete-unit': {
        const { grade } = findUnitAndGrade(ds.unitId);
        if (!grade) return;
        if (!confirm('Dieses Unterrichtsvorhaben wirklich löschen?')) return;
        grade.units = grade.units.filter((u) => u.id !== ds.unitId);
        persistNow();
        renderAll();
        break;
      }
      case 'move-unit-up':
      case 'move-unit-down': {
        const { grade } = findUnitAndGrade(ds.unitId);
        if (!grade) return;
        moveInArray(grade.units, ds.unitId, action === 'move-unit-up' ? -1 : 1);
        persistNow();
        renderAll();
        break;
      }
      default:
        break;
    }
  }

  function switchTab(tabBtn) {
    const block = tabBtn.closest('.editor-block');
    const tab = tabBtn.dataset.tab;
    block.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === tabBtn));
    const textarea = block.querySelector('textarea');
    const preview = block.querySelector('.preview-pane');
    if (tab === 'preview') {
      preview.innerHTML = mdToHtml(textarea.value) || '<p class="empty-state">Kein Inhalt.</p>';
      textarea.hidden = true;
      preview.hidden = false;
    } else {
      textarea.hidden = false;
      preview.hidden = true;
    }
  }

  // --------------------------------------------------------------------
  // Login
  // --------------------------------------------------------------------

  async function tryLogin(pw) {
    const alertEl = document.getElementById('login-alert');
    alertEl.innerHTML = '';
    try {
      const ok = await Store.checkPassword(pw, state);
      if (ok) {
        Store.setAuthed(true);
        showApp();
      } else {
        alertEl.innerHTML = '<div class="alert alert-error">Falsches Passwort. Bitte erneut versuchen.</div>';
      }
    } catch (e) {
      alertEl.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
    }
  }

  async function handlePasswordChange() {
    const current = document.getElementById('pw-current').value;
    const next = document.getElementById('pw-new').value;
    const confirmPw = document.getElementById('pw-confirm').value;
    const alertEl = document.getElementById('password-alert');
    alertEl.innerHTML = '';
    try {
      const ok = await Store.checkPassword(current, state);
      if (!ok) {
        alertEl.innerHTML = '<div class="alert alert-error">Aktuelles Passwort ist falsch.</div>';
        return;
      }
      if (next.length < 6) {
        alertEl.innerHTML = '<div class="alert alert-error">Das neue Passwort muss mindestens 6 Zeichen haben.</div>';
        return;
      }
      if (next !== confirmPw) {
        alertEl.innerHTML = '<div class="alert alert-error">Die neuen Passwörter stimmen nicht überein.</div>';
        return;
      }
      state.meta.adminPasswordHash = await Store.sha256Hex(next);
      persistNow();
      alertEl.innerHTML = '<div class="alert alert-success">Passwort erfolgreich geändert.</div>';
      document.getElementById('password-form').reset();
    } catch (e) {
      alertEl.innerHTML = `<div class="alert alert-error">${esc(e.message)}</div>`;
    }
  }

  async function handleImport(inputEl) {
    const file = inputEl.files[0];
    if (!file) return;
    try {
      const imported = await Store.importDataFromFile(file);
      if (
        !confirm(
          'Die importierte Datei ersetzt alle aktuell in diesem Browser angezeigten Inhalte. Fortfahren?'
        )
      ) {
        inputEl.value = '';
        return;
      }
      state = imported;
      persistNow();
      currentView = { type: 'meta' };
      renderAll();
    } catch (err) {
      alert(err.message);
    } finally {
      inputEl.value = '';
    }
  }

  function doReset() {
    if (
      !confirm(
        'Wirklich auf die mitgelieferten Beispieldaten zurücksetzen? Alle lokal in diesem Browser gespeicherten Änderungen gehen dabei verloren.'
      )
    )
      return;
    state = Store.resetData();
    currentView = { type: 'meta' };
    renderAll();
    setSaveStatus('Auf Beispieldaten zurückgesetzt', true);
  }

  function doLogout() {
    Store.setAuthed(false);
    location.reload();
  }

  function showApp() {
    document.getElementById('login-screen').hidden = true;
    document.getElementById('app-shell').hidden = false;
    renderAll();
  }

  // --------------------------------------------------------------------
  // Globale Event-Delegation (einmalig gebunden)
  // --------------------------------------------------------------------

  document.addEventListener('click', (e) => {
    if (e.target.closest('#btn-export')) {
      Store.exportData(state);
      return;
    }
    if (e.target.closest('#btn-reset')) {
      doReset();
      return;
    }
    if (e.target.closest('#btn-logout')) {
      doLogout();
      return;
    }
    const navBtn = e.target.closest('#admin-nav button[data-nav]');
    if (navBtn) {
      currentView = parseViewKey(navBtn.dataset.nav);
      renderAll();
      return;
    }
    const tabBtn = e.target.closest('.tab-btn');
    if (tabBtn) {
      switchTab(tabBtn);
      return;
    }
    const actionBtn = e.target.closest('button[data-action]');
    if (actionBtn) {
      handleAction(actionBtn.dataset.action, actionBtn.dataset);
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.dataset || !t.dataset.path) return;
    setPath(t.dataset.path, t.value);
    if (t.tagName === 'TEXTAREA') {
      const block = t.closest('.editor-block');
      const preview = block && block.querySelector('.preview-pane');
      if (preview) preview.innerHTML = mdToHtml(t.value) || '<p class="empty-state">Kein Inhalt.</p>';
    }
    scheduleSave();
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'login-form') {
      e.preventDefault();
      tryLogin(document.getElementById('login-password').value);
    } else if (e.target.id === 'password-form') {
      e.preventDefault();
      handlePasswordChange();
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'btn-import') handleImport(e.target);
  });

  // --------------------------------------------------------------------
  // Start
  // --------------------------------------------------------------------

  if (Store.isAuthed()) {
    showApp();
  } else {
    const pwField = document.getElementById('login-password');
    if (pwField) pwField.focus();
  }
})();
