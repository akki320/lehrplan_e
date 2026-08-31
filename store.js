/**
 * Gemeinsame Datenhaltung für die öffentliche Seite und den geschützten
 * Bereich.
 *
 * Wichtiger Hinweis zur Architektur (siehe auch README.md):
 * Diese Seite läuft komplett ohne Server/Datenbank (reines HTML/JS, z. B.
 * über GitHub Pages). Der "geschützte Bereich" ist daher ein einfacher,
 * passwortbasierter Zugriffsschutz auf Browser-Ebene – kein Ersatz für ein
 * echtes Login mit Server. Er verhindert, dass Inhalte versehentlich oder
 * von Unbeteiligten am eigenen Gerät verändert werden.
 *
 * Bearbeitungen werden zunächst nur lokal im Browser der bearbeitenden
 * Person gespeichert (localStorage), damit während der Arbeit nichts
 * verloren geht. Damit alle anderen (auf der öffentlichen Seite) die
 * Änderungen sehen, müssen die Daten über "Als Datei exportieren"
 * heruntergeladen und als default-data.js/ Datenimport im Projekt
 * veröffentlicht werden (siehe README.md, Abschnitt "Veröffentlichen").
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'fkEnglisch.lehrplan.data.v1';
  const AUTH_KEY = 'fkEnglisch.lehrplan.auth.v1';
  const GITHUB_CFG_KEY = 'fkEnglisch.lehrplan.githubPublish.v1';

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getDefaultData() {
    if (!global.DEFAULT_DATA) {
      throw new Error('default-data.js wurde nicht geladen.');
    }
    return deepClone(global.DEFAULT_DATA);
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Konnte gespeicherte Daten nicht lesen, verwende Beispieldaten.', e);
    }
    return getDefaultData();
  }

  function saveData(data) {
    data.meta = data.meta || {};
    data.meta.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  function resetData() {
    localStorage.removeItem(STORAGE_KEY);
    return getDefaultData();
  }

  function hasLocalOverride() {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  // Der Export erzeugt bewusst dieselbe Datei, die im Projekt als
  // default-data.js ausgeliefert wird: "Veröffentlichen" bedeutet dadurch
  // einfach "heruntergeladene Datei -> default-data.js ersetzen", ohne
  // dass jemand von Hand JSON in JavaScript einbetten müsste.
  function toDefaultDataJs(data) {
    return 'window.DEFAULT_DATA = ' + JSON.stringify(data, null, 2) + ';\n';
  }

  function exportData(data) {
    const js = toDefaultDataJs(data);
    const blob = new Blob([js], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'default-data.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function parseDataText(text) {
    const trimmed = text.trim();
    try {
      // Fall 1: reines JSON.
      return JSON.parse(trimmed);
    } catch (e) {
      // Fall 2: exportierte default-data.js ("window.DEFAULT_DATA = {...};").
      const match = trimmed.match(/window\.DEFAULT_DATA\s*=\s*([\s\S]*?);?\s*$/);
      if (match) {
        return JSON.parse(match[1]);
      }
      throw new Error('Die Datei konnte nicht gelesen werden (weder JSON noch default-data.js).');
    }
  }

  function importDataFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = parseDataText(reader.result);
          if (!parsed || !Array.isArray(parsed.grades) || !Array.isArray(parsed.general)) {
            reject(new Error('Die Datei enthält kein gültiges Lehrplan-Datenformat.'));
            return;
          }
          resolve(parsed);
        } catch (e) {
          reject(new Error('Die Datei konnte nicht gelesen werden: ' + e.message));
        }
      };
      reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
      reader.readAsText(file, 'utf-8');
    });
  }

  async function sha256Hex(text) {
    if (!(global.crypto && global.crypto.subtle)) {
      throw new Error(
        'Web Crypto ist in diesem Kontext nicht verfügbar. Bitte die Seite über ' +
          'http(s) aufrufen (z. B. GitHub Pages), nicht direkt als lokale Datei.'
      );
    }
    const enc = new TextEncoder().encode(text);
    const buf = await global.crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function checkPassword(input, data) {
    const hash = await sha256Hex(input);
    return !!data.meta && hash === data.meta.adminPasswordHash;
  }

  function isAuthed() {
    return sessionStorage.getItem(AUTH_KEY) === '1';
  }

  function setAuthed(value) {
    if (value) sessionStorage.setItem(AUTH_KEY, '1');
    else sessionStorage.removeItem(AUTH_KEY);
  }

  // --------------------------------------------------------------------
  // Direktes Veröffentlichen über die GitHub-API
  //
  // Alternative zum manuellen Export+Upload: Statt die Datei herunterzu-
  // laden und von Hand im Repository zu ersetzen, kann der geschützte
  // Bereich die aktualisierte default-data.js direkt per GitHub-REST-API
  // committen. Dafür wird ein persönliches GitHub-Zugangs-Token benötigt
  // (am besten ein "fine-grained" Token mit "Contents: Read and write"
  // nur für dieses eine Repository). Das Token verlässt den Browser
  // ausschließlich in Richtung api.github.com und wird nirgendwo sonst
  // gespeichert oder übertragen.
  // --------------------------------------------------------------------

  function loadGithubConfig() {
    try {
      const raw = localStorage.getItem(GITHUB_CFG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveGithubConfig(cfg) {
    localStorage.setItem(GITHUB_CFG_KEY, JSON.stringify(cfg));
  }

  function clearGithubConfig() {
    localStorage.removeItem(GITHUB_CFG_KEY);
  }

  // Robuste UTF-8 -> Base64 Kodierung (btoa allein kann keine Umlaute etc.)
  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  async function githubApiRequest(cfg, method, extraBody) {
    const path = (cfg.path || 'default-data.js').replace(/^\/+/, '');
    const url =
      `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}` +
      `/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
    const query = method === 'GET' ? `?ref=${encodeURIComponent(cfg.branch || 'main')}` : '';
    const resp = await fetch(url + query, {
      method,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: extraBody ? JSON.stringify(extraBody) : undefined,
    });
    let json = null;
    try {
      json = await resp.json();
    } catch (e) {
      // ignore, handled via resp.ok below
    }
    if (!resp.ok) {
      const msg = (json && json.message) || `HTTP ${resp.status}`;
      if (resp.status === 401) {
        throw new Error('Token ungültig oder abgelaufen (401). Bitte ein neues Token hinterlegen.');
      }
      if (resp.status === 404) {
        throw new Error(
          'Repository/Datei nicht gefunden (404). Bitte Owner, Repository-Name, Branch und Pfad prüfen ' +
            'sowie ob das Token Zugriff auf dieses Repository hat.'
        );
      }
      if (resp.status === 403) {
        throw new Error(
          'Zugriff verweigert (403). Bei einem fine-grained Token muss "Contents: Read and write" für ' +
            'dieses Repository gesetzt sein; bei einem klassischen Token muss der Scope "repo" angehakt sein.'
        );
      }
      if (resp.status === 409) {
        throw new Error(
          'Die Datei wurde zwischenzeitlich geändert (z. B. durch einen weiteren Klick oder eine andere ' +
            'Veröffentlichung). Bitte einfach erneut auf „Direkt veröffentlichen" klicken.'
        );
      }
      throw new Error('GitHub-API-Fehler: ' + msg);
    }
    return json;
  }

  async function publishToGithub(data, cfg) {
    if (!cfg || !cfg.owner || !cfg.repo || !cfg.token) {
      throw new Error('GitHub-Veröffentlichung ist noch nicht eingerichtet (Owner/Repository/Token fehlen).');
    }
    const current = await githubApiRequest(cfg, 'GET');
    const sha = current && current.sha;
    const content = toDefaultDataJs(data);
    const result = await githubApiRequest(cfg, 'PUT', {
      message: 'Lehrplan-Inhalte aktualisiert (über geschützten Bereich)',
      content: utf8ToBase64(content),
      sha,
      branch: cfg.branch || 'main',
    });
    return {
      commitUrl: result && result.commit && result.commit.html_url,
    };
  }

  function uid(prefix) {
    return (
      (prefix ? prefix + '-' : '') +
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 7)
    );
  }

  global.LehrplanStore = {
    loadData,
    saveData,
    resetData,
    hasLocalOverride,
    exportData,
    importDataFromFile,
    sha256Hex,
    checkPassword,
    isAuthed,
    setAuthed,
    deepClone,
    uid,
    loadGithubConfig,
    saveGithubConfig,
    clearGithubConfig,
    publishToGithub,
  };
})(window);
