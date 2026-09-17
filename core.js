export const STORAGE_VERSION = 1;

export function createId(idFactory) {
  if (typeof idFactory === "function") {
    return idFactory();
  }

  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function parseStudentNames(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .split(/\r?\n|[,，、;；\t]+/)
    .map((name) => name.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

export function secureRandomInt(max, cryptoObject = globalThis.crypto) {
  const size = Math.floor(Number(max));

  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError("max must be a positive integer");
  }

  if (!cryptoObject?.getRandomValues) {
    return Math.floor(Math.random() * size);
  }

  const range = 4294967296;
  const limit = Math.floor(range / size) * size;
  const buffer = new Uint32Array(1);

  do {
    cryptoObject.getRandomValues(buffer);
  } while (buffer[0] >= limit);

  return buffer[0] % size;
}

export function makeStudent(name, idFactory) {
  return {
    id: createId(idFactory),
    name: String(name).trim(),
  };
}

export function makeClass(name, idFactory) {
  const now = new Date().toISOString();

  return {
    id: createId(idFactory),
    name: String(name).trim(),
    students: [],
    drawnIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function getRemainingStudents(classItem) {
  const drawn = new Set(Array.isArray(classItem?.drawnIds) ? classItem.drawnIds : []);
  const students = Array.isArray(classItem?.students) ? classItem.students : [];
  return students.filter((student) => !drawn.has(student.id));
}

export function reconcileStudents(previousStudents, names, idFactory) {
  const buckets = new Map();

  for (const student of Array.isArray(previousStudents) ? previousStudents : []) {
    if (!student?.name) {
      continue;
    }

    const bucket = buckets.get(student.name) ?? [];
    bucket.push(student);
    buckets.set(student.name, bucket);
  }

  return names.map((name) => {
    const bucket = buckets.get(name);

    if (bucket?.length) {
      return bucket.shift();
    }

    return makeStudent(name, idFactory);
  });
}

export function normalizeClass(classItem) {
  if (!classItem || typeof classItem !== "object") {
    return null;
  }

  const name = String(classItem.name ?? "").trim();

  if (!name) {
    return null;
  }

  const studentIds = new Set();
  const students = (Array.isArray(classItem.students) ? classItem.students : [])
    .map((student) => ({
      id: String(student?.id ?? createId()),
      name: String(student?.name ?? "").trim(),
    }))
    .filter((student) => {
      if (!student.name || studentIds.has(student.id)) {
        return false;
      }

      studentIds.add(student.id);
      return true;
    });

  const drawnIds = [
    ...new Set(
      (Array.isArray(classItem.drawnIds) ? classItem.drawnIds : [])
        .map((id) => String(id))
        .filter((id) => studentIds.has(id)),
    ),
  ];

  const now = new Date().toISOString();

  return {
    id: String(classItem.id ?? createId()),
    name,
    students,
    drawnIds,
    createdAt: String(classItem.createdAt ?? now),
    updatedAt: String(classItem.updatedAt ?? now),
  };
}

export function normalizeState(value) {
  const seenIds = new Set();
  const classes = (Array.isArray(value?.classes) ? value.classes : [])
    .map(normalizeClass)
    .filter((classItem) => {
      if (!classItem || seenIds.has(classItem.id)) {
        return false;
      }

      seenIds.add(classItem.id);
      return true;
    });

  const requestedActiveId = String(value?.activeClassId ?? "");
  const activeClassId = classes.some((classItem) => classItem.id === requestedActiveId)
    ? requestedActiveId
    : (classes[0]?.id ?? null);

  return {
    version: STORAGE_VERSION,
    classes,
    activeClassId,
    updatedAt: String(value?.updatedAt ?? ""),
  };
}
