(function () {
  'use strict';

  const { loadData } = window.LehrplanStore;
  const { mdToHtml, escapeHtml } = window.MiniMarkdown;

  const data = loadData();

  function formatDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return iso;
    }
  }

  function renderHeader() {
    const meta = data.meta || {};
    document.title = `Schulinterner Lehrplan ${meta.fach || 'Englisch'} – ${meta.schoolName || ''}`.trim();
    document.getElementById('school-title').textContent = `Schulinterner Lehrplan ${meta.fach || 'Englisch'}`;
    document.getElementById('school-subtitle').textContent =
      [meta.schoolName, meta.schulform].filter(Boolean).join(' · ');

    const metaList = document.getElementById('header-meta');
    const entries = [];
    if (meta.stand) entries.push(['Fassung vom', meta.stand]);
    if (meta.vorsitz) entries.push(['Fachkonferenzvorsitz', meta.vorsitz]);
    if (meta.stellvertretung) entries.push(['Stellvertretung', meta.stellvertretung]);
    if (meta.materialpflege) entries.push(['Lehr-/Lernmaterialien', meta.materialpflege]);
    metaList.innerHTML = entries
      .map(
        ([k, v]) =>
          `<div><dt>${escapeHtml(k)}:</dt><dd>${escapeHtml(v)}</dd></div>`
      )
      .join('');

    document.getElementById('footer-stand').textContent = meta.stand
      ? meta.stand
      : formatDate(meta.updatedAt) || 'unbekannt';
  }

  function renderGeneral() {
    const container = document.getElementById('general-list');
    const list = data.general || [];
    if (!list.length) {
      container.innerHTML = '<p class="empty-state">Es wurden noch keine allgemeinen Informationen hinterlegt.</p>';
      return;
    }
    container.innerHTML = list
      .map(
        (section) => `
        <details class="accordion" data-general-id="${escapeHtml(section.id)}">
          <summary><span class="summary-title">${escapeHtml(section.title)}</span></summary>
          <div class="accordion-body md">${mdToHtml(section.body)}</div>
        </details>`
      )
      .join('');
  }

  function unitSearchText(unit) {
    return [unit.code, unit.title, unit.zeitbedarf, unit.kompetenzen, unit.konkretisierungen, unit.absprachen]
      .filter(Boolean)
      .join(' \n ')
      .toLowerCase();
  }

  function renderGrades() {
    const container = document.getElementById('grades-list');
    const grades = data.grades || [];
    const countHint = document.getElementById('grades-count-hint');
    const totalUnits = grades.reduce((sum, g) => sum + (g.units ? g.units.length : 0), 0);
    countHint.textContent = grades.length
      ? `${grades.length} Jahrgangsstufen · ${totalUnits} Unterrichtsvorhaben`
      : '';

    if (!grades.length) {
      container.innerHTML = '<p class="empty-state">Es wurden noch keine Jahrgangsstufen angelegt.</p>';
      return;
    }

    container.innerHTML = grades
      .map((grade) => {
        const units = grade.units || [];
        const unitsHtml = units.length
          ? units
              .map(
                (unit) => `
              <details class="accordion nested" data-unit-id="${escapeHtml(unit.id)}" data-search="${escapeHtml(
                  unitSearchText(unit)
                )}">
                <summary>
                  <span class="summary-title">${unit.code ? `<span class="badge">${escapeHtml(unit.code)}</span> ` : ''}${escapeHtml(
                  unit.title
                )}</span>
                  <span class="summary-meta">${unit.zeitbedarf ? `<span class="badge badge-accent">${escapeHtml(unit.zeitbedarf)}</span>` : ''}</span>
                </summary>
                <div class="accordion-body">
                  <div class="unit-columns">
                    <div class="unit-column">
                      <h4>Kompetenzschwerpunkte</h4>
                      <div class="md">${mdToHtml(unit.kompetenzen) || '<p class="empty-state">–</p>'}</div>
                    </div>
                    <div class="unit-column">
                      <h4>Fachliche Konkretisierungen</h4>
                      <div class="md">${mdToHtml(unit.konkretisierungen) || '<p class="empty-state">–</p>'}</div>
                    </div>
                    <div class="unit-column">
                      <h4>Hinweise &amp; Absprachen</h4>
                      <div class="md">${mdToHtml(unit.absprachen) || '<p class="empty-state">–</p>'}</div>
                    </div>
                  </div>
                </div>
              </details>`
              )
              .join('')
          : '<p class="empty-state">Für diese Jahrgangsstufe wurden noch keine Unterrichtsvorhaben angelegt.</p>';

        return `
        <details class="accordion" data-grade-id="${escapeHtml(grade.id)}">
          <summary>
            <span class="summary-title">${escapeHtml(grade.label)}</span>
            <span class="summary-meta"><span class="badge">${units.length} Unterrichtsvorhaben</span></span>
          </summary>
          <div class="accordion-body">${unitsHtml}</div>
        </details>`;
      })
      .join('');
  }

  function setupSearch() {
    const input = document.getElementById('unit-search');
    input.addEventListener('input', () => {
      const term = input.value.trim().toLowerCase();
      const gradeDetails = document.querySelectorAll('#grades-list > details[data-grade-id]');
      gradeDetails.forEach((gradeEl) => {
        const unitEls = gradeEl.querySelectorAll('details[data-unit-id]');
        let visibleCount = 0;
        unitEls.forEach((unitEl) => {
          const matches = !term || unitEl.dataset.search.includes(term);
          unitEl.style.display = matches ? '' : 'none';
          if (matches) visibleCount += 1;
          if (term && matches) unitEl.open = true;
          if (!term) unitEl.open = false;
        });
        const hasUnits = unitEls.length > 0;
        gradeEl.style.display = !term || !hasUnits || visibleCount > 0 ? '' : 'none';
        if (term && hasUnits) gradeEl.open = visibleCount > 0;
        if (!term) gradeEl.open = false;
      });
    });
  }

  function setupToolbar() {
    document.getElementById('expand-all').addEventListener('click', () => {
      document.querySelectorAll('details.accordion').forEach((d) => (d.open = true));
    });
    document.getElementById('collapse-all').addEventListener('click', () => {
      document.querySelectorAll('details.accordion').forEach((d) => (d.open = false));
    });
    document.getElementById('print-page').addEventListener('click', () => {
      const openBefore = new Set();
      document.querySelectorAll('details.accordion').forEach((d) => {
        if (d.open) openBefore.add(d);
        d.open = true;
      });
      window.print();
      // Ursprünglichen Zustand nach dem Druckdialog wiederherstellen.
      setTimeout(() => {
        document.querySelectorAll('details.accordion').forEach((d) => {
          d.open = openBefore.has(d);
        });
      }, 300);
    });
  }

  renderHeader();
  renderGeneral();
  renderGrades();
  setupSearch();
  setupToolbar();
})();
