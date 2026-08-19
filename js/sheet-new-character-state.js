import {
  reconcileGeneralMasterRows,
  appendGeneralBlankSlots
} from "./sheet-general-skill-state.js";

export function buildNewCharacterSkills({
  masterRows = [],
  suits = [],
  blankColumns = [],
  createBlankSkill
} = {}) {
  if (typeof createBlankSkill !== "function") throw new TypeError("createBlankSkill is required");

  let rows = masterRows
    .filter(([, , kind]) => kind === "general")
    .map(([name, suit]) => ({
      ...createBlankSkill("general", { sortOrder: 0 }),
      name,
      level: 1,
      free_level: 0,
      [suit]: true,
      skill_kind: "general"
    }));

  rows = reconcileGeneralMasterRows(rows, {
    masterRows,
    suits,
    createBlankSkill
  });
  rows = appendGeneralBlankSlots(rows, {
    columns: blankColumns,
    createBlankSkill
  });

  const sharedTrailingSortOrder = rows.length;
  const add = (category, name) => rows.push({
    ...createBlankSkill(category, { sortOrder: sharedTrailingSortOrder }),
    name,
    level: 1,
    free_level: 0,
    skill_kind: "proper"
  });

  add("social", "社会：N◎VA");
  add("social", "社会：");
  add("social", "社会：");
  add("social", "社会：");
  add("connection", "コネ：");
  add("connection", "コネ：");
  add("connection", "コネ：");

  return rows;
}
