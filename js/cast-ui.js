import { supabase } from "./supabase-client.js";

/* Public cast-view shared UI only.
 * Skill/outfit rendering belongs to their dedicated modules.
 */

const content = document.querySelector("#cast-content");

initializeReadonlyFields();
initializeReturnLink();
initializeEditLinkAndLabels();
initializeHandleKana();
initializeSkillLayout();

function initializeReadonlyFields() {
  if (!content) return;
  const selector = "input[readonly], textarea[readonly]";

  const apply = root => {
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.matches(selector)) root.tabIndex = -1;
    root.querySelectorAll(selector).forEach(field => { field.tabIndex = -1; });
  };

  apply(content);
  new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === "attributes") apply(mutation.target);
      mutation.addedNodes.forEach(apply);
    });
  }).observe(content, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["readonly"]
  });
}

function initializeReturnLink() {
  const returnValue = new URLSearchParams(location.search).get("return")?.trim() || "";
  if (!returnValue) return;

  try {
    const returnUrl = new URL(returnValue, location.href);
    const isArchive = returnUrl.origin === location.origin && /\/index\.html$/.test(returnUrl.pathname);
    if (!isArchive) return;

    document.querySelectorAll('.cast-header__back, #cast-error a[href="./index.html"]').forEach(link => {
      link.href = `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
    });
  } catch {}
}

function initializeEditLinkAndLabels() {
  const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
  const editLink = document.querySelector("#cast-edit-button");
  if (editLink && publicId) {
    editLink.href = `./sheet.html?id=${encodeURIComponent(publicId)}`;
    editLink.hidden = false;
  }

  let attempts = 0;
  const setJapanese = (element, text) => {
    if (element) element.replaceChildren(document.createTextNode(text));
  };
  const setBilingual = (element, jp, en) => {
    if (!element) return;
    element.replaceChildren(document.createTextNode(jp));
    if (en) {
      const small = document.createElement("small");
      small.textContent = en;
      element.append(document.createTextNode(" "), small);
    }
  };

  const apply = () => {
    if (!content || content.hidden) {
      if (attempts++ < 40) setTimeout(apply, 100);
      return;
    }

    const abilityLabels = { VALUE: "能力値", CONTROL: "制御値", CURRENT: "現在値" };
    document.querySelectorAll(".ability-card__label").forEach(element => {
      const hit = abilityLabels[element.textContent.trim().toUpperCase()];
      if (hit) setJapanese(element, hit);
    });

    const abilityNames = { REASON: "理性", PASSION: "感情", LIFE: "生命", MUNDANE: "外界" };
    document.querySelectorAll(".ability-card:not(.ability-card--cs) header span:last-child").forEach(element => {
      const hit = abilityNames[element.textContent.trim().toUpperCase()];
      if (hit) setJapanese(element, hit);
    });

    const skillHeadings = {
      "GENERAL SKILLS": ["一般技能", "GENERAL SKILLS"],
      SOCIAL: ["社会", "SOCIAL"],
      CONNECTIONS: ["コネクション", "CONNECTIONS"],
      "STYLE SKILLS": ["スタイル技能", "STYLE SKILLS"]
    };
    document.querySelectorAll("#skills-container .skill-section h3").forEach(element => {
      const hit = skillHeadings[element.textContent.trim().toUpperCase()];
      if (hit) setBilingual(element, ...hit);
    });

    const headers = ["名称", "LV", "理性", "感情", "生命", "外界", "詳細"];
    document.querySelectorAll("#skills-container .data-table thead tr").forEach(row => {
      if (row.closest(".style-skill-view-table")) return;
      [...row.children].forEach((cell, index) => {
        if (headers[index]) setJapanese(cell, headers[index]);
      });
    });

    const profileLabels = {
      AGE: "年齢", GENDER: "性別", HEIGHT: "身長", WEIGHT: "体重", EYES: "瞳",
      HAIR: "髪", SKIN: "肌", ORIGIN: "出自", EXPERIENCE: "経験", ENCOUNTER: "邂逅"
    };
    document.querySelectorAll("#personal-data dt, #life-path dt").forEach(element => {
      const hit = profileLabels[element.textContent.trim().toUpperCase()];
      if (hit) setJapanese(element, hit);
    });
  };

  apply();
}

async function initializeHandleKana() {
  const publicId = new URLSearchParams(location.search).get("id")?.trim() || "";
  const handle = document.querySelector("#cast-handle");
  const handleKana = document.querySelector("#cast-handle-kana");

  if (handle?.textContent.trim() === "NO HANDLE") handle.textContent = "";
  if (!publicId || !handleKana) return;

  const { data, error } = await supabase
    .from("characters")
    .select("handle_kana")
    .eq("public_id", publicId)
    .maybeSingle();

  if (error) {
    console.warn("handle kana could not be loaded", error);
    return;
  }

  const value = String(data?.handle_kana || "").trim();
  handleKana.textContent = value ? `“${value}”` : "";
}

function initializeSkillLayout() {
  let attempts = 0;

  const removeDetailColumn = section => {
    section.querySelectorAll("colgroup").forEach(group => {
      if (group.children.length >= 7) group.children[6].remove();
    });
    section.querySelectorAll("tr").forEach(row => {
      if (row.children.length >= 7) row.children[6].remove();
    });
  };

  const apply = () => {
    const container = document.querySelector("#skills-container");
    const sections = [...document.querySelectorAll("#skills-container .skill-section")];
    if (!container || !sections.length) {
      if (attempts++ < 40) setTimeout(apply, 100);
      return;
    }

    container.classList.add("cast-skill-layout");
    let side = container.querySelector(":scope > .cast-skill-side");
    if (!side) {
      side = document.createElement("div");
      side.className = "cast-skill-side";
    }

    sections.forEach(section => {
      const title = section.querySelector("h3")?.textContent || "";
      section.classList.remove("is-general", "is-social", "is-connection", "is-style");

      if (title.includes("一般技能") || title.includes("GENERAL SKILLS")) {
        section.classList.add("is-general");
        removeDetailColumn(section);
      } else if (title.includes("社会") || title.trim() === "SOCIAL") {
        section.classList.add("is-social");
        removeDetailColumn(section);
        side.append(section);
      } else if (title.includes("コネクション") || title.includes("CONNECTIONS")) {
        section.classList.add("is-connection");
        removeDetailColumn(section);
        side.append(section);
      } else if (title.includes("スタイル技能") || title.includes("STYLE SKILLS")) {
        section.classList.add("is-style");
      }
    });

    const general = container.querySelector(":scope > .skill-section.is-general");
    const style = container.querySelector(":scope > .skill-section.is-style");

    if (side.children.length && !side.parentElement) {
      if (general) general.insertAdjacentElement("afterend", side);
      else container.prepend(side);
    }
    if (style) container.append(style);

    const panels = [...document.querySelectorAll("#tab-session .data-layout > .data-panel")];
    panels[0]?.classList.add("panel-ability");
    panels[1]?.classList.add("panel-skills");
    panels[2]?.classList.add("panel-combos");

    splitStyleSkillPanel();
  };

  const splitStyleSkillPanel = () => {
    if (document.querySelector("#style-skill-panel")) return;
    const original = document.querySelector("#tab-session .panel-skills");
    const styleSection = document.querySelector("#skills-container .skill-section.is-style");
    if (!original || !styleSection) return;

    const panel = document.createElement("section");
    panel.id = "style-skill-panel";
    panel.className = "data-panel data-panel--wide panel-style-skills";
    panel.innerHTML = '<header class="data-panel__header"><h2>スタイル技能 <small>STYLE SKILLS</small></h2></header><div class="style-skill-panel__body"></div>';
    panel.querySelector(".style-skill-panel__body").append(styleSection);
    original.insertAdjacentElement("afterend", panel);

    const heading = styleSection.querySelector("h3");
    if (heading) heading.hidden = true;
  };

  apply();
}
