/**
 * Mini-Markdown: ein sehr kleines, absichtlich eingeschränktes Textformat
 * für die Lehrplan-Inhalte. Es wird sowohl auf der öffentlichen Seite zur
 * Anzeige als auch im geschützten Bereich für die Live-Vorschau benutzt.
 *
 * Unterstützte Syntax (siehe auch die Formatierungshilfe im Admin-Bereich):
 *   Leerzeile        -> neuer Absatz
 *   - Text            -> Aufzählungspunkt
 *   ### Text          -> Zwischenüberschrift
 *   > Text            -> hervorgehobener Hinweis
 *   | A | B | C |     -> Tabellenzeile (erste Zeile = Kopfzeile)
 *   **Text**          -> fett
 *   *Text*            -> kursiv
 *
 * Es wird bewusst kein rohes HTML zugelassen: aller Text wird zunächst
 * escaped, damit im geschützten Bereich eingegebene Inhalte die Seite
 * niemals durch eingebettetes Markup/Skripte gefährden können.
 */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function inline(escapedText) {
    // Reihenfolge wichtig: fett vor kursiv, da ** aus zwei * besteht.
    return escapedText
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  }

  function renderInline(rawLine) {
    return inline(escapeHtml(rawLine));
  }

  function mdToHtml(text) {
    if (!text) return '';
    const lines = String(text).replace(/\r\n/g, '\n').split('\n');

    let html = '';
    let mode = null; // null | 'p' | 'ul' | 'table'
    let buf = [];
    let tableRows = [];

    function flushP() {
      if (buf.length) html += '<p>' + buf.join('<br>') + '</p>';
      buf = [];
      mode = null;
    }
    function flushUl() {
      if (buf.length) {
        html += '<ul>' + buf.map((li) => '<li>' + li + '</li>').join('') + '</ul>';
      }
      buf = [];
      mode = null;
    }
    function flushTable() {
      if (tableRows.length) {
        const head = tableRows[0];
        const rest = tableRows.slice(1);
        html +=
          '<div class="table-wrap"><table><thead><tr>' +
          head.map((h) => '<th>' + h + '</th>').join('') +
          '</tr></thead><tbody>' +
          rest
            .map((r) => '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>')
            .join('') +
          '</tbody></table></div>';
      }
      tableRows = [];
      mode = null;
    }
    function flushAny() {
      if (mode === 'p') flushP();
      else if (mode === 'ul') flushUl();
      else if (mode === 'table') flushTable();
    }

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (line === '') {
        if (mode === 'p') flushP();
        // Leerzeilen innerhalb von Listen/Tabellen werden ignoriert,
        // damit zusammengehörige Punkte nicht auseinandergerissen werden.
        continue;
      }

      if (line.startsWith('### ')) {
        flushAny();
        html += '<h4>' + renderInline(line.slice(4).trim()) + '</h4>';
        continue;
      }

      if (line.startsWith('> ')) {
        flushAny();
        html += '<blockquote><p>' + renderInline(line.slice(2).trim()) + '</p></blockquote>';
        continue;
      }

      if (line.startsWith('- ')) {
        if (mode !== 'ul') {
          flushAny();
          mode = 'ul';
          buf = [];
        }
        buf.push(renderInline(line.slice(2).trim()));
        continue;
      }

      if (/^\|.*\|$/.test(line)) {
        if (mode !== 'table') {
          flushAny();
          mode = 'table';
          tableRows = [];
        }
        const cells = line
          .slice(1, -1)
          .split('|')
          .map((c) => renderInline(c.trim()));
        tableRows.push(cells);
        continue;
      }

      // Normale Textzeile
      if (mode !== 'p') {
        flushAny();
        mode = 'p';
        buf = [];
      }
      buf.push(renderInline(line));
    }
    flushAny();
    return html;
  }

  global.MiniMarkdown = { mdToHtml, escapeHtml };
})(window);
