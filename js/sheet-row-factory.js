export function createBlankSkill(category, { key = crypto.randomUUID(), sortOrder = 0 } = {}) {
  return {
    _key: key,
    category,
    name: "",
    level: 1,
    free_level: 0,
    skill_kind: category === "style" ? "normal" : category === "general" ? "general" : "proper",
    reason: false,
    passion: false,
    life: false,
    mundane: false,
    timing: "",
    target: "",
    range: "",
    difficulty: "",
    confrontation: "",
    description: "",
    sort_order: sortOrder
  };
}

export function createBlankOutfit({ key = crypto.randomUUID(), sortOrder = 0 } = {}) {
  return {
    _key: key,
    category: "other",
    name: "",
    purchase_value: "",
    experience_cost: 0,
    concealment: "",
    attack: "",
    range: "",
    slot: "",
    description: "",
    sort_order: sortOrder
  };
}
