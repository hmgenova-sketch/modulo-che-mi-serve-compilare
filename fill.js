/* Fills template.pdf (3 pages) with the answers. Works in the browser and in Node (for testing). */
(function (root) {
  var PAGE_H = 830.84;
  var SIZE = 10.0;
  var INK = [0.12, 0.12, 0.14];

  // ---------- text helpers ----------
  function dmy(iso) {                       // 2025-01-17 -> 17/01/2025
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? m[3] + "/" + m[2] + "/" + m[1] : (iso || "");
  }
  function U(s) { return String(s || "").trim().replace(/\s+/g, " ").toUpperCase(); }
  function T(s) { return String(s || "").trim().replace(/\s+/g, " "); }

  function buildTexts(v) {
    var empF = v.empSex === "F", wkF = v.wkSex === "F", childF = v.childSex !== "M";
    var employer = U(v.empSurname + " " + v.empName);
    var worker = U(v.wkSurname + " " + v.wkName);
    var child = U(v.child);

    var employerPara =
      (empF ? "La Sig.ra " : "Il Sig. ") + employer + (empF ? " nata il " : " nato il ") + dmy(v.empBirth) +
      " a " + U(v.empBirthPlace) + " e residente a " + U(v.empComune) + " " + U(v.empAddress) +
      " CAP " + T(v.empCap) + " Codice Fiscale " + U(v.empCf) + " Cittadinanza " + U(v.empCit) +
      " documento di riconoscimento " + T(v.empDocType) + " " + U(v.empDocNum) +
      " con emessa il " + dmy(v.empDocIssue) + ".";

    var workerPara =
      "Cognome " + U(v.wkSurname) + " nome " + U(v.wkName) + " sesso " + (wkF ? "FEMMINA" : "MASCHIO") +
      " nato il " + dmy(v.wkBirth) + " Stato di nascita " + U(v.wkBirthState) +
      " cittadinanza " + U(v.wkCit) + " estremi del passaporto " + U(v.wkPassport) +
      " con scadenza " + dmy(v.wkPassportExp) + ".";

    var narrative =
      "L\u2019assunzione " + (wkF ? "della lavoratrice straniera Sig.ra " : "del lavoratore straniero Sig. ") +
      worker + " \u00E8 finalizzata a garantire l\u2019assistenza e la cura " +
      (childF ? "della minore convivente " : "del minore convivente ") + child + ", " +
      (childF ? "nata il " : "nato il ") + dmy(v.childBirth) +
      ", appartenente al nucleo familiare anagrafico del datore di lavoro " + (empF ? "Sig.ra " : "Sig. ") + employer +
      ", come risultante dal certificato di stato di famiglia rilasciato dall\u2019ANPR in data " +
      dmy(v.anprDate) + ".";

    return {
      employerPara: employerPara, workerPara: workerPara, narrative: narrative,
      ccnl: "_" + U(v.ccnl), mansioni: "_" + U(v.mansioni), inquadramento: "_" + U(v.inquadramento),
      livello: "_" + U(v.livello), tipologiaContr: "_" + U(v.tipologiaContr), durata: T(v.durata),
      orario: "_" + U(v.orario), retribuzione: T(v.retribuzione), luogo: U(v.luogo),
      allo: U(v.alloComune) + " " + U(v.alloAddress) + " CAP " + T(v.alloCap),
      locazione: T(v.locazione), decurtazione: T(v.decurtazione),
      fonte: U(v.fonte), euro: T(v.income) + "\u20AC", dip: T(v.dipendenti) + ";",
      type: T(v.type), income3: T(v.income) + ",", date: dmy(v.docDate)
    };
  }

  // ---------- layout ----------
  // Each line: x = where text starts, xMax = right limit, y = baseline measured from the TOP of the page (pt)
  function wrapInto(text, font, lines) {
    var words = text.split(/\s+/).filter(Boolean);
    var space = font.widthOfTextAtSize(" ", SIZE);
    var out = lines.map(function (l) { return { x: l.x, xMax: l.xMax, y: l.y, words: [], w: 0 }; });
    var i = 0;
    words.forEach(function (w) {
      var ww = font.widthOfTextAtSize(w, SIZE);
      for (;;) {
        if (i >= out.length) throw new Error("TOO_LONG");
        var L = out[i], need = L.words.length ? L.w + space + ww : ww;
        if (L.words.length && L.x + need > L.xMax) { i++; continue; }
        L.words.push(w); L.w = need; break;
      }
    });
    return out.filter(function (l) { return l.words.length; });
  }

  function drawBlock(page, font, text, lines, justify, label) {
    var PDFLib = root.PDFLib, laid;
    try { laid = wrapInto(text, font, lines); }
    catch (e) { if (e.message === "TOO_LONG") throw new Error("Testo troppo lungo: " + label + " (non entra nello spazio disponibile). Accorcia i dati."); throw e; }
    var space = font.widthOfTextAtSize(" ", SIZE);
    laid.forEach(function (ln, i) {
      var ws = ln.words.map(function (w) { return font.widthOfTextAtSize(w, SIZE); });
      var total = ws.reduce(function (a, b) { return a + b; }, 0);
      var gap = space;
      if (justify && i < laid.length - 1 && ln.words.length > 1) {
        gap = (ln.xMax - ln.x - total) / (ln.words.length - 1);
        if (gap > 3 * space || gap < space * 0.6) gap = space;
      }
      var x = ln.x;
      ln.words.forEach(function (w, k) {
        page.drawText(w, { x: x, y: PAGE_H - ln.y, size: SIZE, font: font, color: PDFLib.rgb(INK[0], INK[1], INK[2]) });
        x += ws[k] + gap;
      });
    });
  }

  function drawOne(page, font, text, x, y, xLimit, label) {
    if (x + font.widthOfTextAtSize(text, SIZE) > xLimit) throw new Error("Testo troppo lungo: " + label + ".");
    page.drawText(text, { x: x, y: PAGE_H - y, size: SIZE, font: font, color: root.PDFLib.rgb(INK[0], INK[1], INK[2]) });
  }

  async function fillPdf(values, templateBytes, fontBytes) {
    var PDFLib = root.PDFLib;
    var doc = await PDFLib.PDFDocument.load(templateBytes);
    doc.registerFontkit(root.fontkit);
    var font = await doc.embedFont(fontBytes, { subset: true });
    var pages = doc.getPages();
    var p1 = pages[0], p2 = pages[1], p3 = pages[2];
    var t = buildTexts(values);
    var R = 529.6;

    // ===== PAGE 1 =====
    drawBlock(p1, font, t.employerPara, [
      { x: 58.3, xMax: R, y: 307.0 }, { x: 58.3, xMax: R, y: 321.3 }, { x: 58.3, xMax: R, y: 335.6 }
    ], true, "datore di lavoro (max 3 righe)");

    p1.drawText("1)", { x: 76.3, y: PAGE_H - 427.0, size: SIZE, font: font, color: PDFLib.rgb(INK[0], INK[1], INK[2]) });
    drawBlock(p1, font, t.workerPara, [
      { x: 92.8, xMax: 530.3, y: 427.0 }, { x: 76.3, xMax: 530.3, y: 441.4 }, { x: 76.3, xMax: 530.3, y: 455.9 }
    ], true, "lavoratore (max 3 righe)");

    drawOne(p1, font, t.ccnl, 197.3, 503.0, 535, "contratto collettivo");
    drawOne(p1, font, t.mansioni, 197.5, 525.0, 535, "mansioni");
    drawOne(p1, font, t.inquadramento, 197.5, 547.5, 535, "inquadramento");
    drawOne(p1, font, t.livello, 197.5, 570.0, 535, "livello");
    drawOne(p1, font, t.tipologiaContr, 197.5, 592.5, 535, "tipologia contrattuale");
    drawOne(p1, font, t.durata, 197.5, 614.5, 535, "durata del contratto");
    drawOne(p1, font, t.orario, 197.5, 636.5, 535, "orario di lavoro");
    drawOne(p1, font, t.retribuzione, 108.5, 673.0, 535, "retribuzione");
    drawOne(p1, font, t.luogo, 134.1, 717.5, 535, "luogo di lavoro");

    // ===== PAGE 2 =====
    drawOne(p2, font, t.allo, 117.0, 81.5, 532, "alloggio (comune / indirizzo / CAP)");
    drawOne(p2, font, t.locazione, 247.7, 104.0, 264.5, "in locazione");
    drawOne(p2, font, t.decurtazione, 411.2, 104.0, 440, "decurtazione");
    drawBlock(p2, font, t.fonte, [{ x: 491.2, xMax: 535, y: 215.0 }, { x: 94.3, xMax: R, y: 229.5 }], false, "fonte del reddito");
    drawOne(p2, font, t.euro, 476.5, 251.5, 530, "reddito");
    drawOne(p2, font, t.dip, 239.2, 302.5, 330, "dipendenti");

    // ===== PAGE 3 =====
    drawBlock(p3, font, t.narrative, [0, 1, 2, 3].map(function (i) { return { x: 57.3, xMax: 528.8, y: 121.3 + i * 14.7 }; }), true, "paragrafo dell\u2019assunzione (max 4 righe)");
    drawBlock(p3, font, t.type, [{ x: 247.5, xMax: 528.8, y: 201.8 }, { x: 57.3, xMax: 528.8, y: 216.3 }], false, "tipologia (max 2 righe)");
    drawOne(p3, font, t.income3, 499.0, 289.0, 565, "reddito");
    drawOne(p3, font, t.date, 101.5, 520.6, 300, "data");

    doc.setTitle("Asseverazione");
    doc.setProducer(""); doc.setCreator("");
    return await doc.save();
  }

  root.FillPdf = { fillPdf: fillPdf, buildTexts: buildTexts };
  if (typeof module !== "undefined") module.exports = root.FillPdf;
})(typeof window !== "undefined" ? window : globalThis);
