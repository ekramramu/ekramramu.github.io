import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { collection, doc, getDoc, getDocs, getFirestore, orderBy, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-lite.js";
import { firebaseConfig } from "./firebase-config.js";

const FETCH_TIMEOUT_MS = 5000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out")), ms))
  ]);
}

const appRoot = document.querySelector("#app");

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

function text(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function externalLink(url) {
  const value = text(url).trim();
  return /^https?:\/\//i.test(value) || /^mailto:/i.test(value) ? value : "#";
}

const fallbackSettings = {
  title: "SDFC",
  tagline: "Official football club",
  sectionTitle: "সর্বশেষ আপডেট",
  footerText: "SDFC — মাঠে একতা, মাঠের বাইরে সম্মান।",
  heroImage: ""
};

const socialPlatforms = [
  ["facebook", "Facebook"],
  ["youtube", "YouTube"],
  ["instagram", "Instagram"],
  ["whatsapp", "WhatsApp"],
  ["email", "Email"]
];

const rules = [
  ["টিম ও খেলোয়াড়", ["প্রতিটি দলে সর্বোচ্চ ৭ জন খেলোয়াড় নিবন্ধিত থাকবে।", "মাঠে একসাথে খেলবে ৬ জন — ১ জন Goalkeeper + ৫ জন Outfield Player।", "১ জন Substitute থাকবে।", "Rolling Substitution করা যাবে।", "Substitute নামানোর সময় মাঠ থেকে একজন খেলোয়াড় আগে বের হয়ে যাবে।"]],
  ["ম্যাচের নিয়ম", ["নির্ধারিত সময়ের মধ্যে দুই দলকে মাঠে উপস্থিত থাকতে হবে।", "কোনো দল নির্ধারিত সময়ের মধ্যে উপস্থিত না হলে Walkover দেওয়া হবে।", "ম্যাচের সময় Tournament Committee আগে থেকেই নির্ধারণ করবে।", "Referee-এর সিদ্ধান্ত মাঠে চূড়ান্ত বলে গণ্য হবে।"]],
  ["Kick-off", ["Kick-off থেকে সরাসরি প্রতিপক্ষের Goal-এ গোল করা যাবে না।", "Kick-off থেকে সরাসরি নিজের Goal-এ বল গেলে সেটি Goal হিসেবে গণ্য হবে।", "Kick-off নেওয়ার সময় প্রতিপক্ষ নির্ধারিত দূরত্বে থাকবে।"]],
  ["Throw-in / Kick-in", ["Throw-in থাকবে, তবে হাতে নয় — পা দিয়ে নিতে হবে।", "বল Side Line-এর বাইরে গেলে Player পা দিয়ে বল মাঠে ঢুকিয়ে খেলবে।", "এই Throw-in/Kick-in থেকে সরাসরি গোল হলে Goal হিসেবে গণ্য হবে না।", "সরাসরি গোল হলে Goal Kick হবে।", "Throw-in/Kick-in নেওয়ার সময় প্রতিপক্ষ নির্ধারিত দূরত্বে থাকবে।"]],
  ["Corner", ["Corner থাকবে।", "Corner থেকে সরাসরি গোল করা যাবে।", "Corner নেওয়ার সময় প্রতিপক্ষ নির্ধারিত দূরত্বে থাকবে।", "Corner-এর সময় কোনো Player ইচ্ছাকৃতভাবে Corner নেওয়ায় বাধা দিতে পারবে না।", "Corner থেকে সরাসরি নিজের Goal-এ বল গেলে প্রতিপক্ষের Corner হবে।"]],
  ["Goalkeeper", ["Goalkeeper নিজের নির্ধারিত Penalty Box-এর মধ্যে হাতে বল ধরতে পারবে।", "Box-এর বাইরে হাতে বল ধরলে Foul হবে।", "Goalkeeper ইচ্ছাকৃতভাবে সময় নষ্ট করতে পারবে না।", "Goalkeeper-এর সঙ্গে ইচ্ছাকৃতভাবে ধাক্কা/আঘাত করা Foul হবে।", "Goalkeeper বল হাতে নিয়ে অতিরিক্ত সময় ধরে রাখতে পারবে না।"]],
  ["Foul", ["Push করা।", "Hold করা বা Jersey টানা।", "ইচ্ছাকৃতভাবে ধাক্কা দেওয়া।", "Dangerous tackle করা।", "Opponent-এর পায়ে/শরীরে ইচ্ছাকৃতভাবে আঘাত করা।", "Elbow দিয়ে আঘাত করা।", "High foot দিয়ে বিপজ্জনকভাবে খেলা।", "পিছন থেকে বিপজ্জনকভাবে tackle করা।", "ইচ্ছাকৃতভাবে Handball করা।", "Opponent-এর movement ইচ্ছাকৃতভাবে আটকানো।", "Goalkeeper-কে ইচ্ছাকৃতভাবে বাধা দেওয়া।", "বলের পরিবর্তে সরাসরি খেলোয়াড়কে আঘাত করে tackle করা।"]],
  ["Tackle", ["Side tackle / Slide tackle সম্পূর্ণ নিষিদ্ধ।", "Sliding tackle করলে Foul হবে।", "দুই পা তুলে tackle করা নিষিদ্ধ।", "Opponent-এর নিরাপত্তা ঝুঁকিতে ফেলে কোনো tackle করা যাবে না।"]],
  ["Handball", ["ইচ্ছাকৃতভাবে হাতে/বাহুতে বল লাগালে Foul।", "Goalkeeper-এর নিজের Box-এর বাইরে Handball হলে Free Kick।", "Defender নিজের Box-এর ভিতরে ইচ্ছাকৃত Handball করলে Penalty।"]],
  ["Penalty", ["Defender নিজের Box-এর ভিতরে Foul করলে Penalty হবে।", "Defender নিজের Box-এর ভিতরে ইচ্ছাকৃত Handball করলে Penalty হবে।", "Penalty থেকে সরাসরি Goal করা যাবে।", "Penalty নেওয়ার সময় অন্য খেলোয়াড়রা নির্ধারিত জায়গায় থাকবে।"]],
  ["Free Kick", ["Foul-এর কারণে Free Kick দেওয়া হবে।", "Direct Free Kick থেকে সরাসরি Goal করা যাবে।", "Indirect Free Kick হলে অন্য কোনো খেলোয়াড় বল Touch করার পর Goal গণ্য হবে।", "Opponent Free Kick-এর সামনে দাঁড়িয়ে ইচ্ছাকৃতভাবে বাধা দিতে পারবে না।"]],
  ["Yellow Card", ["Dangerous tackle করলে Yellow Card দেওয়া হবে।", "বারবার Foul করা।", "ইচ্ছাকৃতভাবে Opponent-এর attack থামানো।", "সময় নষ্ট করা।", "Referee-এর সিদ্ধান্ত নিয়ে অতিরিক্ত তর্ক করা।", "Free Kick/Corner/Throw-in নিতে ইচ্ছাকৃতভাবে বাধা দেওয়া।", "Unsporting behaviour করা।"]],
  ["দুই Yellow = Red", ["কোনো খেলোয়াড় এক ম্যাচে ২টি Yellow Card পেলে Red Card পাবে।", "Red Card পাওয়ার পর খেলোয়াড়কে মাঠ থেকে বের হয়ে যেতে হবে।", "Red Card পাওয়া খেলোয়াড় একই ম্যাচে আর খেলতে পারবে না।"]],
  ["Opponent না এলে", ["কোনো দল নির্ধারিত সময়ে মাঠে উপস্থিত না হলে Walkover দেওয়া হবে।", "Walkover-এর ফলাফল Tournament Committee আগে থেকেই নির্ধারণ করবে, যেমন 3–0।", "কোনো দল ইচ্ছাকৃতভাবে ম্যাচে না এলে Tournament Committee প্রয়োজনীয় disciplinary action নিতে পারবে।"]],
  ["ম্যাচ Draw হলে", ["Win = 3 Points", "Draw = 1 Point", "Loss = 0 Point", "দুই বা তার বেশি দলের Point সমান হলে: Goal Difference → Goals Scored → Head-to-Head Result → Fair Play / Cards → Penalty Shootout"]],
  ["Fighting", ["Opponent-কে মারা, ঘুষি দেওয়া বা লাথি দেওয়া সম্পূর্ণ নিষিদ্ধ।", "Fighting করলে Direct Red Card হবে।", "Fighting-এর কারণে ম্যাচ বন্ধ হয়ে গেলে Tournament Committee ম্যাচের বিষয়ে সিদ্ধান্ত নেবে।"]],
  ["Referee-এর সঙ্গে আচরণ", ["Referee-এর সিদ্ধান্তকে সম্মান করতে হবে।", "Referee-কে গালি দেওয়া যাবে না।", "Referee-কে ধাক্কা দেওয়া বা হুমকি দেওয়া Direct Red Card হবে।", "শুধুমাত্র Team Captain প্রয়োজন হলে Referee-এর সঙ্গে সিদ্ধান্ত নিয়ে কথা বলতে পারবে।", "একসাথে একাধিক Player Referee-কে ঘিরে দাঁড়াতে পারবে না।"]],
  ["Opponent নিয়ম না মানলে", ["Opponent নিয়ম না মানলে Player নিজে গিয়ে ঝামেলা করবে না।", "Player Referee-কে জানাবে: \"Referee, please handle this.\"", "Referee প্রয়োজন অনুযায়ী warning অথবা Card দিতে পারবেন।", "Referee-এর সিদ্ধান্তই চূড়ান্ত বলে গণ্য হবে।"]]
];

function renderPage(settings, items) {
  const title = escapeHtml(text(settings.title, fallbackSettings.title));
  const tagline = escapeHtml(text(settings.tagline, fallbackSettings.tagline));
  const heroImage = text(settings.heroImage, fallbackSettings.heroImage);
  const footerText = escapeHtml(text(settings.footerText, fallbackSettings.footerText));
  const sectionTitle = escapeHtml(text(settings.sectionTitle, fallbackSettings.sectionTitle));
  const socialLinks = settings.socialLinks || {};

  appRoot.innerHTML = `
    <header class="site-header">
      <a class="brand" href="#top" aria-label="${title}">
        <p class="brand-title">${title}</p>
        <p class="brand-tagline">${tagline}</p>
      </a>
      <span class="header-mark" aria-hidden="true">⚽</span>
    </header>
    <main id="top">
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <p class="hero-kicker">Est. football club</p>
          <h1 class="hero-title" id="hero-title">${title}</h1>
          <p class="hero-summary">${footerText}</p>
        </div>
        <div class="hero-aside">
          ${heroImage ? `<img class="hero-image" src="${escapeHtml(externalLink(heroImage))}" alt="${title}" />` : renderHeroNote()}
        </div>
      </section>
      <section class="work-section" aria-labelledby="news-title">
        <div class="section-heading">
          <h2 class="section-title" id="news-title">${sectionTitle}</h2>
          <span class="section-count">${items.length ? `${items.length} entries` : ""}</span>
        </div>
        ${items.length
          ? `<div class="item-grid">${items.map((item, index) => renderItem(item, index)).join("")}</div>`
          : `<p class="empty-state">এখনো কোনো আপডেট যোগ করা হয়নি। শীঘ্রই আসছে।</p>`}
      </section>
      <section class="work-section" aria-labelledby="rules-title">
        <div class="section-heading">
          <h2 class="section-title" id="rules-title">Tournament rules</h2>
          <span class="section-count">${rules.length} sections</span>
        </div>
        <div class="rules-grid">
          ${rules.map(([heading, ruleItems], index) => renderRule(heading, ruleItems, index)).join("")}
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <p class="footer-copy">${footerText}</p>
      <nav class="social-links" aria-label="Social links">
        ${socialPlatforms.map(([key, label]) => renderSocialLink(label, socialLinks[key])).join("")}
      </nav>
    </footer>
  `;
}

function renderHeroNote() {
  return `<div class="hero-note"><span class="note-label">On the pitch</span><strong>৬</strong><span>players<br />per side</span><div class="note-rule"></div><small>১ GK + ৫ Outfield</small></div>`;
}

function renderItem(item, index) {
  const title = escapeHtml(text(item.title));
  const description = escapeHtml(text(item.description));
  const linkLabel = escapeHtml(text(item.linkLabel, "বিস্তারিত দেখুন"));
  const link = externalLink(item.link);
  const image = text(item.imageUrl);
  return `
    <article class="item-card" style="animation-delay: ${Math.min(index * 80, 400)}ms">
      ${image ? `<img class="item-image" src="${escapeHtml(externalLink(image))}" alt="${title}" loading="lazy" />` : ""}
      <div class="item-content">
        <span class="item-number">${String(index + 1).padStart(2, "0")}</span>
        <h3 class="item-title">${title}</h3>
        <p class="item-description">${description}</p>
        ${link !== "#" ? `<a class="item-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${linkLabel}</a>` : ""}
      </div>
    </article>
  `;
}

function renderRule(heading, items, index) {
  return `
    <article class="rule-card" style="animation-delay: ${Math.min(index * 45, 500)}ms">
      <div class="rule-card-heading"><span class="item-number">${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(heading)}</h3></div>
      <ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
    </article>
  `;
}

function renderSocialLink(label, url) {
  const link = externalLink(url);
  return link === "#" ? "" : `<a class="social-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

async function loadSite() {
  let settings = {};
  let items = [];
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    const database = getFirestore(firebaseApp);

    try {
      const settingsSnapshot = await withTimeout(getDoc(doc(database, "site", "settings")), FETCH_TIMEOUT_MS);
      settings = settingsSnapshot.exists() ? settingsSnapshot.data() : {};
    } catch (settingsError) {
      console.error("Unable to load site settings", settingsError);
    }

    try {
      const itemsQuery = query(collection(database, "items"), where("published", "==", true), orderBy("order", "asc"));
      const itemsSnapshot = await withTimeout(getDocs(itemsQuery), FETCH_TIMEOUT_MS);
      items = itemsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    } catch (itemsError) {
      console.error("Unable to load news items", itemsError);
    }
  } catch (error) {
    console.error("Unable to initialize Firebase", error);
  }
  renderPage(settings, items);
}

loadSite();
