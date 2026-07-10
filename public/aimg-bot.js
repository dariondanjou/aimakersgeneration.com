/*  AI MAKERS BOT — floating chat widget
 *  Self-contained. Drop <script src="/aimg-bot.js" defer></script> on any page.
 *  Talks to POST /api/chat ({messages:[{role,content}]}) → {response}.
 *  Works anonymously (public Q&A). No dependencies, no build step.
 *  Optional: <script src="/aimg-bot.js" defer data-accent="#0F7B3F"></script>
 */
(function () {
  if (window.__aimgBotLoaded) return;
  window.__aimgBotLoaded = true;

  var script = document.currentScript || (function () {
    var s = document.getElementsByTagName("script");
    for (var i = s.length - 1; i >= 0; i--) if (/aimg-bot\.js/.test(s[i].src)) return s[i];
    return null;
  })();

  // Cohorts subdomain gets the forest accent; everything else gets AIMG green.
  var isCohorts = /(^|\.)cohorts\./.test(location.hostname);
  var ACCENT = (script && script.getAttribute("data-accent")) ||
    (isCohorts ? "#0F7B3F" : "#3E9E28");
  var ACCENT_HOVER = isCohorts ? "#0c6633" : "#2f7d1f";

  var GREETING =
    "Hey — I'm the AI MAKERS BOT 👋\n\nAsk me anything about Film Bar AI (every Tuesday), the Summer 2026 cohort, Workshop Wednesdays, or how to get involved with AI MAKERS GENERATION.";

  var SUGGESTIONS = [
    "When's the next Film Bar AI?",
    "Tell me about the cohort",
    "How do I join the community?"
  ];

  // ---- styles ---------------------------------------------------------------
  var css = `
  .aimg-bot,.aimg-bot *{box-sizing:border-box}
  .aimg-bot{position:fixed;z-index:2147483000;right:20px;bottom:20px;
    font-family:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .aimg-bot__fab{display:flex;align-items:center;gap:10px;cursor:pointer;border:0;
    background:${ACCENT};color:#fff;border-radius:999px;padding:13px 18px 13px 14px;
    box-shadow:0 8px 28px rgba(0,0,0,.24);font-size:15px;font-weight:600;
    transition:transform .15s ease,background .15s ease;line-height:1}
  .aimg-bot__fab:hover{background:${ACCENT_HOVER};transform:translateY(-1px)}
  .aimg-bot__fab img{width:26px;height:26px;border-radius:50%;background:#fff;object-fit:contain;padding:2px}
  .aimg-bot__fab .aimg-bot__dot{width:9px;height:9px;border-radius:50%;background:#6FCF4B;
    box-shadow:0 0 0 0 rgba(111,207,75,.7);animation:aimgPulse 2.2s infinite;margin-left:2px}
  @keyframes aimgPulse{0%{box-shadow:0 0 0 0 rgba(111,207,75,.6)}70%{box-shadow:0 0 0 8px rgba(111,207,75,0)}100%{box-shadow:0 0 0 0 rgba(111,207,75,0)}}
  .aimg-bot__panel{position:fixed;right:20px;bottom:20px;width:380px;max-width:calc(100vw - 32px);
    height:600px;max-height:calc(100vh - 40px);background:#fff;border-radius:18px;overflow:hidden;
    display:none;flex-direction:column;box-shadow:0 18px 60px rgba(0,0,0,.30);
    border:1px solid #E3E3DF;opacity:0;transform:translateY(12px) scale(.98);
    transition:opacity .18s ease,transform .18s ease}
  .aimg-bot--open .aimg-bot__panel{display:flex}
  .aimg-bot--shown .aimg-bot__panel{opacity:1;transform:translateY(0) scale(1)}
  .aimg-bot--open .aimg-bot__fab{display:none}
  .aimg-bot__head{display:flex;align-items:center;gap:11px;padding:14px 16px;background:${ACCENT};color:#fff}
  .aimg-bot__head img{width:34px;height:34px;border-radius:50%;background:#fff;object-fit:contain;padding:3px}
  .aimg-bot__title{font-weight:700;font-size:15px;line-height:1.1}
  .aimg-bot__status{font-size:12px;opacity:.85;display:flex;align-items:center;gap:5px;margin-top:2px}
  .aimg-bot__status::before{content:"";width:7px;height:7px;border-radius:50%;background:#6FCF4B}
  .aimg-bot__x{margin-left:auto;background:transparent;border:0;color:#fff;cursor:pointer;
    font-size:22px;line-height:1;padding:4px 6px;border-radius:8px;opacity:.9}
  .aimg-bot__x:hover{opacity:1;background:rgba(255,255,255,.15)}
  .aimg-bot__log{flex:1;overflow-y:auto;padding:16px;background:#F4F4F2;display:flex;flex-direction:column;gap:12px}
  .aimg-bot__msg{max-width:85%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}
  .aimg-bot__msg--bot{background:#fff;color:#1A1A1A;border:1px solid #E3E3DF;align-self:flex-start;border-bottom-left-radius:4px}
  .aimg-bot__msg--user{background:${ACCENT};color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
  .aimg-bot__msg a{color:${ACCENT};font-weight:600}
  .aimg-bot__msg--user a{color:#fff;text-decoration:underline}
  .aimg-bot__sug{display:flex;flex-wrap:wrap;gap:8px;padding:0 16px 8px}
  .aimg-bot__sug button{background:#fff;border:1px solid ${ACCENT};color:${ACCENT};border-radius:999px;
    padding:7px 12px;font-size:12.5px;font-weight:600;cursor:pointer;transition:background .12s}
  .aimg-bot__sug button:hover{background:#EAF7E4}
  .aimg-bot__typing{align-self:flex-start;background:#fff;border:1px solid #E3E3DF;border-radius:14px;
    border-bottom-left-radius:4px;padding:12px 14px;display:flex;gap:4px}
  .aimg-bot__typing span{width:7px;height:7px;border-radius:50%;background:#B7B7B2;animation:aimgBlink 1.2s infinite}
  .aimg-bot__typing span:nth-child(2){animation-delay:.2s}
  .aimg-bot__typing span:nth-child(3){animation-delay:.4s}
  @keyframes aimgBlink{0%,80%,100%{opacity:.3}40%{opacity:1}}
  .aimg-bot__form{display:flex;gap:8px;padding:12px;border-top:1px solid #E3E3DF;background:#fff}
  .aimg-bot__form textarea{flex:1;resize:none;border:1px solid #E3E3DF;border-radius:12px;padding:10px 12px;
    font:inherit;font-size:14px;max-height:96px;outline:none;color:#1A1A1A}
  .aimg-bot__form textarea:focus{border-color:${ACCENT}}
  .aimg-bot__send{background:${ACCENT};border:0;color:#fff;border-radius:12px;width:44px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;flex:0 0 44px}
  .aimg-bot__send:hover{background:${ACCENT_HOVER}}
  .aimg-bot__send:disabled{opacity:.5;cursor:default}
  .aimg-bot__foot{text-align:center;font-size:11px;color:#8A8A85;padding:0 12px 10px;background:#fff}
  @media (max-width:480px){
    .aimg-bot__panel{right:0;bottom:0;width:100vw;max-width:100vw;height:100vh;max-height:100vh;border-radius:0;border:0}
    .aimg-bot{right:16px;bottom:16px}
  }`;

  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---- markup ---------------------------------------------------------------
  var MARK = "/brand/aimg-mark-256.png";
  var root = document.createElement("div");
  root.className = "aimg-bot";
  root.innerHTML =
    '<button class="aimg-bot__fab" aria-label="Open the AI MAKERS BOT chat">' +
      '<img src="' + MARK + '" alt="" onerror="this.style.display=\'none\'">' +
      '<span>Ask the AI MAKERS BOT</span><span class="aimg-bot__dot"></span>' +
    '</button>' +
    '<div class="aimg-bot__panel" role="dialog" aria-label="AI MAKERS BOT chat">' +
      '<div class="aimg-bot__head">' +
        '<img src="' + MARK + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
        '<div><div class="aimg-bot__title">AI MAKERS BOT</div>' +
        '<div class="aimg-bot__status">Online · AI MAKERS GENERATION</div></div>' +
        '<button class="aimg-bot__x" aria-label="Close chat">×</button>' +
      '</div>' +
      '<div class="aimg-bot__log" aria-live="polite"></div>' +
      '<div class="aimg-bot__sug"></div>' +
      '<form class="aimg-bot__form">' +
        '<textarea rows="1" placeholder="Ask about Film Bar AI, the cohort…" aria-label="Message"></textarea>' +
        '<button type="submit" class="aimg-bot__send" aria-label="Send">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 20l18-8L3 4l3 8-3 8z" fill="currentColor"/></svg>' +
        '</button>' +
      '</form>' +
      '<div class="aimg-bot__foot">Powered by AI · answers may be imperfect</div>' +
    '</div>';
  document.body.appendChild(root);

  var fab = root.querySelector(".aimg-bot__fab");
  var panel = root.querySelector(".aimg-bot__panel");
  var log = root.querySelector(".aimg-bot__log");
  var sugWrap = root.querySelector(".aimg-bot__sug");
  var form = root.querySelector(".aimg-bot__form");
  var input = root.querySelector("textarea");
  var sendBtn = root.querySelector(".aimg-bot__send");
  var closeBtn = root.querySelector(".aimg-bot__x");

  var history = [];   // [{role, content}] sent to the API
  var busy = false;
  var greeted = false;

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  // Linkify URLs and bare emails; escape everything else first.
  function render(text) {
    var out = esc(text)
      .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]])/g,
        '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g,
        '<a href="mailto:$1">$1</a>');
    return out;
  }

  function addMsg(text, who) {
    var el = document.createElement("div");
    el.className = "aimg-bot__msg aimg-bot__msg--" + who;
    el.innerHTML = render(text);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function showSuggestions() {
    sugWrap.innerHTML = "";
    SUGGESTIONS.forEach(function (q) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = q;
      b.onclick = function () { sugWrap.innerHTML = ""; sendMessage(q); };
      sugWrap.appendChild(b);
    });
  }

  function typingOn() {
    var t = document.createElement("div");
    t.className = "aimg-bot__typing";
    t.innerHTML = "<span></span><span></span><span></span>";
    t.setAttribute("data-typing", "1");
    log.appendChild(t);
    log.scrollTop = log.scrollHeight;
    return t;
  }

  async function sendMessage(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    busy = true;
    sendBtn.disabled = true;
    sugWrap.innerHTML = "";
    addMsg(text, "user");
    history.push({ role: "user", content: text });
    input.value = "";
    input.style.height = "auto";
    var typing = typingOn();

    try {
      var res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history })
      });
      typing.remove();
      if (!res.ok) throw new Error("bad status " + res.status);
      var data = await res.json();
      var reply = (data && data.response) ||
        "Sorry — I hit a snag. Try again in a moment, or join the WhatsApp community: https://chat.whatsapp.com/IdfiaQhqeOuEpduKv2SvP5";
      addMsg(reply, "bot");
      history.push({ role: "assistant", content: reply });
    } catch (e) {
      if (typing.parentNode) typing.remove();
      addMsg("I couldn't reach the server just now. Please try again shortly, or reach us on WhatsApp: https://chat.whatsapp.com/IdfiaQhqeOuEpduKv2SvP5", "bot");
      history.pop(); // drop the unanswered user turn so retry works cleanly
    } finally {
      busy = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  function openPanel() {
    root.classList.add("aimg-bot--open");
    requestAnimationFrame(function () { root.classList.add("aimg-bot--shown"); });
    if (!greeted) {
      greeted = true;
      addMsg(GREETING, "bot");
      showSuggestions();
    }
    setTimeout(function () { input.focus(); }, 200);
  }
  function closePanel() {
    root.classList.remove("aimg-bot--shown");
    setTimeout(function () { root.classList.remove("aimg-bot--open"); }, 180);
  }

  fab.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);

  // Public API so a header icon / any element can open the bot:
  //   <a href="#" onclick="AIMGBot.open();return false">Chat</a>
  // or add [data-aimg-bot] to any element and it becomes a trigger.
  window.AIMGBot = {
    open: openPanel,
    close: closePanel,
    toggle: function () { root.classList.contains("aimg-bot--open") ? closePanel() : openPanel(); }
  };
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-aimg-bot]");
    if (t) { e.preventDefault(); openPanel(); }
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); sendMessage(input.value); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); }
  });
  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 96) + "px";
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && root.classList.contains("aimg-bot--open")) closePanel();
  });
})();
