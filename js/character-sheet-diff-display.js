const ITEM_PATH_SEPARATOR = " / ";

export function groupCharacterSheetDifferences(differences = []) {
  const groups = [];
  const records = new Map();

  for (const difference of Array.isArray(differences) ? differences : []) {
    const category = difference?.category ?? "";
    const path = String(difference?.path ?? "");
    const recordPath = splitRecordPath(path);

    if (!recordPath) {
      groups.push({
        record: false,
        category,
        path,
        fields: [Object.assign({}, difference || {}, { field: path })]
      });
      continue;
    }

    const key = String(category) + "\u0000" + recordPath.itemPath;
    let group = records.get(key);
    if (!group) {
      group = {
        record: true,
        category,
        path: recordPath.itemPath,
        fields: []
      };
      records.set(key, group);
      groups.push(group);
    }
    group.fields.push(Object.assign({}, difference || {}, { field: recordPath.field }));
  }

  return groups;
}

function splitRecordPath(path) {
  const separatorIndex = path.lastIndexOf(ITEM_PATH_SEPARATOR);
  if (separatorIndex <= 0 || separatorIndex + ITEM_PATH_SEPARATOR.length >= path.length) return null;
  return {
    itemPath: path.slice(0, separatorIndex),
    field: path.slice(separatorIndex + ITEM_PATH_SEPARATOR.length)
  };
}
