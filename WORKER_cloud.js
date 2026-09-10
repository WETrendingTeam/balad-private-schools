/*
============================================================
 BALAD PRIVATE SCHOOLS
 CONTROL001 WORKER
============================================================

 Firebase project:
 projectb-wetrending-space

 Dashboard endpoint:
 /staff-admin

 STAFF CODE SYSTEM
 -----------------
 Nursery & Primary:
 PRI001 - PRI050

 College:
 COL001 - COL050

 The dashboard may display the 50 available template
 positions in pages. The Worker does not require all 50
 to be created at once.

 STAFF ROLES
 -----------
 teacher
 class_teacher
 management
 other

 CLASS TEACHER
 -------------
 homeroom = Class Teacher Of

 A Class Teacher may ALSO teach:
 - other classes
 - other subjects

 STAFF ROW CONTROLS
 ------------------
 - reset password
 - activate
 - deactivate
 - assignment updates

============================================================
*/

const PROJECT_ID = "projectb-wetrending-space";
const INTERNAL_STAFF_DOMAIN = "@staff.balad.local";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400"
};


/* ============================================================
   RESPONSE
============================================================ */

function response(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...CORS
      }
    }
  );
}

function success(data = {}, status = 200) {
  return response(
    {
      success: true,
      ...data
    },
    status
  );
}

function failure(message, status = 400, extra = {}) {
  return response(
    {
      success: false,
      error: String(message),
      ...extra
    },
    status
  );
}


/* ============================================================
   HELPERS
============================================================ */

function envValue(env, key, fallback = "") {
  return String(
    env?.[key] ?? fallback
  )
    .trim()
    .replace(/^"(.*)"$/, "$1")
    .replace(/^'(.*)'$/, "$1");
}

function bearerToken(request) {
  const header =
    request.headers.get("Authorization") || "";

  if (!header.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return header.slice(7).trim();
}

function cleanArray(value) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map(v => String(v ?? "").trim())
        .filter(Boolean)
    )
  ];
}

function normalizeRole(value) {
  const role =
    String(value || "teacher")
      .trim()
      .toLowerCase();

  if (role === "other staff") {
    return "other";
  }

  if (role === "class teacher") {
    return "class_teacher";
  }

  return role;
}

function normalizeSchool(value) {
  const school =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    school === "primary" ||
    school === "nursery" ||
    school === "nursery-primary"
  ) {
    return "primary";
  }

  if (
    school === "secondary" ||
    school === "college"
  ) {
    return "college";
  }

  return "";
}

function schoolPrefix(school) {
  return normalizeSchool(school) === "college"
    ? "COL"
    : "PRI";
}

function internalEmail(loginCode) {
  return (
    String(loginCode)
      .trim()
      .toLowerCase() +
    INTERNAL_STAFF_DOMAIN
  );
}

function slug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randomCode(length = 10) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const bytes =
    new Uint32Array(length);

  crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    n => chars[n % chars.length]
  ).join("");
}

function generatePassword(length = 14) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

  const bytes =
    new Uint32Array(length);

  crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    n => chars[n % chars.length]
  ).join("");
}

function studentId() {
  return (
    "STU-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    randomCode(5)
  );
}

function resultAccessCode() {
  return "R" + randomCode(8);
}

function scanCode() {
  return (
    "BAL-STU-" +
    randomCode(10) +
    "-" +
    Date.now().toString(36).toUpperCase()
  );
}


/* ============================================================
   FIREBASE AUTH REST
============================================================ */

function firebaseAuthUrl(env, path) {
  const apiKey =
    envValue(env, "FIREBASE_API_KEY");

  return (
    "https://identitytoolkit.googleapis.com/v1/" +
    path +
    "?key=" +
    encodeURIComponent(apiKey)
  );
}

async function firebaseRequest(
  env,
  path,
  body
) {
  return fetch(
    firebaseAuthUrl(env, path),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
}


/* ============================================================
   GOOGLE SERVICE ACCOUNT
============================================================ */

let googleTokenCache = {
  token: "",
  exp: 0
};

function base64Url(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function utf8(value) {
  return new TextEncoder().encode(value);
}

function privateKeyBytes(pem) {
  const base64 =
    String(pem || "")
      .replace(
        /-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,
        ""
      );

  const raw = atob(base64);

  const output =
    new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }

  return output;
}

function serviceAccount(env) {

  if (
    envValue(
      env,
      "FIREBASE_SERVICE_ACCOUNT_JSON"
    )
  ) {

    try {
      return JSON.parse(
        envValue(
          env,
          "FIREBASE_SERVICE_ACCOUNT_JSON"
        )
      );
    }

    catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON."
      );
    }
  }

  const clientEmail =
    envValue(
      env,
      "FIREBASE_CLIENT_EMAIL"
    );

  const privateKey =
    String(
      env?.FIREBASE_PRIVATE_KEY || ""
    ).trim();

  if (!clientEmail || !privateKey) {

    throw new Error(
      "Firebase service account is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY."
    );
  }

  return {
    client_email: clientEmail,
    private_key: privateKey.replace(
      /\\n/g,
      "\n"
    )
  };
}

async function googleAccessToken(env) {

  const now =
    Math.floor(Date.now() / 1000);

  if (
    googleTokenCache.token &&
    googleTokenCache.exp > now + 60
  ) {
    return googleTokenCache.token;
  }

  const sa =
    serviceAccount(env);

  const header =
    base64Url(
      utf8(
        JSON.stringify({
          alg: "RS256",
          typ: "JWT"
        })
      )
    );

  const payload =
    base64Url(
      utf8(
        JSON.stringify({
          iss: sa.client_email,
          scope:
            "https://www.googleapis.com/auth/cloud-platform",
          aud:
            "https://oauth2.googleapis.com/token",
          iat: now,
          exp: now + 3600
        })
      )
    );

  const key =
    await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBytes(sa.private_key),
      {
        name:
          "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );

  const signature =
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      utf8(
        header +
        "." +
        payload
      )
    );

  const assertion =
    header +
    "." +
    payload +
    "." +
    base64Url(
      new Uint8Array(signature)
    );

  const result =
    await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },
        body:
          "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer" +
          "&assertion=" +
          encodeURIComponent(assertion)
      }
    );

  const data =
    await result
      .json()
      .catch(() => ({}));

  if (
    !result.ok ||
    !data.access_token
  ) {

    throw new Error(
      data.error_description ||
      data.error ||
      "Unable to obtain Google service-account access token."
    );
  }

  googleTokenCache = {
    token: data.access_token,
    exp:
      now +
      Number(
        data.expires_in || 3600
      )
  };

  return data.access_token;
}


/* ============================================================
   FIRESTORE
============================================================ */

function firestoreUrl(
  env,
  path = ""
) {

  const projectId =
    envValue(
      env,
      "FIREBASE_PROJECT_ID",
      PROJECT_ID
    );

  return (
    "https://firestore.googleapis.com/v1/projects/" +
    encodeURIComponent(projectId) +
    "/databases/(default)/documents/" +
    path
  );
}

function firestoreValue(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return {
      nullValue: null
    };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values:
          value.map(
            firestoreValue
          )
      }
    };
  }

  if (typeof value === "boolean") {
    return {
      booleanValue: value
    };
  }

  if (typeof value === "number") {

    if (Number.isInteger(value)) {
      return {
        integerValue:
          String(value)
      };
    }

    return {
      doubleValue: value
    };
  }

  if (typeof value === "object") {
    return {
      mapValue: {
        fields:
          firestoreFields(value)
      }
    };
  }

  return {
    stringValue:
      String(value)
  };
}

function firestoreFields(object) {

  const fields = {};

  for (
    const [key, value]
    of Object.entries(
      object || {}
    )
  ) {

    fields[key] =
      firestoreValue(value);
  }

  return fields;
}

function firestoreOne(value) {

  if (!value) return null;

  if (
    "stringValue" in value
  ) {
    return value.stringValue;
  }

  if (
    "booleanValue" in value
  ) {
    return value.booleanValue;
  }

  if (
    "integerValue" in value
  ) {
    return Number(
      value.integerValue
    );
  }

  if (
    "doubleValue" in value
  ) {
    return value.doubleValue;
  }

  if (
    "nullValue" in value
  ) {
    return null;
  }

  if (value.timestampValue) {
    return value.timestampValue;
  }

  if (value.arrayValue) {
    return (
      value.arrayValue.values || []
    ).map(
      firestoreOne
    );
  }

  if (value.mapValue) {
    return firestoreObject(
      value.mapValue.fields || {}
    );
  }

  return null;
}

function firestoreObject(fields = {}) {

  const result = {};

  for (
    const [key, value]
    of Object.entries(fields)
  ) {

    result[key] =
      firestoreOne(value);
  }

  return result;
}

function firestoreDocumentToObject(
  document
) {

  const id =
    document.name
      ? document.name
          .split("/")
          .pop()
      : "";

  return {
    id,
    ...firestoreObject(
      document.fields || {}
    )
  };
}

async function firestoreRequest(
  env,
  method,
  path,
  body = null
) {

  const token =
    await googleAccessToken(env);

  const options = {
    method,
    headers: {
      "Content-Type":
        "application/json",
      Authorization:
        "Bearer " + token
    }
  };

  if (body !== null) {
    options.body =
      JSON.stringify(body);
  }

  const result =
    await fetch(
      firestoreUrl(env, path),
      options
    );

  const text =
    await result.text();

  let data = {};

  try {
    data =
      text
        ? JSON.parse(text)
        : {};
  }

  catch {
    data = {
      raw: text
    };
  }

  if (!result.ok) {

    throw new Error(
      data?.error?.message ||
      data?.error ||
      `Firestore request failed (${result.status})`
    );
  }

  return data;
}

async function listDocuments(
  env,
  collection
) {

  const documents = [];

  let pageToken = "";

  do {

    const params =
      new URLSearchParams();

    params.set(
      "pageSize",
      "300"
    );

    if (pageToken) {
      params.set(
        "pageToken",
        pageToken
      );
    }

    const data =
      await firestoreRequest(
        env,
        "GET",
        encodeURIComponent(
          collection
        ) +
        "?" +
        params.toString()
      );

    documents.push(
      ...(data.documents || [])
        .map(
          firestoreDocumentToObject
        )
    );

    pageToken =
      data.nextPageToken || "";

  } while (pageToken);

  return documents;
}

async function getDocument(
  env,
  collection,
  id
) {

  if (!id) return null;

  try {

    const data =
      await firestoreRequest(
        env,
        "GET",
        encodeURIComponent(
          collection
        ) +
        "/" +
        encodeURIComponent(id)
      );

    return firestoreDocumentToObject(
      data
    );
  }

  catch (error) {

    const message =
      String(
        error.message || ""
      ).toLowerCase();

    if (
      message.includes(
        "not found"
      ) ||
      message.includes(
        "not_found"
      )
    ) {
      return null;
    }

    throw error;
  }
}

async function setDocument(
  env,
  collection,
  id,
  data
) {

  return firestoreRequest(
    env,
    "PATCH",
    encodeURIComponent(
      collection
    ) +
    "/" +
    encodeURIComponent(id),
    {
      fields:
        firestoreFields(data)
    }
  );
}

async function updateDocument(
  env,
  collection,
  id,
  data
) {

  const keys =
    Object.keys(data || {});

  if (!keys.length) {
    return getDocument(
      env,
      collection,
      id
    );
  }

  const mask =
    keys
      .map(
        key =>
          "updateMask.fieldPaths=" +
          encodeURIComponent(key)
      )
      .join("&");

  await firestoreRequest(
    env,
    "PATCH",
    encodeURIComponent(
      collection
    ) +
    "/" +
    encodeURIComponent(id) +
    "?" +
    mask,
    {
      fields:
        firestoreFields(data)
    }
  );

  return getDocument(
    env,
    collection,
    id
  );
}


async function firestoreBatchSet(env, collection, documents) {
  if (!documents.length) return;
  const projectId = envValue(env, "FIREBASE_PROJECT_ID", PROJECT_ID);
  const url =
    "https://firestore.googleapis.com/v1/projects/" +
    encodeURIComponent(projectId) +
    "/databases/(default)/documents:batchWrite";
  const token = await googleAccessToken(env);
  const writes = documents.map(doc => ({
    update: {
      name:
        "projects/" + projectId +
        "/databases/(default)/documents/" +
        collection + "/" + doc.id,
      fields: firestoreFields(doc.data)
    }
  }));
  const result = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ writes })
  });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) {
    throw new Error(data?.error?.message || "Firestore bulk write failed.");
  }
  const failed = (data.writeResults || []).filter(x => x.status?.code);
  if (failed.length) {
    throw new Error(`Firestore bulk write reported ${failed.length} failed record(s).`);
  }
}

async function deleteDocument(
  env,
  collection,
  id
) {

  try {

    await firestoreRequest(
      env,
      "DELETE",
      encodeURIComponent(
        collection
      ) +
      "/" +
      encodeURIComponent(id)
    );

  }

  catch (error) {

    const message =
      String(
        error.message || ""
      ).toLowerCase();

    if (
      !message.includes(
        "not found"
      ) &&
      !message.includes(
        "not_found"
      )
    ) {
      throw error;
    }
  }
}


/* ============================================================
   FIREBASE AUTH ADMIN
============================================================ */

async function firebaseAdmin(
  env,
  path,
  body
) {

  const token =
    await googleAccessToken(env);

  const project =
    envValue(
      env,
      "FIREBASE_PROJECT_ID",
      PROJECT_ID
    );

  const result =
    await fetch(
      "https://identitytoolkit.googleapis.com/v1/projects/" +
      encodeURIComponent(project) +
      "/" +
      path,
      {
        method: "POST",
        headers: {
          Authorization:
            "Bearer " + token,
          "Content-Type":
            "application/json"
        },
        body:
          JSON.stringify(body)
      }
    );

  const data =
    await result
      .json()
      .catch(() => ({}));

  if (!result.ok) {

    throw new Error(
      data?.error?.message ||
      data?.error?.status ||
      "Firebase Authentication administration failed."
    );
  }

  return data;
}

async function resetAuthPassword(
  env,
  uid,
  password
) {

  return firebaseAdmin(
    env,
    "accounts:update",
    {
      localId: uid,
      password,
      returnSecureToken: false
    }
  );
}

async function deleteAuthUsers(
  env,
  uids
) {

  const unique =
    [
      ...new Set(
        uids.filter(Boolean)
      )
    ];

  for (
    let i = 0;
    i < unique.length;
    i += 1000
  ) {

    await firebaseAdmin(
      env,
      "accounts:batchDelete",
      {
        localIds:
          unique.slice(
            i,
            i + 1000
          ),
        force: true
      }
    );
  }
}


/* ============================================================
   CONTROL001 AUTHENTICATION
============================================================ */


function staffIdentityCandidates(profile = {}, firebaseUser = {}) {
  return [
    profile.loginCode,
    profile.staffCode,
    profile.staffId,
    profile.id,
    profile.code,
    firebaseUser.email ? String(firebaseUser.email).split("@")[0] : ""
  ]
    .filter(Boolean)
    .map(value => String(value).trim().toUpperCase());
}

function canonicalStaffId(profile = {}, firebaseUser = {}) {
  return staffIdentityCandidates(profile, firebaseUser)[0] || "";
}

function isControlStaffId(value) {
  return String(value || "").trim().toUpperCase() === "CONTROL001";
}

function isManagementStaffId(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^COL00[1-5]$/.test(code);
}

function isValidStaffId(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^PRI(?:00[1-9]|0[1-4][0-9]|050)$/.test(code) ||
         /^COL(?:00[1-9]|0[1-4][0-9]|050)$/.test(code);
}

function assertStaffIdRole(school, loginCode, role) {
  const normalizedSchool = normalizeSchool(school);
  const code = String(loginCode || "").trim().toUpperCase();
  const normalizedRole = normalizeRole(role);

  if (!isValidStaffId(code)) {
    throw new Error("Staff IDs must be PRI001–PRI050 or COL001–COL050.");
  }

  if (normalizedSchool === "primary" && !code.startsWith("PRI")) {
    throw new Error("Nursery & Primary staff must use PRI001–PRI050.");
  }

  if (normalizedSchool === "college" && !code.startsWith("COL")) {
    throw new Error("College staff must use COL001–COL050.");
  }

  if (normalizedRole === "management") {
    if (normalizedSchool !== "college" || !isManagementStaffId(code)) {
      throw new Error("Management access is reserved for COL001–COL005.");
    }
  }

  if (normalizedSchool === "primary" && isManagementStaffId(code)) {
    throw new Error("Primary has no Management staff ID group.");
  }

  if (normalizedRole !== "management" && normalizedSchool === "college" && isManagementStaffId(code)) {
    throw new Error("COL001–COL005 are reserved for Management.");
  }
}

function isControlActor(actor) {
  return normalizeRole(actor?.role) === "control" &&
    isControlStaffId(actor?.staffId || actor?.loginCode || actor?.staffCode || actor?.id);
}

function isManagementActor(actor) {
  return normalizeRole(actor?.role) === "management" &&
    isManagementStaffId(actor?.staffId || actor?.loginCode || actor?.staffCode || actor?.id) &&
    normalizeSchool(actor?.school) === "college";
}

async function verifyStaffAccess(
  env,
  idToken
) {
  if (!idToken) {
    return {
      ok: false,
      status: 401,
      error: "Staff access requires a Firebase login."
    };
  }

  const result =
    await firebaseRequest(
      env,
      "accounts:lookup",
      { idToken }
    );

  if (!result.ok) {
    return {
      ok: false,
      status: 401,
      error: "Your Firebase session is invalid or expired."
    };
  }

  const data =
    await result.json().catch(() => ({}));

  const user = data.users?.[0];

  if (!user?.localId) {
    return {
      ok: false,
      status: 401,
      error: "Firebase user not found."
    };
  }

  const profile =
    await getDocument(
      env,
      "staff",
      user.localId
    );

  if (!profile) {
    return {
      ok: false,
      status: 403,
      error: "Authorized staff profile not found."
    };
  }

  if (profile.active !== true) {
    return {
      ok: false,
      status: 403,
      error: "This staff account is inactive."
    };
  }

  const role = normalizeRole(profile.role);

  if (
    ![
      "control",
      "teacher",
      "class_teacher",
      "management",
      "other"
    ].includes(role)
  ) {
    return {
      ok: false,
      status: 403,
      error: "This staff account is not authorized."
    };
  }

  const identities = staffIdentityCandidates(profile, user);
  const staffId = identities[0] || "";

  return {
    ok: true,
    uid: user.localId,
    profile,
    staffId,
    identities
  };
}

/* ============================================================
   CONTROL-ONLY AUTHENTICATION
   Used by /staff-admin.
============================================================ */

async function verifyControl(
  env,
  idToken
) {
  const access = await verifyStaffAccess(env, idToken);

  if (!access.ok) {
    return access;
  }

  const role = normalizeRole(access.profile?.role);
  const identity = access.identities || staffIdentityCandidates(access.profile, {
    email: access.profile?.email || ""
  });

  if (role !== "control") {
    return {
      ok: false,
      status: 403,
      error: "Control access is restricted to CONTROL001."
    };
  }

  if (!identity.includes("CONTROL001")) {
    return {
      ok: false,
      status: 403,
      error: "Control access is reserved for CONTROL001."
    };
  }

  return {
    ...access,
    staffId: "CONTROL001"
  };
}

async function verifyDashboardAccess(
  env,
  idToken
) {
  const access = await verifyStaffAccess(env, idToken);
  if (!access.ok) return access;

  const role = normalizeRole(access.profile?.role);
  const staffId = access.staffId || canonicalStaffId(access.profile);

  if (role === "control") {
    if (!isControlStaffId(staffId) && !(access.identities || []).includes("CONTROL001")) {
      return {
        ok: false,
        status: 403,
        error: "Control access is reserved for CONTROL001."
      };
    }
    return { ...access, staffId: "CONTROL001" };
  }

  if (role === "management") {
    if (!isManagementStaffId(staffId) || normalizeSchool(access.profile?.school) !== "college") {
      return {
        ok: false,
        status: 403,
        error: "Management access is reserved for COL001–COL005."
      };
    }
    return { ...access, staffId };
  }

  return { ...access, staffId };
}

function dashboardActionNames(value) {
  return String(value || "").trim().toLowerCase();
}

function assertDashboardActionAccess(action, actor) {
  const role = normalizeRole(actor?.role);
  const control = role === "control";
  const management = role === "management";
  const staff = role === "teacher" || role === "class_teacher" || role === "other";

  if (!control && !management && !staff) {
    throw new Error("This staff account is not authorized for the dashboard.");
  }

  if (control) return;

  const a = dashboardActionNames(action);

  const controlOnly = new Set([
    "list_audit",
    "reset_staff_setup",
    "reset_setup",
    "staff_setup_reset",
    "save_public_staff",
    "delete_public_staff"
  ]);

  if (controlOnly.has(a)) {
    throw new Error("This action is restricted to CONTROL001.");
  }

  if (management) return;

  const regularStaffAllowed = new Set([
    "dashboard_summary",
    "list",
    "list_staff",
    "get_staff",
    "list_classes",
    "get_classes",
    "classes",
    "list_subjects",
    "get_subjects",
    "subjects",
    "list_students",
    "get_students",
    "students",
    "get_student",
    "get_student_id_card",
    "list_student_attendance",
    "get_student_attendance",
    "record_student_scan",
    "scan_student_id",
    "save_subject_results",
    "save_result_entries",
    "get_class_teacher_result_review",
    "finalize_class_result"
  ]);

  if (!regularStaffAllowed.has(a)) {
    throw new Error("This action is not available to regular staff.");
  }
}



/* ============================================================
   STAFF
============================================================ */

function normalizeStaff(input) {

  const school =
    normalizeSchool(
      input.school
    );

  const loginCode =
    String(
      input.loginCode ||
      input.staffCode ||
      ""
    )
      .trim()
      .toUpperCase();

  const name =
    String(
      input.name || ""
    ).trim();

  const role =
    normalizeRole(
      input.role
    );

  const password =
    String(
      input.password || ""
    ).trim() ||
    generatePassword();

  const homeroom =
    String(
      input.homeroom ||
      input.classTeacherOf ||
      ""
    ).trim();

  const otherClasses =
    cleanArray(
      input.otherTeachingClasses ||
      input.otherClasses
    );

  let assignedClasses =
    cleanArray(
      input.assignedClasses
    );

  let assignedSubjects =
    cleanArray(
      input.assignedSubjects
    );

  if (!school) {
    throw new Error(
      "School section is required."
    );
  }

  if (
    !/^[A-Z0-9]{4,30}$/.test(
      loginCode
    )
  ) {
    throw new Error(
      "Invalid staff ID."
    );
  }

  if (
    !loginCode.startsWith(
      schoolPrefix(school)
    )
  ) {

    throw new Error(
      `Staff ID ${loginCode} does not belong to the selected school.`
    );
  }

  if (!name) {
    throw new Error(
      "Staff name is required."
    );
  }

  if (
    ![
      "teacher",
      "class_teacher",
      "management",
      "other"
    ].includes(role)
  ) {

    throw new Error(
      "Invalid staff role."
    );
  }

  if (password.length < 8) {
    throw new Error(
      "Password must be at least 8 characters."
    );
  }

  if (
    role === "teacher" ||
    role === "class_teacher"
  ) {

    assignedClasses =
      cleanArray([
        ...(homeroom
          ? [homeroom]
          : []),
        ...assignedClasses,
        ...otherClasses
      ]);

    if (!assignedClasses.length) {
      throw new Error(
        "Teaching staff must have at least one class."
      );
    }

    if (!assignedSubjects.length) {
      throw new Error(
        "Teaching staff must have at least one subject."
      );
    }

    if (
      role === "class_teacher" &&
      !homeroom
    ) {

      throw new Error(
        "Class Teacher must have a Class Teacher Of assignment."
      );
    }

  } else {

    assignedClasses = [];
    assignedSubjects = [];
  }

  return {
    school,
    loginCode,
    name,
    role,
    password,
    homeroom,
    assignedClasses,
    assignedSubjects
  };
}


function generateSecretAccessCode() {
  return randomCode(6);
}

async function createUniqueStaffSecret(env) {
  for (let attempt = 0; attempt < 25; attempt++) {
    const secret = generateSecretAccessCode();
    const existing = await listDocuments(env, "staffSecrets");
    if (!existing.some(item => String(item.secretAccessCode || "").toUpperCase() === secret)) {
      return secret;
    }
  }
  throw new Error("Unable to generate a unique staff secret access code.");
}

async function getOrCreateStaffSecret(env, staff) {
  const uid = String(staff?.uid || staff?.id || "").trim();
  if (!uid) throw new Error("Staff UID is required.");

  const existing = await getDocument(env, "staffSecrets", uid);
  if (existing?.secretAccessCode) {
    return existing;
  }

  const now = new Date().toISOString();
  const secretAccessCode = await createUniqueStaffSecret(env);
  const record = {
    uid,
    staffId: staff.loginCode || staff.staffCode || "",
    secretAccessCode,
    active: staff.active !== false,
    createdAt: now,
    updatedAt: now
  };

  await setDocument(env, "staffSecrets", uid, record);
  return record;
}

async function listStaff(
  env,
  school = "",
  includeSecrets = false
) {

  const requestedSchool =
    normalizeSchool(school);

  const staff =
    await listDocuments(
      env,
      "staff"
    );

  const rows = staff
    .filter(item => {

      if (!requestedSchool) {
        return true;
      }

      return (
        normalizeSchool(
          item.school
        ) === requestedSchool
      );
    })
    .map(item => ({
      uid:
        item.uid ||
        item.id,

      id:
        item.id,

      loginCode:
        item.loginCode ||
        item.staffCode ||
        "",

      staffCode:
        item.staffCode ||
        item.loginCode ||
        "",

      name:
        item.name || "",

      role:
        normalizeRole(
          item.role || ""
        ),

      school:
        normalizeSchool(
          item.school
        ),

      active:
        item.active !== false,

      email:
        item.email || "",

      homeroom:
        item.homeroom ||
        item.classTeacherOf ||
        "",

      assignedClasses:
        cleanArray(
          item.assignedClasses
        ),

      assignedSubjects:
        cleanArray(
          item.assignedSubjects
        ),

      createdAt:
        item.createdAt || "",

      updatedAt:
        item.updatedAt || ""
    }));

  if (!includeSecrets) {
    return rows;
  }

  return Promise.all(
    rows.map(async item => {
      const secret = await getOrCreateStaffSecret(env, item);
      return {
        ...item,
        secretAccessCode: secret.secretAccessCode
      };
    })
  );
}

async function createFirebaseUser(
  env,
  loginCode,
  password
) {

  const result =
    await firebaseRequest(
      env,
      "accounts:signUp",
      {
        email:
          internalEmail(
            loginCode
          ),
        password,
        returnSecureToken: true
      }
    );

  if (!result.ok) {

    const data =
      await result
        .json()
        .catch(() => ({}));

    const code =
      data?.error?.message ||
      "FIREBASE_CREATE_FAILED";

    if (
      code === "EMAIL_EXISTS"
    ) {

      throw new Error(
        "Staff ID already exists in Firebase Authentication."
      );
    }

    throw new Error(code);
  }

  return result.json();
}

async function createStaff(
  env,
  input
) {

  const staff =
    normalizeStaff(input);

  assertStaffIdRole(
    staff.school,
    staff.loginCode,
    staff.role
  );

  const existing =
    await listStaff(
      env,
      staff.school
    );

  if (
    existing.some(
      item =>
        String(
          item.loginCode || ""
        ).toUpperCase() ===
        staff.loginCode
    )
  ) {

    throw new Error(
      `Staff ID ${staff.loginCode} already exists.`
    );
  }

  const auth =
    await createFirebaseUser(
      env,
      staff.loginCode,
      staff.password
    );

  const uid =
    auth.localId;

  if (!uid) {
    throw new Error(
      "Firebase did not return a staff UID."
    );
  }

  const secretAccessCode =
    await createUniqueStaffSecret(env);

  const now =
    new Date().toISOString();

  const profile = {

    uid,

    name:
      staff.name,

    loginCode:
      staff.loginCode,

    staffCode:
      staff.loginCode,

    role:
      staff.role,

    school:
      staff.school,

    homeroom:
      staff.homeroom,

    active:
      true,

    email:
      internalEmail(
        staff.loginCode
      ),

    assignedClasses:
      staff.assignedClasses,

    assignedSubjects:
      staff.assignedSubjects,

    createdAt:
      now,

    updatedAt:
      now
  };

  try {

    await setDocument(
      env,
      "staff",
      uid,
      profile
    );

  } catch (error) {

    try {
      await deleteAuthUsers(
        env,
        [uid]
      );
    }

    catch {}

    throw new Error(
      "Firebase account was created but the staff profile could not be saved: " +
      error.message
    );
  }

  try {
    await setDocument(
      env,
      "staffSecrets",
      uid,
      {
        uid,
        staffId: staff.loginCode,
        secretAccessCode,
        active: true,
        createdAt: now,
        updatedAt: now
      }
    );
  } catch (error) {
    try {
      await deleteDocument(env, "staff", uid);
    } catch {}
    try {
      await deleteAuthUsers(env, [uid]);
    } catch {}
    throw new Error(
      "Staff account was created but its secret access code could not be saved: " +
      error.message
    );
  }

  return {
    ...profile,
    secretAccessCode,
    temporaryPassword:
      staff.password
  };
}


/* ============================================================
   STAFF GENERATOR
============================================================ */

async function generateStaff(
  env,
  input
) {

  const school =
    normalizeSchool(
      input.school
    );

  if (!school) {
    throw new Error(
      "Select Nursery & Primary or College first."
    );
  }

  const count =
    Math.min(
      50,
      Math.max(
        1,
        Number(
          input.count
        ) || 1
      )
    );

  const role =
    normalizeRole(
      input.role ||
      "teacher"
    );

  if (
    ![
      "teacher",
      "class_teacher",
      "management",
      "other"
    ].includes(role)
  ) {

    throw new Error(
      "Invalid staff role."
    );
  }

  if (role === "management" && school !== "college") {
    throw new Error("Management staff can only be COL001–COL005.");
  }

  const prefix =
    schoolPrefix(
      school
    );

  const existing =
    new Set(
      (
        await listStaff(env)
      ).map(
        item =>
          String(
            item.loginCode || ""
          ).toUpperCase()
      )
    );

  const staff = [];

  const startNumber =
    role === "management" ? 1 :
    (school === "college" ? 6 : 1);

  const endNumber =
    role === "management" ? 5 :
    (school === "college" ? 50 : 50);

  const maxAvailable =
    endNumber - startNumber + 1;

  if (count > maxAvailable) {
    throw new Error(
      `Only ${maxAvailable} valid ${role} staff IDs are available for ${school}.`
    );
  }

  let number = startNumber;

  while (
    staff.length < count &&
    number <= endNumber
  ) {

    const code =
      prefix +
      String(number)
        .padStart(
          3,
          "0"
        );

    number++;

    if (
      existing.has(code)
    ) {
      continue;
    }

    staff.push({

      school,

      loginCode:
        code,

      password:
        generatePassword(),

      role,

      name: "",

      homeroom: "",

      assignedClasses: [],

      assignedSubjects: []
    });

    existing.add(code);
  }

  if (
    staff.length !== count
  ) {

    throw new Error(
      `Unable to generate ${count} unused staff IDs for ${school}.`
    );
  }

  return {
    school,
    prefix,
    role,
    count:
      staff.length,
    staff
  };
}

async function bulkCreate(
  env,
  items
) {

  if (
    !Array.isArray(items) ||
    !items.length
  ) {

    throw new Error(
      "Provide at least one staff record."
    );
  }

  if (
    items.length > 50
  ) {

    throw new Error(
      "Maximum 50 staff records per batch."
    );
  }

  const created = [];
  const failed = [];

  for (
    const item of items
  ) {

    try {

      created.push(
        await createStaff(
          env,
          item
        )
      );

    }

    catch (error) {

      failed.push({

        loginCode:
          item?.loginCode ||
          item?.staffCode ||
          "",

        name:
          item?.name || "",

        error:
          error?.message ||
          "Unable to create staff."
      });
    }
  }

  return {
    created,
    failed,

    summary: {
      requested:
        items.length,

      created:
        created.length,

      failed:
        failed.length
    }
  };
}


/* ============================================================
   STAFF ACTIONS
============================================================ */

async function setStaffActive(
  env,
  uid,
  active
) {

  const staff =
    await getDocument(
      env,
      "staff",
      uid
    );

  if (!staff) {
    throw new Error(
      "Staff member not found."
    );
  }

  if (
    normalizeRole(
      staff.role
    ) === "control"
  ) {

    throw new Error(
      "The Control account cannot be changed here."
    );
  }

  const updated = await updateDocument(
    env,
    "staff",
    uid,
    {
      active:
        Boolean(active),

      updatedAt:
        new Date().toISOString()
    }
  );

  const secret = await getDocument(env, "staffSecrets", uid);
  if (secret) {
    await updateDocument(env, "staffSecrets", uid, {
      active: Boolean(active),
      updatedAt: new Date().toISOString()
    });
  }

  return updated;
}

async function resetStaffPassword(
  env,
  uid
) {

  const staff =
    await getDocument(
      env,
      "staff",
      uid
    );

  if (!staff) {
    throw new Error(
      "Staff member not found."
    );
  }

  if (
    normalizeRole(
      staff.role
    ) === "control"
  ) {

    throw new Error(
      "The Control account cannot be reset from this tool."
    );
  }

  const password =
    generatePassword();

  await resetAuthPassword(
    env,
    uid,
    password
  );

  await updateDocument(
    env,
    "staff",
    uid,
    {
      passwordUpdatedAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()
    }
  );

  return {

    uid,

    loginCode:
      staff.loginCode ||
      staff.staffCode ||
      "",

    staffCode:
      staff.staffCode ||
      staff.loginCode ||
      "",

    name:
      staff.name || "",

    temporaryPassword:
      password
  };
}


async function updateStaffProfile(env, uid, input) {
  const id=String(uid||"").trim();
  if(!id) throw new Error("Staff UID is required.");
  const staff=await getDocument(env,"staff",id);
  if(!staff) throw new Error("Staff member not found.");
  const data={};
  if(input.name!==undefined){
    const name=String(input.name||"").trim();
    if(!name) throw new Error("Staff name is required.");
    data.name=name;
  }
  if(input.assignedSubjects!==undefined){
    data.assignedSubjects=cleanArray(input.assignedSubjects);
  }
  if(input.position!==undefined) data.position=String(input.position||"").trim();
  if(input.photoUrl!==undefined) data.photoUrl=String(input.photoUrl||"").trim();
  if(input.cmsCategory!==undefined){
    const c=String(input.cmsCategory||"").trim().toLowerCase();
    if(!["management","college","primary","non_teaching"].includes(c)) throw new Error("Invalid staff content category.");
    data.cmsCategory=c;
  }
  data.updatedAt=new Date().toISOString();
  return updateDocument(env,"staff",id,data);
}

async function updateAssignments(
  env,
  uid,
  input
) {

  const staff =
    await getDocument(
      env,
      "staff",
      uid
    );

  if (!staff) {
    throw new Error(
      "Staff member not found."
    );
  }

  const role =
    normalizeRole(
      staff.role
    );

  if (
    role !== "teacher" &&
    role !== "class_teacher"
  ) {

    throw new Error(
      "Assignments can only be applied to teaching staff."
    );
  }

  const homeroom =
    String(
      input.homeroom ||
      input.classTeacherOf ||
      ""
    ).trim();

  const assignedClasses =
    cleanArray([
      ...(homeroom
        ? [homeroom]
        : []),

      ...(input.assignedClasses || []),

      ...(input.otherTeachingClasses || [])
    ]);

  const assignedSubjects =
    cleanArray(
      input.assignedSubjects
    );

  if (
    !assignedClasses.length
  ) {

    throw new Error(
      "Teaching staff must have at least one class."
    );
  }

  if (
    !assignedSubjects.length
  ) {

    throw new Error(
      "Teaching staff must have at least one subject."
    );
  }

  if (
    role === "class_teacher" &&
    !homeroom
  ) {

    throw new Error(
      "Class Teacher must have a Class Teacher Of assignment."
    );
  }

  return updateDocument(
    env,
    "staff",
    uid,
    {

      homeroom,

      assignedClasses,

      assignedSubjects,

      updatedAt:
        new Date().toISOString()
    }
  );
}


/* ============================================================
   STAFF HISTORY + AUDIT
============================================================ */

async function logStaffHistory(
  env,
  action,
  actor,
  staff,
  details = {}
) {

  const id =
    Date.now() +
    "-" +
    randomCode(8);

  await setDocument(
    env,
    "staffHistory",
    id,
    {

      action:
        String(action || ""),

      actorUid:
        String(
          actor?.uid ||
          actor?.id ||
          ""
        ),

      actorCode:
        String(
          actor?.loginCode ||
          actor?.staffCode ||
          ""
        ),

      actorName:
        String(
          actor?.name || ""
        ),

      staffUid:
        String(
          staff?.uid ||
          staff?.id ||
          ""
        ),

      staffCode:
        String(
          staff?.loginCode ||
          staff?.staffCode ||
          ""
        ),

      staffName:
        String(
          staff?.name || ""
        ),

      role:
        String(
          staff?.role || ""
        ),

      details,

      at:
        new Date().toISOString(),

      createdAt:
        new Date().toISOString()
    }
  );
}

async function getStaffHistory(
  env,
  query = ""
) {

  const history =
    await listDocuments(
      env,
      "staffHistory"
    );

  const search =
    String(
      query || ""
    )
      .trim()
      .toLowerCase();

  return history
    .filter(item => {

      if (!search) {
        return true;
      }

      return [
        item.staffName,
        item.staffCode,
        item.action,
        item.actorName,
        item.actorCode,
        item.staffUid
      ]
        .join(" ")
        .toLowerCase()
        .includes(search);
    })
    .sort(
      (a, b) =>
        String(
          b.at ||
          b.createdAt ||
          ""
        ).localeCompare(
          String(
            a.at ||
            a.createdAt ||
            ""
          )
        )
    )
    .slice(0, 500);
}

async function logAudit(
  env,
  action,
  actor,
  recordType = "",
  recordId = "",
  details = {}
) {

  const id =
    Date.now() +
    "-" +
    randomCode(8);

  await setDocument(
    env,
    "auditLogs",
    id,
    {

      timestamp:
        new Date().toISOString(),

      actorUid:
        String(
          actor?.uid ||
          actor?.id ||
          ""
        ),

      actorCode:
        String(
          actor?.loginCode ||
          actor?.staffCode ||
          ""
        ),

      actorName:
        String(
          actor?.name || ""
        ),

      action:
        String(action || ""),

      recordType:
        String(recordType || ""),

      recordId:
        String(recordId || ""),

      details
    }
  );
}

async function listAudit(
  env,
  query = ""
) {

  const logs =
    await listDocuments(
      env,
      "auditLogs"
    );

  const q =
    String(
      query || ""
    )
      .trim()
      .toLowerCase();

  return logs
    .filter(item =>
      !q ||
      [
        item.actorCode,
        item.actorName,
        item.action,
        item.recordType,
        item.recordId
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    )
    .sort(
      (a, b) =>
        String(
          b.timestamp || ""
        ).localeCompare(
          String(
            a.timestamp || ""
          )
        )
    )
    .slice(0, 500);
}


/* ============================================================
   CLASSES
============================================================ */

const INITIAL_CLASSES = [

  {
    id: "creche",
    name: "Crèche",
    section: "primary",
    school: "primary",
    useArms: true,
    useDepartments: false,
    departments: []
  },

  {
    id: "nursery-1",
    name: "Nursery 1",
    section: "primary",
    school: "primary",
    useArms: true,
    useDepartments: false,
    departments: []
  },

  {
    id: "nursery-2",
    name: "Nursery 2",
    section: "primary",
    school: "primary",
    useArms: true,
    useDepartments: false,
    departments: []
  },

  {
    id: "primary-1",
    name: "Primary 1",
    section: "primary",
    school: "primary",
    useArms: true,
    useDepartments: false,
    departments: []
  },

  {
    id: "primary-2",
    name: "Primary 2",
    section: "primary",
    school: "primary",
    useArms: true,
    useDepartments: false,
    departments: []
  },

  {
    id: "primary-3",
    name: "Primary 3",
    section: "primary",
    school: "primary",
    useArms: true,
    useDepartments: false,
    departments: []
  },

  {
    id: "primary-4",
    name: "Primary 4",
    section: "primary",
    school: "primary",
    useArms: true,
    useDepartments: false,
    departments: []
  },

  {
    id: "primary-5",
    name: "Primary 5",
    section: "primary",
    school: "primary",
    useArms: true,
    useDepartments: false,
    departments: []
  },

  {
    id: "primary-6",
    name: "Primary 6",
    section: "primary",
    school: "primary",
    useArms: true,
    useDepartments: false,
    departments: []
  },

  {
    id: "jss-1",
    name: "JSS 1",
    section: "junior",
    school: "college",
    useArms: false,
    useDepartments: false,
    departments: []
  },

  {
    id: "jss-2",
    name: "JSS 2",
    section: "junior",
    school: "college",
    useArms: false,
    useDepartments: false,
    departments: []
  },

  {
    id: "jss-3",
    name: "JSS 3",
    section: "junior",
    school: "college",
    useArms: false,
    useDepartments: false,
    departments: []
  },

  {
    id: "ss-1",
    name: "SS 1",
    section: "senior",
    school: "college",
    useArms: false,
    useDepartments: true,
    departments: [
      "Science",
      "Arts",
      "Commercial"
    ]
  },

  {
    id: "ss-2",
    name: "SS 2",
    section: "senior",
    school: "college",
    useArms: false,
    useDepartments: true,
    departments: [
      "Science",
      "Arts",
      "Commercial"
    ]
  },

  {
    id: "ss-3",
    name: "SS 3",
    section: "senior",
    school: "college",
    useArms: false,
    useDepartments: true,
    departments: [
      "Science",
      "Arts",
      "Commercial"
    ]
  }

];

const SUBJECT_CATALOGS = {
  primary: [
    "English Language",
    "Mathematics",
    "Basic Science",
    "Basic Technology",
    "Social Studies",
    "Civic Education",
    "Computer Studies",
    "Agricultural Science",
    "Home Economics",
    "Religious Studies",
    "Physical & Health Education",
    "French",
    "Creative Arts",
    "Other"
  ],
  college: [
    "English Language",
    "Mathematics",
    "Further Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "Agricultural Science",
    "Economics",
    "Government",
    "Commerce",
    "Accounting",
    "Geography",
    "Literature in English",
    "Civic Education",
    "Computer Studies",
    "Data Processing",
    "Christian Religious Studies",
    "Islamic Religious Studies",
    "French",
    "Other"
  ]
};

function subjectsForSchool(school) {
  const normalized = normalizeSchool(school);
  const names = SUBJECT_CATALOGS[normalized] || [];
  const prefix = normalized === "college" ? "COL-SUB-" : "PRI-SUB-";
  return names.map((name, index) => ({
    id: prefix + String(index + 1).padStart(3, "0"),
    name,
    active: true
  }));
}

const SUBJECTS = [
  ...subjectsForSchool("primary").map(x => x.name),
  ...subjectsForSchool("college").map(x => x.name)
];


async function saveClass(env, input = {}) {
  const data = input.class || input;
  const school = normalizeSchool(data.school);
  const name = String(data.name || "").trim();
  const section = String(data.section || "").trim();

  if (!school) throw new Error("School section is required.");
  if (!name) throw new Error("Class name is required.");

  const id =
    String(data.id || "").trim() ||
    slug(name) + "-" + school;

  const payload = {
    id,
    name,
    section,
    school,
    capacity: Math.max(1, Number(data.capacity) || 35),
    useArms: Boolean(data.useArms),
    useDepartments: Boolean(data.useDepartments),
    departments: Array.isArray(data.departments)
      ? data.departments.map(x => String(x).trim()).filter(Boolean)
      : (school === "college" && data.useDepartments
          ? ["Science", "Arts", "Commercial"]
          : []),
    active: data.active !== false,
    updatedAt: new Date().toISOString()
  };

  await setDocument(env, "classes", id, payload);
  return payload;
}

async function listClasses(
  env,
  school = ""
) {

  const requested =
    normalizeSchool(
      school
    );

  let classes =
    await listDocuments(
      env,
      "classes"
    );

  if (!classes.length) {

    for (
      const cls
      of INITIAL_CLASSES
    ) {

      await setDocument(
        env,
        "classes",
        cls.id,
        {
          ...cls,
          capacity: 35,
          active: true,
          updatedAt:
            new Date().toISOString()
        }
      );
    }

    classes =
      await listDocuments(
        env,
        "classes"
      );
  }

  return classes
    .filter(
      item =>
        !requested ||
        normalizeSchool(
          item.school
        ) === requested
    );
}

function classPlacementOptions(
  classes
) {

  const result = [];

  for (
    const cls
    of classes
  ) {

    if (
      cls.section ===
        "primary" &&
      cls.useArms
    ) {

      result.push(
        cls.name + "A",
        cls.name + "B"
      );

    } else if (
      cls.section ===
        "senior" &&
      cls.useDepartments
    ) {

      for (
        const department
        of cleanArray(
          cls.departments
        )
      ) {

        result.push(
          cls.name +
          " — " +
          department
        );
      }

    } else {

      result.push(
        cls.name
      );
    }
  }

  return [
    ...new Set(result)
  ];
}


/* ============================================================
   STUDENTS
============================================================ */


function studentClassDefinition(className) {
  const name = String(className || "").trim().toLowerCase();
  const primary = INITIAL_CLASSES.find(x => x.school === "primary" && x.name.toLowerCase() === name);
  const college = INITIAL_CLASSES.find(x => x.school === "college" && x.name.toLowerCase() === name);
  return primary || college || null;
}

function normalizeStudentPlacement(input) {
  const school = normalizeSchool(input.school);
  const className = String(input.className || input.class || "").trim();
  const arm = String(input.arm || "").trim().toUpperCase();
  const department = String(input.department || "").trim();
  const def = studentClassDefinition(className);

  if (!def) throw new Error(`Invalid class: ${className || "missing"}.`);
  if (normalizeSchool(def.school) !== school) {
    throw new Error(`${className} does not belong to the selected school section.`);
  }

  if (school === "primary") {
    if (!arm || !["A", "B"].includes(arm)) {
      throw new Error("Nursery & Primary students must be assigned to Arm A or Arm B.");
    }
    if (department) throw new Error("Department is not used in Nursery & Primary.");
    return { className, arm, department: "" };
  }

  if (/^SS [123]$/i.test(className)) {
    if (!["Science", "Arts", "Commercial"].includes(department)) {
      throw new Error("SS1–SS3 students must have Science, Arts or Commercial department.");
    }
    if (arm) throw new Error("College does not use arms.");
    return { className, arm: "", department };
  }

  if (arm || department) {
    throw new Error("JSS1–JSS3 does not use arms or departments.");
  }
  return { className, arm: "", department: "" };
}

async function nextStudentSlot(env, school, existing, reserved = new Set()) {
  const prefix = normalizeSchool(school) === "college" ? "COL-STU-" : "PRI-STU-";
  let max = 0;
  for (const item of existing || []) {
    const code = String(item.slotCode || item.studentSlot || "").toUpperCase();
    if (!code.startsWith(prefix)) continue;
    const n = Number(code.slice(prefix.length));
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  let n = max + 1;
  while (reserved.has(prefix + String(n).padStart(3, "0"))) n++;
  return prefix + String(n).padStart(3, "0");
}

async function createStudent(
  env,
  input
) {

  const school =
    normalizeSchool(input.school);

  const studentName =
    String(
      input.studentName ||
      input.name ||
      ""
    ).trim();

  let slotCode =
    String(
      input.slotCode ||
      input.studentSlot ||
      ""
    ).trim().toUpperCase();

  const admissionNumber =
    String(
      input.admissionNumber ||
      ""
    ).trim();

  const className =
    String(
      input.className ||
      input.class ||
      ""
    ).trim();

  if (!school) {
    throw new Error("School section is required.");
  }

  if (!studentName) {
    throw new Error("Student name is required.");
  }

  if (!admissionNumber) {
    throw new Error("Admission number is required.");
  }

  if (!className) {
    throw new Error("Class is required.");
  }

  const placement = normalizeStudentPlacement({
    school,
    className,
    arm: input.arm,
    department: input.department
  });

  const students = await listDocuments(env, "students");

  if (!slotCode) {
    slotCode = await nextStudentSlot(env, school, students);
  }

  if (!/^(PRI|COL)-STU-\d{3,6}$/i.test(slotCode)) {
    throw new Error("Invalid student slot.");
  }

  const expectedPrefix =
    school === "college" ? "COL-STU-" : "PRI-STU-";

  if (!slotCode.startsWith(expectedPrefix)) {
    throw new Error(
      `Student slot ${slotCode} does not belong to the selected school.`
    );
  }

  const existingSlot =
    students.find(
      item =>
        String(
          item.slotCode ||
          item.studentSlot ||
          ""
        ).trim().toUpperCase() === slotCode
    );

  if (existingSlot) {
    throw new Error(
      `Student slot ${slotCode} is already in use.`
    );
  }

  if (
    admissionNumber &&
    students.some(
      item =>
        String(item.admissionNumber || "")
          .trim()
          .toLowerCase() === admissionNumber.toLowerCase()
    )
  ) {
    throw new Error(
      `Admission number ${admissionNumber} already exists.`
    );
  }

  const id = studentId();
  const now = new Date().toISOString();

  const student = {

    studentId: id,

    slotCode,

    school,

    studentName,

    admissionNumber,

    className,

    class: className,

    classLevel:
      String(input.classLevel || "").trim(),

    section:
      String(
        input.section ||
        input.schoolSection ||
        ""
      ).trim().toLowerCase(),

    arm: placement.arm,

    department: placement.department,

    gender:
      String(input.gender || "").trim(),

    dateOfBirth:
      String(input.dateOfBirth || "").trim(),

    passportUrl:
      String(input.passportUrl || "").trim(),

    passportPath:
      String(input.passportPath || "").trim(),

    guardianName:
      String(input.guardianName || "").trim(),

    guardianPhone:
      String(input.guardianPhone || "").trim(),

    guardianWhatsApp:
      String(input.guardianWhatsApp || "").trim(),

    guardianEmail:
      String(input.guardianEmail || "").trim(),

    address:
      String(input.address || "").trim(),

    resultAccessCode:
      resultAccessCode(),

    scanCode:
      scanCode(),

    active: true,

    createdAt: now,
    updatedAt: now
  };

  await setDocument(
    env,
    "students",
    id,
    student
  );

  return student;
}

async function listStudents(
  env,
  query = "",
  school = ""
) {

  const requested =
    normalizeSchool(
      school
    );

  const students =
    (
      await listDocuments(
        env,
        "students"
      )
    )
      .filter(
        item =>
          !requested ||
          normalizeSchool(
            item.school
          ) === requested
      );

  const search =
    String(
      query || ""
    )
      .trim()
      .toLowerCase();

  const result =
    search
      ? students.filter(
          student =>
            [
              student.studentName,
              student.admissionNumber,
              student.className,
              student.classLevel,
              student.guardianName,
              student.guardianPhone
            ]
              .join(" ")
              .toLowerCase()
              .includes(search)
        )
      : students;

  result.sort(
    (a, b) =>
      String(
        a.studentName || ""
      ).localeCompare(
        String(
          b.studentName || ""
        )
      )
  );

  return result;
}

async function updateStudent(
  env,
  id,
  updates
) {

  const student =
    await getDocument(
      env,
      "students",
      id
    );

  if (!student) {
    throw new Error(
      "Student not found."
    );
  }

  const allowed = [

    "studentName",
    "admissionNumber",
    "className",
    "classLevel",
    "class",
    "arm",
    "department",
    "gender",
    "dateOfBirth",
    "passportUrl",
    "passportPath",
    "guardianName",
    "guardianPhone",
    "guardianWhatsApp",
    "guardianEmail",
    "address"

  ];

  const data = {};

  for (
    const field
    of allowed
  ) {

    if (
      updates[field] !==
      undefined
    ) {

      data[field] =
        typeof updates[field] ===
        "string"
          ? updates[field].trim()
          : updates[field];
    }
  }

  if (
    updates.className !==
    undefined
  ) {

    data.class =
      String(
        updates.className ||
        ""
      ).trim();
  }

  data.updatedAt =
    new Date().toISOString();

  return updateDocument(
    env,
    "students",
    id,
    data
  );
}

async function setStudentActive(
  env,
  id,
  active
) {

  const student =
    await getDocument(
      env,
      "students",
      id
    );

  if (!student) {
    throw new Error(
      "Student not found."
    );
  }

  return updateDocument(
    env,
    "students",
    id,
    {
      active:
        Boolean(active),

      updatedAt:
        new Date().toISOString()
    }
  );
}

async function resetStudentCode(
  env,
  id
) {

  const student =
    await getDocument(
      env,
      "students",
      id
    );

  if (!student) {
    throw new Error(
      "Student not found."
    );
  }

  return updateDocument(
    env,
    "students",
    id,
    {
      resultAccessCode:
        resultAccessCode(),

      updatedAt:
        new Date().toISOString()
    }
  );
}


async function bulkCreateStudents(env, input) {
  const school = normalizeSchool(input.school);
  if (!school) throw new Error("Select Nursery & Primary or College first.");
  const rows = Array.isArray(input.students) ? input.students : [];
  if (!rows.length) throw new Error("No student rows were provided.");
  if (rows.length > 500) throw new Error("Maximum 500 students per Excel import.");

  const existing = await listDocuments(env, "students");
  const existingAdmissions = new Set(
    existing.map(x => String(x.admissionNumber || "").trim().toLowerCase()).filter(Boolean)
  );
  const existingSlots = new Set(
    existing.map(x => String(x.slotCode || x.studentSlot || "").trim().toUpperCase()).filter(Boolean)
  );
  const batchAdmissions = new Set();
  const reservedSlots = new Set(existingSlots);
  const prepared = [];
  const failed = [];

  for (let i = 0; i < rows.length; i++) {
    const inputRow = rows[i] || {};
    try {
      const studentName = String(inputRow.studentName || inputRow.name || "").trim();
      const admissionNumber = String(inputRow.admissionNumber || "").trim();
      if (!studentName) throw new Error("Student name is required.");
      if (!admissionNumber) throw new Error("Admission number is required.");
      const placement = normalizeStudentPlacement({
        school,
        className: inputRow.className || inputRow.class,
        arm: inputRow.arm,
        department: inputRow.department
      });
      const admissionKey = admissionNumber.toLowerCase();
      if (existingAdmissions.has(admissionKey) || batchAdmissions.has(admissionKey)) {
        throw new Error(`Admission number ${admissionNumber} already exists.`);
      }
      batchAdmissions.add(admissionKey);
      const slotCode = await nextStudentSlot(env, school, existing, reservedSlots);
      reservedSlots.add(slotCode);
      const id = studentId();
      const now = new Date().toISOString();
      prepared.push({
        id,
        data: {
          studentId: id,
          slotCode,
          school,
          studentName,
          admissionNumber,
          className: placement.className,
          class: placement.className,
          classLevel: String(inputRow.classLevel || "").trim(),
          section: String(inputRow.section || inputRow.schoolSection || "").trim().toLowerCase(),
          arm: placement.arm,
          department: placement.department,
          gender: String(inputRow.gender || "").trim(),
          dateOfBirth: String(inputRow.dateOfBirth || "").trim(),
          passportUrl: String(inputRow.passportUrl || "").trim(),
          passportPath: String(inputRow.passportPath || "").trim(),
          guardianName: String(inputRow.guardianName || "").trim(),
          guardianPhone: String(inputRow.guardianPhone || "").trim(),
          guardianWhatsApp: String(inputRow.guardianWhatsApp || "").trim(),
          guardianEmail: String(inputRow.guardianEmail || "").trim(),
          address: String(inputRow.address || "").trim(),
          resultAccessCode: resultAccessCode(),
          scanCode: scanCode(),
          active: true,
          createdAt: now,
          updatedAt: now
        }
      });
    } catch (error) {
      failed.push({
        row: i + 2,
        admissionNumber: String(inputRow.admissionNumber || ""),
        name: String(inputRow.studentName || inputRow.name || ""),
        error: error?.message || "Unable to prepare student."
      });
    }
  }

  for (let i = 0; i < prepared.length; i += 400) {
    await firestoreBatchSet(env, "students", prepared.slice(i, i + 400));
  }

  return {
    created: prepared.map(x => x.data),
    failed,
    summary: { requested: rows.length, created: prepared.length, failed: failed.length }
  };
}

async function deleteStudent(
  env,
  id
) {

  const student =
    await getDocument(
      env,
      "students",
      id
    );

  if (!student) {
    throw new Error(
      "Student not found."
    );
  }

  await deleteDocument(
    env,
    "students",
    id
  );

  return {
    deleted: id
  };
}



/* ============================================================
   RESULT SYSTEM
   ------------------------------------------------------------
   Primary      = A++ / A+ / A / B / C / D / F
   Junior       = A / B / C / D / E / F
   Senior       = A / B / C / D / E / F
   Psychomotor = A / B / C for Primary/Junior/Senior result
   ------------------------------------------------------------ */

function normalizeResultSection(value, school, className) {
  const raw = String(value || "").trim().toLowerCase();

  if (raw === "primary") return "primary";
  if (raw === "junior" || raw === "jss" || raw === "junior-secondary") return "junior";
  if (raw === "senior" || raw === "sss" || raw === "senior-secondary") return "senior";

  const cls = String(className || "").toUpperCase();

  if (/^(SS|SENIOR)/.test(cls)) return "senior";
  if (/^(JS|JSS|JUNIOR)/.test(cls)) return "junior";

  return normalizeSchool(school) === "primary"
    ? "primary"
    : "junior";
}

function resultGrade(total, section) {
  const n = Number(total || 0);

  if (section === "primary") {
    if (n >= 90) return "A++";
    if (n >= 80) return "A+";
    if (n >= 70) return "A";
    if (n >= 60) return "B";
    if (n >= 50) return "C";
    if (n >= 40) return "D";
    return "F";
  }

  if (section === "junior") {
    if (n >= 70) return "A";
    if (n >= 60) return "B";
    if (n >= 50) return "C";
    if (n >= 40) return "D";
    if (n >= 30) return "E";
    return "F";
  }

  if (n >= 75) return "A";
  if (n >= 65) return "B";
  if (n >= 55) return "C";
  if (n >= 45) return "D";
  if (n >= 40) return "E";
  return "F";
}

function resultRemark(grade) {
  switch (String(grade || "").toUpperCase()) {
    case "A++":
    case "A+":
    case "A":
      return "Excellent";
    case "B":
      return "Very Good";
    case "C":
      return "Good";
    case "D":
      return "Fair";
    case "E":
      return "Pass";
    default:
      return "Needs Improvement";
  }
}

function assertTeacherClassAccess(actor, className) {
  const role = normalizeRole(actor?.role);
  if (!["teacher", "class_teacher"].includes(role)) {
    throw new Error("Teacher access is required.");
  }

  const assigned =
    cleanArray(actor.assignedClasses);

  if (
    !assigned.some(
      item =>
        String(item).trim().toLowerCase() ===
        String(className).trim().toLowerCase()
    )
  ) {
    throw new Error(
      `You are not assigned to ${className}.`
    );
  }
}

function assertTeacherSubjectAccess(actor, subject) {
  const role = normalizeRole(actor?.role);
  if (!["teacher", "class_teacher"].includes(role)) {
    throw new Error("Teacher access is required.");
  }

  const assigned =
    cleanArray(actor.assignedSubjects);

  if (
    !assigned.some(
      item =>
        String(item).trim().toLowerCase() ===
        String(subject).trim().toLowerCase()
    )
  ) {
    throw new Error(
      `You are not assigned to ${subject}.`
    );
  }
}

async function saveSubjectResults(
  env,
  actor,
  payload
) {
  const className =
    String(payload.className || "").trim();

  const subject =
    String(payload.subject || "").trim();

  const term =
    String(payload.term || "").trim();

  const session =
    String(
      payload.session ||
      payload.academicSession ||
      ""
    ).trim();

  const school =
    normalizeSchool(payload.school);

  const section =
    normalizeResultSection(
      payload.section,
      school,
      className
    );

  if (!className || !subject || !term || !school) {
    throw new Error(
      "School, class, subject and term are required."
    );
  }

  assertTeacherClassAccess(actor, className);
  assertTeacherSubjectAccess(actor, subject);

  const rows =
    Array.isArray(payload.results)
      ? payload.results
      : [];

  if (!rows.length) {
    throw new Error("No result rows were supplied.");
  }

  const students =
    await listStudents(
      env,
      "",
      school
    );

  const studentMap = new Map(
    students.map(
      student => [
        String(student.studentId || student.id),
        student
      ]
    )
  );

  const saved = [];
  const failed = [];

  for (const row of rows) {
    const studentId =
      String(
        row.studentId ||
        row.uid ||
        ""
      ).trim();

    const student =
      studentMap.get(studentId);

    if (!student) {
      failed.push({
        studentId,
        error: "Student not found."
      });
      continue;
    }

    if (
      String(student.className || "").trim().toLowerCase() !==
      className.toLowerCase()
    ) {
      failed.push({
        studentId,
        error: "Student is not in the selected class."
      });
      continue;
    }

    const ca = Number(row.ca);
    const exam = Number(row.exam);

    if (
      !Number.isFinite(ca) ||
      !Number.isFinite(exam) ||
      ca < 0 ||
      ca > 40 ||
      exam < 0 ||
      exam > 60
    ) {
      failed.push({
        studentId,
        error: "CA must be 0–40 and Exam must be 0–60."
      });
      continue;
    }

    const total = ca + exam;
    const grade = resultGrade(total, section);
    const remark = resultRemark(grade);

    const resultId =
      `${studentId}_${section}_${term}_${subject}`
        .replace(/[^a-zA-Z0-9_-]+/g, "_")
        .slice(0, 140);

    const existing =
      await getDocument(
        env,
        "studentResults",
        resultId
      );

    const now = new Date().toISOString();

    const record = {
      resultId,
      studentId,
      school,
      section,
      className,
      subject,
      term,
      session,

      ca,
      exam,
      total,
      grade,
      remark,

      position:
        existing?.position ||
        row.position ||
        "",

      firstTerm:
        existing?.firstTerm ??
        row.firstTerm ??
        "",

      secondTerm:
        existing?.secondTerm ??
        row.secondTerm ??
        "",

      cumulativeAverage:
        existing?.cumulativeAverage ??
        row.cumulativeAverage ??
        "",

      status: "saved",

      createdAt:
        existing?.createdAt ||
        now,

      updatedAt: now
    };

    await setDocument(
      env,
      "studentResults",
      resultId,
      record
    );

    saved.push(record);
  }

  return {
    saved,
    failed,
    savedCount: saved.length,
    failedCount: failed.length,
    message:
      failed.length
        ? "Some result rows were not saved."
        : "Results saved successfully."
  };
}

async function getClassTeacherResultReview(
  env,
  actor,
  payload
) {
  const className =
    String(payload.className || "").trim();

  const term =
    String(payload.term || "").trim();

  const session =
    String(
      payload.session ||
      payload.academicSession ||
      ""
    ).trim();

  if (!className || !term) {
    throw new Error(
      "Class and term are required."
    );
  }

  assertTeacherClassAccess(actor, className);

  if (normalizeRole(actor.role) !== "class_teacher") {
    throw new Error(
      "Only the Class Teacher can review the full class result."
    );
  }

  const students =
    await listDocuments(env, "students");

  const classStudents =
    students.filter(
      student =>
        String(student.className || "")
          .trim()
          .toLowerCase() === className.toLowerCase() &&
        student.active !== false
    );

  const allResults =
    await listDocuments(
      env,
      "studentResults"
    );

  const classResults =
    allResults.filter(
      result =>
        String(result.className || "")
          .trim()
          .toLowerCase() === className.toLowerCase() &&
        String(result.term || "")
          .trim()
          .toLowerCase() === term.toLowerCase() &&
        (
          !session ||
          String(result.session || "")
            .trim()
            .toLowerCase() === session.toLowerCase()
        )
    );

  const byStudent = new Map();

  for (const result of classResults) {
    if (!byStudent.has(result.studentId)) {
      byStudent.set(result.studentId, []);
    }
    byStudent.get(result.studentId).push(result);
  }

  const rows =
    classStudents.map(student => {
      const results =
        byStudent.get(
          student.studentId
        ) || [];

      const total =
        results.reduce(
          (sum, item) =>
            sum + Number(item.total || 0),
          0
        );

      const average =
        results.length
          ? total / results.length
          : 0;

      return {
        studentId: student.studentId,
        studentName: student.studentName,
        className: student.className,
        arm: student.arm || "",
        department: student.department || "",
        results,
        totalScore: total,
        subjectCount: results.length,
        average: Number(average.toFixed(1))
      };
    });

  const finalized =
    classResults.length > 0 &&
    classResults.every(
      item => item.status === "finalized"
    );

  return {
    className,
    term,
    session,
    status: finalized ? "Finalized" : "Review",
    students: rows
  };
}

async function finalizeClassResult(
  env,
  actor,
  payload
) {
  const className =
    String(payload.className || "").trim();

  const term =
    String(payload.term || "").trim();

  const session =
    String(
      payload.session ||
      payload.academicSession ||
      ""
    ).trim();

  if (!className || !term) {
    throw new Error(
      "Class and term are required."
    );
  }

  if (normalizeRole(actor.role) !== "class_teacher") {
    throw new Error(
      "Only the Class Teacher can finalize a class result."
    );
  }

  assertTeacherClassAccess(actor, className);

  const results =
    await listDocuments(
      env,
      "studentResults"
    );

  const matching =
    results.filter(
      item =>
        String(item.className || "")
          .trim()
          .toLowerCase() === className.toLowerCase() &&
        String(item.term || "")
          .trim()
          .toLowerCase() === term.toLowerCase() &&
        (
          !session ||
          String(item.session || "")
            .trim()
            .toLowerCase() === session.toLowerCase()
        )
    );

  if (!matching.length) {
    throw new Error(
      "There are no saved subject results to finalize."
    );
  }

  const now = new Date().toISOString();

  for (const result of matching) {
    await updateDocument(
      env,
      "studentResults",
      result.resultId,
      {
        status: "finalized",
        finalizedAt: now,
        finalizedBy:
          actor.uid ||
          actor.id ||
          ""
      }
    );
  }

  return {
    className,
    term,
    session,
    finalizedCount: matching.length,
    status: "Finalized"
  };
}

function resultTermRank(term) {
  const t = String(term || "").toLowerCase();
  if (/first|1st/.test(t)) return 1;
  if (/second|2nd/.test(t)) return 2;
  if (/third|3rd/.test(t)) return 3;
  return 0;
}

function resultRecordDate(item) {
  return String(item.updatedAt || item.createdAt || item.timestamp || "");
}

function buildStudentResultRows(allRows, currentTerm) {
  const currentRank = resultTermRank(currentTerm);
  const bySubject = new Map();

  for (const row of allRows) {
    const subject = String(row.subject || "").trim();
    if (!subject) continue;
    const rank = resultTermRank(row.term);
    if (!rank || (currentRank && rank > currentRank)) continue;
    const key = subject.toLowerCase();
    if (!bySubject.has(key)) bySubject.set(key, { subject });
    const item = bySubject.get(key);
    const total = Number(row.total ?? ((Number(row.ca) || 0) + (Number(row.exam) || 0)));
    const percentage = Number.isFinite(total) ? total : "";
    if (rank === currentRank || (!currentRank && rank === 3)) {
      item.ca = row.ca ?? "";
      item.exam = row.exam ?? "";
      item.total = total;
      item.grade = row.grade || resultGrade(total, row.section || "senior");
      item.remark = row.remark || resultRemark(item.grade);
      item.position = row.position ?? "";
      item.currentTerm = row.term || currentTerm || "";
      item.session = row.session || "";
    }
    if (rank === 1) item.firstTerm = percentage;
    if (rank === 2) item.secondTerm = percentage;
    if (rank === 3) item.thirdTerm = percentage;
  }

  return [...bySubject.values()]
    .filter(x => x.ca !== undefined || x.exam !== undefined || x.total !== undefined)
    .sort((a,b) => a.subject.localeCompare(b.subject));
}

async function getStudentResultsByAccessCode(
  env,
  accessCode,
  school
) {
  const code = String(accessCode || "").trim().toUpperCase();
  if (!code) throw new Error("Result Access Code is required.");

  const students = await listDocuments(env, "students");
  const requestedSchool = normalizeSchool(school);
  const student = students.find(item =>
    String(item.resultAccessCode || "").trim().toUpperCase() === code &&
    item.active !== false &&
    (!requestedSchool || normalizeSchool(item.school) === requestedSchool)
  );
  if (!student) throw new Error("Invalid Result Access Code.");

  const allResults = await listDocuments(env, "studentResults");
  const studentResults = allResults
    .filter(item => String(item.studentId || "") === String(student.studentId || ""))
    .filter(item => item.status === "finalized");

  if (!studentResults.length) throw new Error("This student's result has not been finalized yet.");

  studentResults.sort((a,b) => {
    const sessionCompare = String(a.session || "").localeCompare(String(b.session || ""));
    if (sessionCompare) return sessionCompare;
    return resultTermRank(a.term) - resultTermRank(b.term);
  });

  const latest = studentResults[studentResults.length - 1];
  const section = normalizeResultSection(latest?.section, student.school, student.className);
  const currentTerm = latest?.term || "";
  const currentSession = latest?.session || "";
  const currentRows = studentResults.filter(item => String(item.session || "") === String(currentSession));
  const results = buildStudentResultRows(currentRows, currentTerm);
  const schoolName = section === "primary" ? "BALAD NURSERY AND PRIMARY SCHOOLS" : "BALAD COMPREHENSIVE COLLEGE";

  return {
    student: { ...student, admissionNumber: student.admissionNumber || "" },
    results,
    section,
    schoolName,
    session: currentSession,
    term: currentTerm,
    accessCode: code,
    teacherRemark: latest?.teacherRemark || "",
    principalComment: latest?.principalComment || "",
    nextTerm: latest?.nextTerm || "",
    resumptionDate: latest?.resumptionDate || "",
    principalName: latest?.principalName || "",
    psychomotor: latest?.psychomotor || [],
    affective: latest?.affective || []
  };
}

/* ============================================================
   DASHBOARD SUMMARY
============================================================ */

async function dashboardSummary(
  env
) {

  const staff =
    await listStaff(env);

  const students =
    await listStudents(env);

  return {

    staff: {

      total:
        staff.length,

      active:
        staff.filter(
          x => x.active
        ).length
    },

    students: {

      total:
        students.length,

      active:
        students.filter(
          x =>
            x.active !== false
        ).length
    }
  };
}


/* ============================================================
   RESET STAFF SETUP
============================================================ */

async function resetStaffSetup(
  env,
  actor
) {

  const staff =
    await listStaff(env);

  const removable =
    staff.filter(
      item =>
        normalizeRole(
          item.role
        ) !== "control"
    );

  const uids =
    removable
      .map(
        item =>
          item.uid ||
          item.id
      )
      .filter(Boolean);

  if (uids.length) {

    await deleteAuthUsers(
      env,
      uids
    );
  }

  for (
    const item
    of removable
  ) {

    await deleteDocument(
      env,
      "staff",
      item.uid ||
      item.id
    );
  }

  await logStaffHistory(
    env,
    "staff_setup_reset",
    actor,
    null,
    {
      removedCount:
        removable.length
    }
  );

  return {

    removedCount:
      removable.length,

    removed:
      removable.map(
        item => ({
          uid:
            item.uid ||
            item.id,

          loginCode:
            item.loginCode ||
            item.staffCode ||
            "",

          name:
            item.name ||
            ""
        })
      ),

    kept:
      staff.length -
      removable.length,

    message:
      "All non-control staff accounts and profiles were reset. The Control account was kept."
  };
}


/* ============================================================
   ACTION ROUTER
============================================================ */

/* ============================================================
   STUDENT ID CARD + GATE ATTENDANCE
============================================================ */

async function findStudentByScanCode(env, code) {
  const value = String(code || "").trim();
  if (!value) throw new Error("Scan code is required.");
  const students = await listDocuments(env, "students");
  return students.find(s => String(s.scanCode || "").trim() === value) || null;
}

async function getTodayStudentAttendance(env, studentId) {
  const rows = await listDocuments(env, "studentAttendance");
  const day = new Date().toISOString().slice(0, 10);
  return rows
    .filter(r => String(r.studentId || "") === String(studentId || "") && String(r.date || "") === day)
    .sort((a,b) => String(a.updatedAt || a.createdAt || "").localeCompare(String(b.updatedAt || b.createdAt || "")))[0] || null;
}

async function sendParentAttendanceMessage(env, student, event) {
  const phone = String(student.guardianPhone || "").trim();
  const parent = String(student.guardianName || "Parent/Guardian").trim();
  const name = String(student.studentName || "Student").trim();
  const time = new Date().toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
  const action = event === "arrival" ? "arrived at school" : "left school";
  const message = `BALAD Private Schools: ${name} has ${action}. Time: ${time}.`;

  const notification = {
    studentId: student.studentId,
    studentName: name,
    parentName: parent,
    phone,
    event,
    message,
    channel: "sms",
    status: "queued",
    createdAt: new Date().toISOString()
  };

  const notificationId = Date.now().toString(36).toUpperCase() + "-" + randomCode(6);

  if (phone && envValue(env, "TERMII_API_KEY") && envValue(env, "TERMII_SENDER_ID")) {
    let normalized = phone.replace(/[^0-9+]/g, "");
    if (normalized.startsWith("0")) normalized = "234" + normalized.slice(1);
    if (normalized.startsWith("+")) normalized = normalized.slice(1);
    const apiKey = envValue(env, "TERMII_API_KEY");
    const sender = envValue(env, "TERMII_SENDER_ID");
    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: normalized,
        from: sender,
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: apiKey
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.code === "020") {
      notification.status = "failed";
      notification.providerResponse = data;
    } else {
      notification.status = "sent";
      notification.providerResponse = data;
    }
  } else {
    notification.status = phone ? "queued_provider_not_configured" : "no_parent_phone";
  }

  await setDocument(env, "parentNotifications", notificationId, notification);
  return notification;
}

async function recordStudentScan(env, actor, input) {
  const code = String(input.scanCode || input.code || "").trim();
  const student = await findStudentByScanCode(env, code);
  if (!student) throw new Error("Student ID barcode was not recognised.");
  if (student.active === false) throw new Error("This student's ID card is inactive.");

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const existing = await getTodayStudentAttendance(env, student.studentId);
  const event = existing && existing.arrivalAt && !existing.departureAt ? "departure" : "arrival";

  if (existing && event === "arrival" && existing.arrivalAt) {
    const age = now.getTime() - new Date(existing.arrivalAt).getTime();
    if (age < 60000) throw new Error("This student's arrival was just recorded. Please wait before scanning again.");
  }

  const attendanceId = existing?.id || `${day}_${student.studentId}`;
  const data = existing || {
    id: attendanceId,
    studentId: student.studentId,
    studentName: student.studentName,
    school: student.school,
    className: student.className,
    date: day,
    arrivalAt: "",
    departureAt: "",
    createdAt: now.toISOString()
  };

  if (event === "arrival") data.arrivalAt = now.toISOString();
  else data.departureAt = now.toISOString();
  data.updatedAt = now.toISOString();

  await setDocument(env, "studentAttendance", attendanceId, data);

  const notification = await sendParentAttendanceMessage(env, student, event);

  await logAudit(env, `student_${event}_scan`, actor, "studentAttendance", attendanceId, {
    studentId: student.studentId,
    studentName: student.studentName,
    school: student.school,
    className: student.className,
    notificationStatus: notification.status
  });

  return { student, attendance: data, event, notification };
}

async function listStudentAttendance(env, input = {}) {
  const day = String(input.date || new Date().toISOString().slice(0, 10)).trim();
  const school = normalizeSchool(input.school);
  const rows = (await listDocuments(env, "studentAttendance"))
    .filter(r => String(r.date || "") === day && (!school || normalizeSchool(r.school) === school))
    .sort((a,b) => String(a.studentName || "").localeCompare(String(b.studentName || "")));
  return { date: day, attendance: rows };
}


async function handleAction(
  request,
  env,
  body,
  actor
) {

  const action =
    String(
      body.action || ""
    )
      .trim()
      .toLowerCase();

  assertDashboardActionAccess(action, actor);


  /* ----------------------------------------------------------
     DASHBOARD
  ---------------------------------------------------------- */

  if (
    action ===
    "dashboard_summary"
  ) {

    return success({
      summary:
        await dashboardSummary(
          env
        )
    });
  }


  /* ----------------------------------------------------------
     AUDIT
  ---------------------------------------------------------- */

  if (
    action ===
    "list_audit"
  ) {

    return success({
      logs:
        await listAudit(
          env,
          body.search ||
          body.query ||
          ""
        )
    });
  }


  /* ----------------------------------------------------------
     STAFF LIST
  ---------------------------------------------------------- */

  if (
    action === "list" ||
    action === "list_staff" ||
    action === "get_staff"
  ) {

    const role = normalizeRole(actor.role);

    if (role === "teacher" || role === "class_teacher" || role === "other") {
      const ownUid = String(actor.uid || "").trim();
      const own = await getDocument(env, "staff", ownUid);
      if (!own) throw new Error("Your staff profile was not found.");

      return success({
        staff: [
          {
            uid: own.uid || own.id,
            id: own.id,
            loginCode: own.loginCode || own.staffCode || "",
            staffCode: own.staffCode || own.loginCode || "",
            name: own.name || "",
            role: normalizeRole(own.role || ""),
            school: normalizeSchool(own.school),
            active: own.active !== false,
            email: own.email || "",
            homeroom: own.homeroom || own.classTeacherOf || "",
            assignedClasses: cleanArray(own.assignedClasses),
            assignedSubjects: cleanArray(own.assignedSubjects),
            createdAt: own.createdAt || "",
            updatedAt: own.updatedAt || ""
          }
        ]
      });
    }

    return success({
      staff:
        await listStaff(
          env,
          body.school,
          role === "control" || role === "management"
        )
    });
  }


  if (action === "list_public_staff") {
  const rows = await listDocuments(env, "publicStaff");

  return success({
    staff: rows
      .map(item => ({
        id: item.id,
        name: item.name || "",
        position: item.position || "",
        qualification: item.qualification || "",
        subjects: cleanArray(item.subjects),
        category: item.category || "",
        school: item.school || "",
        photoUrl: item.photoUrl || "",
        accountUid: item.accountUid || "",
        active: item.active !== false,
        updatedAt: item.updatedAt || ""
      }))
      .filter(item => item.active !== false)
  });
}

if (action === "save_public_staff") {
  const input = body.staff || {};

  const id =
    String(body.id || "").trim() ||
    "profile-" +
      Date.now() +
      "-" +
      Math.random().toString(36).slice(2, 8);

  const category =
    String(input.category || "")
      .trim()
      .toLowerCase();

  if (
    ![
      "management",
      "college",
      "primary",
      "non_teaching"
    ].includes(category)
  ) {
    throw new Error("Invalid staff content category.");
  }

  const name = String(input.name || "").trim();

  if (!name) {
    throw new Error("Staff name is required.");
  }

  const position =
    String(input.position || "").trim();

  const qualification =
    String(input.qualification || "").trim();

  const subjects =
    Array.isArray(input.subjects)
      ? input.subjects
          .map(x => String(x).trim())
          .filter(Boolean)
      : [];

  if (
    (category === "management" ||
      category === "non_teaching") &&
    !position
  ) {
    throw new Error(
      category === "management"
        ? "Position / Role is required."
        : "Role is required."
    );
  }

  if (
    (category === "management" ||
      category === "college") &&
    !qualification
  ) {
    throw new Error("Qualification is required.");
  }

  if (
    (category === "management" ||
      category === "college") &&
    !subjects.length
  ) {
    throw new Error("Subject is required.");
  }

  const data = {
    name,
    position:
      category === "management" ||
      category === "non_teaching"
        ? position
        : "",
    qualification:
      category === "management" ||
      category === "college"
        ? qualification
        : "",
    subjects:
      category === "management" ||
      category === "college"
        ? subjects
        : [],
    category,
    school:
      category === "college"
        ? "college"
        : category === "primary"
          ? "primary"
          : "both",
    photoUrl:
      String(input.photoUrl || "").trim(),
    accountUid:
      String(input.accountUid || "").trim(),
    active: input.active !== false,
    updatedAt: new Date().toISOString()
  };

  await setDocument(
    env,
    "publicStaff",
    id,
    data
  );

  await logAudit(
    env,
    "public_staff_saved",
    actor,
    "publicStaff",
    id,
    {
      category,
      name
    }
  );

  return success({
    id,
    staff: {
      id,
      ...data
    }
  });
}

if (action === "delete_public_staff") {
  const id =
    String(body.id || "").trim();

  if (!id) {
    throw new Error(
      "Staff profile ID is required."
    );
  }

  await deleteDocument(
    env,
    "publicStaff",
    id
  );

  await logAudit(
    env,
    "public_staff_deleted",
    actor,
    "publicStaff",
    id,
    {}
  );

  return success({ id });
}

  /* ----------------------------------------------------------
     CREATE STAFF
  ---------------------------------------------------------- */

  if (
    action === "create" ||
    action === "create_staff"
  ) {

    const input =
      body.staff ||
      body;

    const result =
      await createStaff(
        env,
        input
      );

    await logStaffHistory(
      env,
      "staff_created",
      actor,
      result
    );

    await logAudit(
      env,
      "staff_created",
      actor,
      "staff",
      result.uid,
      {
        school:
          result.school
      }
    );

    return success(
      {
        result,

        staff:
          result,

        temporaryPassword:
          result.temporaryPassword
      },
      201
    );
  }


  /* ----------------------------------------------------------
     GENERATE STAFF TEMPLATE ROWS
  ---------------------------------------------------------- */

  if (
    action === "generate" ||
    action === "generate_staff"
  ) {

    return success(
      await generateStaff(
        env,
        body
      )
    );
  }


  /* ----------------------------------------------------------
     CREATE GENERATED STAFF
  ---------------------------------------------------------- */

  if (
    action === "bulk_create" ||
    action === "bulk_create_staff" ||
    action === "create_bulk_staff"
  ) {

    const items =
      Array.isArray(
        body.staff
      )
        ? body.staff
        : Array.isArray(
            body.records
          )
          ? body.records
          : [];

    const result =
      await bulkCreate(
        env,
        items
      );

    for (
      const item
      of result.created
    ) {

      await logStaffHistory(
        env,
        "staff_created",
        actor,
        item,
        {
          bulk: true
        }
      );
    }

    if (
      !result.created.length &&
      result.failed.length
    ) {

      return failure(
        "No staff accounts were created.",
        400,
        result
      );
    }

    return success(
      result
    );
  }


  /* ----------------------------------------------------------
     STAFF PROFILE / WEBSITE CONTENT
  ---------------------------------------------------------- */

  if (action === "update_staff_profile") {
    const uid=String(body.uid || body.staffUid || "").trim();
    const result=await updateStaffProfile(env,uid,body);
    await logStaffHistory(env,"staff_profile_updated",actor,result,{websiteContent:true});
    await logAudit(env,"staff_profile_updated",actor,"staff",result.uid||result.id);
    return success({result});
  }


  /* ----------------------------------------------------------
     TEACHER ASSIGNMENTS
  ---------------------------------------------------------- */

  if (
    action === "assign" ||
    action === "assign_teacher" ||
    action ===
      "update_teacher_assignments" ||
    action ===
      "update_staff_assignment" ||
    action ===
      "assign_teacher_classes"
  ) {

    const uid =
      String(
        body.uid ||
        body.staffUid ||
        ""
      ).trim();

    const result =
      await updateAssignments(
        env,
        uid,
        body
      );

    await logStaffHistory(
      env,
      "teacher_assignments_updated",
      actor,
      result,
      {
        assignedClasses:
          result.assignedClasses,

        assignedSubjects:
          result.assignedSubjects,

        homeroom:
          result.homeroom
      }
    );

    await logAudit(
      env,
      "teacher_assignments_updated",
      actor,
      "staff",
      result.uid ||
      result.id
    );

    return success({
      result
    });
  }


  /* ----------------------------------------------------------
     ACTIVATE / DEACTIVATE
  ---------------------------------------------------------- */

  if (
    action === "set_active" ||
    action ===
      "set_staff_active" ||
    action ===
      "update_staff_status"
  ) {

    const uid =
      String(
        body.uid ||
        body.staffUid ||
        ""
      ).trim();

    const result =
      await setStaffActive(
        env,
        uid,
        body.active
      );

    await logStaffHistory(
      env,
      body.active
        ? "staff_activated"
        : "staff_deactivated",
      actor,
      result
    );

    await logAudit(
      env,
      body.active
        ? "staff_activated"
        : "staff_deactivated",
      actor,
      "staff",
      result.uid ||
      result.id
    );

    return success({
      result
    });
  }


  /* ----------------------------------------------------------
     RESET PASSWORD
  ---------------------------------------------------------- */

  if (
    action ===
      "reset_password" ||
    action ===
      "reset_staff_password" ||
    action ===
      "password_reset"
  ) {

    const uid =
      String(
        body.uid ||
        body.staffUid ||
        ""
      ).trim();

    const result =
      await resetStaffPassword(
        env,
        uid
      );

    await logStaffHistory(
      env,
      "password_reset",
      actor,
      result
    );

    await logAudit(
      env,
      "password_reset",
      actor,
      "staff",
      result.uid
    );

    return success({
      ...result
    });
  }


  /* ----------------------------------------------------------
     STAFF HISTORY
  ---------------------------------------------------------- */

  if (
    action ===
      "staff_history" ||
    action ===
      "get_staff_history"
  ) {

    return success({
      history:
        await getStaffHistory(
          env,
          body.query ||
          body.search ||
          ""
        )
    });
  }


  /* ----------------------------------------------------------
     RESET STAFF SETUP
  ---------------------------------------------------------- */

  if (
    action ===
      "reset_staff_setup" ||
    action ===
      "reset_setup" ||
    action ===
      "staff_setup_reset"
  ) {

    return success(
      await resetStaffSetup(
        env,
        actor
      )
    );
  }


  /* ----------------------------------------------------------
     CLASSES
  ---------------------------------------------------------- */

  if (action === "save_class") {
    return success(
      await saveClass(env, body.class || body)
    );
  }


  if (
    action ===
      "list_classes" ||
    action ===
      "get_classes" ||
    action === "classes"
  ) {

    let classes =
      await listClasses(
        env,
        body.school
      );

    const classRole = normalizeRole(actor.role);

    if (
      classRole === "teacher" ||
      classRole === "class_teacher"
    ) {
      const assigned =
        cleanArray(actor.assignedClasses)
          .map(x => String(x).trim().toLowerCase());

      classes =
        classes.filter(
          item =>
            assigned.includes(
              String(item.name || "")
                .trim()
                .toLowerCase()
            )
        );
    }

    return success({

      classes,

      placementOptions:
        classPlacementOptions(
          classes
        )
    });
  }


  /* ----------------------------------------------------------
     SUBJECTS
  ---------------------------------------------------------- */

  if (
    action ===
      "list_subjects" ||
    action ===
      "get_subjects" ||
    action === "subjects"
  ) {

    const subjectRole =
      normalizeRole(actor.role);

    const school = normalizeSchool(
      body.school || actor.school
    );

    const catalog = subjectsForSchool(school);

    const subjects =
      (
        subjectRole === "teacher" ||
        subjectRole === "class_teacher"
      )
        ? catalog.filter(item =>
            cleanArray(actor.assignedSubjects)
              .map(x => String(x).trim().toLowerCase())
              .includes(item.name.toLowerCase())
          )
        : catalog;

    return success({
      subjects
    });
  }


  /* ----------------------------------------------------------
     RESULT ENTRY / REVIEW
  ---------------------------------------------------------- */

  if (
    action === "save_subject_results" ||
    action === "save_result_entries"
  ) {
    return success(
      await saveSubjectResults(
        env,
        actor,
        body
      )
    );
  }

  if (
    action === "get_class_teacher_result_review"
  ) {
    return success(
      await getClassTeacherResultReview(
        env,
        actor,
        body
      )
    );
  }

  if (
    action === "finalize_class_result"
  ) {
    return success(
      await finalizeClassResult(
        env,
        actor,
        body
      )
    );
  }


  /* ----------------------------------------------------------
     STUDENT ID CARDS / GATE SCANNING
  ---------------------------------------------------------- */

  if (action === "record_student_scan" || action === "scan_student_id") {
    return success(await recordStudentScan(env, actor, body));
  }

  if (action === "list_student_attendance" || action === "get_student_attendance") {
    return success(await listStudentAttendance(env, body));
  }

  if (action === "get_student_id_card") {
    const id = String(body.studentId || body.id || "").trim();
    const student = await getDocument(env, "students", id);
    if (!student) throw new Error("Student not found.");

    const readerRole = normalizeRole(actor.role);
    if (readerRole === "teacher" || readerRole === "class_teacher") {
      const assigned = cleanArray(actor.assignedClasses)
        .map(x => String(x).trim().toLowerCase());
      if (!assigned.includes(String(student.className || "").trim().toLowerCase())) {
        throw new Error("You are not assigned to this student's class.");
      }
    }

    return success({ student });
  }


  /* ----------------------------------------------------------
     STUDENTS
  ---------------------------------------------------------- */

  if (
    action === "bulk_create_students" ||
    action === "import_students" ||
    action === "bulk_student_import"
  ) {
    if (!["control", "management"].includes(normalizeRole(actor.role))) {
      throw new Error("Only Control or Management can import student profiles.");
    }
    const result = await bulkCreateStudents(env, {
      school: body.school,
      students: body.students || body.records || []
    });
    await logAudit(env, "students_bulk_imported", actor, "student_batch", "", {
      school: normalizeSchool(body.school),
      requested: result.summary.requested,
      created: result.summary.created,
      failed: result.summary.failed
    });
    return success(result);
  }

  if (
    action ===
      "create_student" ||
    action ===
      "add_student"
  ) {

    if (!["control", "management"].includes(normalizeRole(actor.role))) {
      throw new Error(
        "Only Control or Management can create student profiles."
      );
    }

    const student =
      await createStudent(
        env,
        {
          ...(body.student ||
            body),

          school:
            body.school ||
            body.student?.school,

          section:
            body.section ||
            body.student?.section ||
            body.student?.schoolSection
        }
      );

    await logAudit(
      env,
      "student_created",
      actor,
      "student",
      student.studentId,
      {
        school:
          student.school
      }
    );

    return success(
      {
        student
      },
      201
    );
  }


  if (
    action ===
      "list_students" ||
    action ===
      "get_students" ||
    action === "students"
  ) {

    return success({

      students:
        await (async () => {
          const role = normalizeRole(actor.role);

          let students =
            await listStudents(
              env,
              body.search ||
              body.query ||
              "",
              body.school
            );

          if (
            role === "teacher" ||
            role === "class_teacher"
          ) {
            const assigned =
              cleanArray(actor.assignedClasses)
                .map(x => String(x).trim().toLowerCase());

            students =
              students.filter(
                student =>
                  assigned.includes(
                    String(student.className || "")
                      .trim()
                      .toLowerCase()
                  )
              );
          }

          return students;
        })()
    });
  }


  if (
    action ===
    "get_student"
  ) {

    const id =
      String(
        body.id ||
        body.studentId ||
        ""
      ).trim();

    const student =
      await getDocument(
        env,
        "students",
        id
      );

    if (!student) {
      throw new Error(
        "Student not found."
      );
    }

    const readerRole = normalizeRole(actor.role);
    if (readerRole === "teacher" || readerRole === "class_teacher") {
      const assigned = cleanArray(actor.assignedClasses)
        .map(x => String(x).trim().toLowerCase());
      if (!assigned.includes(String(student.className || "").trim().toLowerCase())) {
        throw new Error("You are not assigned to this student's class.");
      }
    }

    return success({
      student
    });
  }


  if (
    action ===
    "update_student"
  ) {

    if (!["control", "management"].includes(normalizeRole(actor.role))) {
      throw new Error(
        "Only Control or Management can manage student profiles."
      );
    }

    const id =
      String(
        body.studentId ||
        body.id ||
        ""
      ).trim();

    return success({

      student:
        await updateStudent(
          env,
          id,
          body.updates ||
          body.student ||
          {}
        )
    });
  }


  if (
    action ===
    "set_student_active"
  ) {

    if (!["control", "management"].includes(normalizeRole(actor.role))) {
      throw new Error(
        "Only Control or Management can manage student profiles."
      );
    }

    const id =
      String(
        body.studentId ||
        body.uid ||
        body.id ||
        ""
      ).trim();

    return success({

      student:
        await setStudentActive(
          env,
          id,
          body.active
        )
    });
  }


  if (
    action ===
    "reset_result_access_code"
  ) {

    if (!["control", "management"].includes(normalizeRole(actor.role))) {
      throw new Error(
        "Only Control or Management can manage student profiles."
      );
    }

    const id =
      String(
        body.studentId ||
        body.id ||
        ""
      ).trim();

    return success({

      result:
        await resetStudentCode(
          env,
          id
        )
    });
  }


  if (
    action ===
    "delete_student"
  ) {

    if (!["control", "management"].includes(normalizeRole(actor.role))) {
      throw new Error(
        "Only Control or Management can manage student profiles."
      );
    }

    const id =
      String(
        body.studentId ||
        body.id ||
        ""
      ).trim();

    return success(
      await deleteStudent(
        env,
        id
      )
    );
  }


  throw new Error(
    "Unknown dashboard action: " +
    action
  );
}


/* ============================================================
   GALLERY MEDIA UPLOAD (CLOUDINARY)
   Gallery does not use Firebase Storage.
============================================================ */

async function uploadGalleryMedia(request, env) {
  const cloudName = envValue(env, "CLOUDINARY_CLOUD_NAME");
  const uploadPreset = envValue(env, "CLOUDINARY_UPLOAD_PRESET");

  if (!cloudName || !uploadPreset) {
    return failure(
      "Gallery storage is not configured on the Worker. Add CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET.",
      500
    );
  }

  const control = await verifyControl(
    env,
    bearerToken(request)
  );

  if (!control.ok) {
    return failure(control.error, control.status);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return failure("Invalid gallery upload request.", 400);
  }

  const file = form.get("file");
  const albumId = String(form.get("albumId") || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-");

  if (!(file instanceof File)) {
    return failure("No gallery media file was received.", 400);
  }

  if (!albumId) {
    return failure("Gallery album ID is required.", 400);
  }

  if (file.size > 80 * 1024 * 1024) {
    return failure("File is too large. Maximum 80 MB per gallery file.", 413);
  }

  const type = String(file.type || "").toLowerCase();
  let resourceType = "image";

  if (type.startsWith("video/")) {
    resourceType = "video";
  } else if (!type.startsWith("image/")) {
    return failure("Gallery accepts image and video files only.", 415);
  }

  const endpoint =
    "https://api.cloudinary.com/v1_1/" +
    encodeURIComponent(cloudName) +
    "/" +
    resourceType +
    "/upload";

  const uploadForm = new FormData();
  uploadForm.append("file", file, file.name || "gallery-media");
  uploadForm.append("upload_preset", uploadPreset);
  uploadForm.append("folder", "balad/gallery/" + albumId);

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      body: uploadForm
    });
  } catch (error) {
    console.error("BALAD Cloudinary gallery request failed:", error);
    return failure("Unable to connect to Gallery storage.", 502);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.secure_url) {
    console.error("BALAD Cloudinary gallery upload failed:", data);
    return failure(
      data?.error?.message || "Gallery media upload failed.",
      response.status || 502
    );
  }

  return success({
    url: data.secure_url,
    resourceType,
    publicId: data.public_id || ""
  });
}


/* ============================================================
   MAIN ROUTER
============================================================ */

async function router(
  request,
  env
) {

  const method =
    request.method.toUpperCase();

  const url =
    new URL(
      request.url
    );


  /* CORS */

  if (
    method === "OPTIONS"
  ) {

    return new Response(
      null,
      {
        status: 204,
        headers: CORS
      }
    );
  }


  /* HEALTH */

  if (
    method === "GET" &&
    (
      url.pathname === "/" ||
      url.pathname === "/health"
    )
  ) {

    return success({

      service:
        "BALAD CONTROL001 BACKEND",

      status:
        "online",

      firebaseProject:
        envValue(
          env,
          "FIREBASE_PROJECT_ID"
        ) ||
        PROJECT_ID,

      timestamp:
        new Date().toISOString()
    });
  }


  /* PUBLIC STUDENT RESULT ACCESS */

  if (
    url.pathname === "/results"
  ) {

    if (method !== "POST") {
      return failure(
        "POST request required.",
        405
      );
    }

    let resultBody;

    try {
      resultBody = await request.json();
    } catch {
      return failure(
        "Invalid JSON body.",
        400
      );
    }

    const resultAction =
      String(
        resultBody.action || ""
      ).trim().toLowerCase();

    if (
      resultAction !==
        "get_student_results_by_access_code"
    ) {
      return failure(
        "Unsupported result action.",
        400
      );
    }

    try {
      return success(
        await getStudentResultsByAccessCode(
          env,
          resultBody.accessCode,
          resultBody.school
        )
      );
    } catch (error) {
      return failure(
        error?.message ||
        "Unable to load result.",
        400
      );
    }
  }


  /* GALLERY MEDIA UPLOAD */

  if (url.pathname === "/staff-gallery-upload") {

    if (method !== "POST") {
      return failure(
        "POST request required.",
        405
      );
    }

    try {
      return await uploadGalleryMedia(
        request,
        env
      );
    }
    catch (error) {
      console.error(
        "BALAD gallery upload route error:",
        error
      );

      return failure(
        error?.message || "Gallery upload failed.",
        500
      );
    }
  }


  /* STAFF / CONTROL DASHBOARD API */

  if (
    url.pathname !==
    "/staff-admin"
  ) {

    return failure(
      "Not found.",
      404
    );
  }


  if (
    method !== "POST"
  ) {

    return failure(
      "POST request required.",
      405
    );
  }


  /* REQUIRED FIREBASE SETTINGS */

  if (
    !envValue(
      env,
      "FIREBASE_API_KEY"
    )
  ) {

    return failure(
      "FIREBASE_API_KEY is missing.",
      500
    );
  }

  if (
    !envValue(
      env,
      "FIREBASE_PROJECT_ID"
    )
  ) {

    return failure(
      "FIREBASE_PROJECT_ID is missing.",
      500
    );
  }

  if (
    envValue(
      env,
      "FIREBASE_PROJECT_ID"
    ) !== PROJECT_ID
  ) {

    return failure(
      "Worker is configured for the wrong Firebase project.",
      500,
      {
        expectedProject:
          PROJECT_ID
      }
    );
  }


  /* BODY */

  let body;

  try {

    body =
      await request.json();

  }

  catch {

    return failure(
      "Invalid JSON body.",
      400
    );
  }


  /* STAFF / MANAGEMENT / CONTROL AUTH */

  const idToken =
    bearerToken(
      request
    );

  const access =
    await verifyDashboardAccess(
      env,
      idToken
    );

  if (!access.ok) {

    return failure(
      access.error,
      access.status
    );
  }


  /* ACTION */

  try {

    return await handleAction(
      request,
      env,
      body,
      {
        ...access.profile,
        uid:
          access.uid,
        staffId:
          access.staffId,
        loginCode:
          access.profile?.loginCode ||
          access.staffId
      }
    );

  }

  catch (error) {

    console.error(
      "BALAD Worker operation error:",
      error
    );

    return failure(
      error?.message ||
      "Worker request failed.",
      400
    );
  }
}


/* ============================================================
   CLOUDFLARE ENTRY
============================================================ */

export default {

  async fetch(
    request,
    env
  ) {

    try {

      return await router(
        request,
        env
      );

    }

    catch (error) {

      console.error(
        "BALAD Worker fatal error:",
        error
      );

      return failure(
        error?.message ||
        "Worker fatal error.",
        500
      );
    }
  }
};