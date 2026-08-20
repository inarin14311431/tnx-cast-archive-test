import {
  reconcileGeneralMasterRows,
  appendGeneralBlankSlots
} from "./sheet-general-skill-state.js";
import { createSkillRow as defaultCreateSkillRow } from "./sheet-row-factory.js";

export function buildNewCharacterSkills({
  masterRows = [],
  suits = [],
  blankColumns = [],
  createBlankSkill,
  createSkillRow = defaultCreateSkillRow
} = {}) {
  if (typeof createBlankSkill !== "function") throw new TypeError("createBlankSkill is required");
  if (typeof createSkillRow !== "function") throw new TypeError("createSkillRow is required");

  let rows = masterRows
    .filter(([, , kind]) => kind === "general")
    .map(([name, suit]) => createSkillRow("general", {
      name,
      level: 1,
      free_level: 0,
      [suit]: true,
      skill_kind: "general"
    }, { sortOrder: 0 }));

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
  const add = (category, name) => rows.push(createSkillRow(category, {
    name,
    level: 1,
    free_level: 0,
    skill_kind: "proper"
  }, { sortOrder: sharedTrailingSortOrder }));

  add("social", "社会：N◎VA");
  add("social", "社会：");
  add("social", "社会：");
  add("social", "社会：");
  add("connection", "コネ：");
  add("connection", "コネ：");
  add("connection", "コネ：");

  return rows;
}
