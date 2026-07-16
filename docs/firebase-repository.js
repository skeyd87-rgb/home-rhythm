const firebaseConfig = {
  projectId: "home-rhythm-skeyd87",
  appId: "1:95810385749:web:d027433f67b425e79e61dc",
  storageBucket: "home-rhythm-skeyd87.firebasestorage.app",
  apiKey: "AIzaSyA4t5GF-BARmaYy1sioTao0zts9yKBl67k",
  authDomain: "home-rhythm-skeyd87.firebaseapp.com",
  messagingSenderId: "95810385749"
};

const sdkVersion = "12.15.0";
const sdkBase = `https://www.gstatic.com/firebasejs/${sdkVersion}`;

let modules;
let auth;
let db;
let currentUser = null;
let currentHouseholdId = null;
let started = false;
let householdUnsubscribers = [];

let session = {
  status: "local",
  user: null,
  household: null,
  members: [],
  syncMessage: "Saved on this device"
};

const sessionListeners = new Set();
const dataListeners = new Set();

function notifySession() {
  sessionListeners.forEach((listener) => listener({ ...session }));
}

function notifyData(payload) {
  dataListeners.forEach((listener) => listener(payload));
}

function setSession(updates) {
  session = { ...session, ...updates };
  notifySession();
}

async function loadFirebase() {
  if (modules) return modules;
  const [appModule, authModule, firestoreModule] = await Promise.all([
    import(`${sdkBase}/firebase-app.js`),
    import(`${sdkBase}/firebase-auth.js`),
    import(`${sdkBase}/firebase-firestore.js`)
  ]);
  const app = appModule.initializeApp(firebaseConfig);
  auth = authModule.getAuth(app);
  db = firestoreModule.getFirestore(app);
  modules = { auth: authModule, firestore: firestoreModule };
  return modules;
}

function publicUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    displayName: user.displayName || user.email?.split("@")[0] || "Household member",
    email: user.email || "",
    photoURL: user.photoURL || ""
  };
}

function cleanDocument(value) {
  return JSON.parse(JSON.stringify(value));
}

function clearHouseholdSubscriptions() {
  householdUnsubscribers.forEach((unsubscribe) => unsubscribe());
  householdUnsubscribers = [];
}

async function handleAuthUser(user) {
  clearHouseholdSubscriptions();
  currentUser = user;
  currentHouseholdId = null;

  if (!user) {
    setSession({
      status: "local",
      user: null,
      household: null,
      members: [],
      syncMessage: "Saved on this device"
    });
    return;
  }

  const { doc, getDoc, serverTimestamp, setDoc } = modules.firestore;
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
    updatedAt: serverTimestamp()
  }, { merge: true });

  const profile = await getDoc(userRef);
  const householdId = profile.data()?.householdId || null;
  setSession({
    status: householdId ? "connecting" : "signed-in",
    user: publicUser(user),
    household: null,
    members: [],
    syncMessage: householdId ? "Connecting household" : "Choose or join a household"
  });

  if (householdId) connectToHousehold(householdId);
}

function connectToHousehold(householdId) {
  clearHouseholdSubscriptions();
  currentHouseholdId = householdId;
  const { collection, doc, onSnapshot } = modules.firestore;
  const remote = { household: null, members: [], tasks: null, settings: null };

  const emitWhenReady = () => {
    if (!remote.household || remote.tasks === null || remote.settings === null) return;
    notifyData({
      householdId,
      household: remote.household,
      members: remote.members,
      tasks: remote.tasks,
      customZones: remote.settings.customZones || []
    });
    setSession({
      status: "synced",
      household: remote.household,
      members: remote.members,
      syncMessage: "Synced across household devices"
    });
  };

  const onError = (error) => {
    console.error("Home Rhythm sync error", error);
    setSession({ status: "error", syncMessage: "Sync needs attention" });
  };

  householdUnsubscribers.push(onSnapshot(doc(db, "households", householdId), (snapshot) => {
    remote.household = snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    emitWhenReady();
  }, onError));

  householdUnsubscribers.push(onSnapshot(collection(db, "households", householdId, "members"), (snapshot) => {
    remote.members = snapshot.docs.map((member) => ({ id: member.id, ...member.data() }));
    emitWhenReady();
  }, onError));

  householdUnsubscribers.push(onSnapshot(collection(db, "households", householdId, "chores"), (snapshot) => {
    remote.tasks = snapshot.docs.map((task) => ({ id: task.id, ...task.data() }));
    emitWhenReady();
  }, onError));

  householdUnsubscribers.push(onSnapshot(doc(db, "households", householdId, "settings", "general"), (snapshot) => {
    remote.settings = snapshot.exists() ? snapshot.data() : { customZones: [] };
    emitWhenReady();
  }, onError));
}

async function uniqueInviteCode() {
  const { doc, getDoc } = modules.firestore;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    const existing = await getDoc(doc(db, "invites", code));
    if (!existing.exists()) return code;
  }
  throw new Error("Could not create a household code. Please try again.");
}

async function createHousehold(name, tasks, customZones) {
  if (!currentUser) throw new Error("Sign in before creating a household.");
  const {
    collection,
    doc,
    serverTimestamp,
    setDoc,
    writeBatch
  } = modules.firestore;
  const householdRef = doc(collection(db, "households"));
  const householdId = householdRef.id;
  const inviteCode = await uniqueInviteCode();
  const membershipBatch = writeBatch(db);

  membershipBatch.set(householdRef, {
    name: name.trim() || "Our Home",
    createdBy: currentUser.uid,
    inviteCode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  membershipBatch.set(doc(db, "households", householdId, "members", currentUser.uid), {
    displayName: currentUser.displayName || "",
    email: currentUser.email || "",
    photoURL: currentUser.photoURL || "",
    role: "owner",
    inviteCode: "owner",
    joinedAt: serverTimestamp()
  });
  membershipBatch.set(doc(db, "users", currentUser.uid), {
    householdId,
    updatedAt: serverTimestamp()
  }, { merge: true });
  await membershipBatch.commit();

  const contentBatch = writeBatch(db);
  contentBatch.set(doc(db, "households", householdId, "settings", "general"), {
    customZones: cleanDocument(customZones || []),
    updatedAt: serverTimestamp(),
    updatedBy: currentUser.uid
  });

  (tasks || []).forEach((task) => {
    contentBatch.set(doc(db, "households", householdId, "chores", task.id), {
      ...cleanDocument(task),
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid
    });
  });
  (customZones || []).forEach((zone) => {
    contentBatch.set(doc(db, "households", householdId, "zones", zone.id), {
      ...cleanDocument(zone),
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid
    });
  });

  await contentBatch.commit();
  await setDoc(doc(db, "invites", inviteCode), {
    householdId,
    active: true,
    createdBy: currentUser.uid,
    createdAt: serverTimestamp()
  });
  connectToHousehold(householdId);
  return { householdId, inviteCode };
}

async function joinHousehold(rawCode) {
  if (!currentUser) throw new Error("Sign in before joining a household.");
  const code = rawCode.trim().toUpperCase();
  const { doc, getDoc, serverTimestamp, writeBatch } = modules.firestore;
  const invite = await getDoc(doc(db, "invites", code));
  if (!invite.exists() || invite.data().active !== true) {
    throw new Error("That household code is not active.");
  }
  const householdId = invite.data().householdId;
  const batch = writeBatch(db);
  batch.set(doc(db, "households", householdId, "members", currentUser.uid), {
    displayName: currentUser.displayName || "",
    email: currentUser.email || "",
    photoURL: currentUser.photoURL || "",
    role: "member",
    inviteCode: code,
    joinedAt: serverTimestamp()
  });
  batch.set(doc(db, "users", currentUser.uid), {
    householdId,
    updatedAt: serverTimestamp()
  }, { merge: true });
  await batch.commit();
  connectToHousehold(householdId);
  return householdId;
}

async function saveTask(task, options = {}) {
  if (!currentUser || !currentHouseholdId) return;
  const { collection, doc, serverTimestamp, setDoc } = modules.firestore;
  await setDoc(doc(db, "households", currentHouseholdId, "chores", task.id), {
    ...cleanDocument(task),
    updatedAt: serverTimestamp(),
    updatedBy: currentUser.uid
  }, { merge: true });
  if (options.recordCompletion) {
    const eventRef = doc(collection(db, "households", currentHouseholdId, "completionEvents"));
    await setDoc(eventRef, {
      choreId: task.id,
      choreTitle: task.title,
      completedBy: currentUser.uid,
      completedAt: serverTimestamp(),
      owner: task.owner,
      zone: task.zone
    });
  }
}

async function deleteTask(taskId) {
  if (!currentUser || !currentHouseholdId) return;
  const { deleteDoc, doc } = modules.firestore;
  await deleteDoc(doc(db, "households", currentHouseholdId, "chores", taskId));
}

async function replaceTasks(tasks) {
  if (!currentUser || !currentHouseholdId) return;
  const { collection, doc, getDocs, serverTimestamp, writeBatch } = modules.firestore;
  const snapshot = await getDocs(collection(db, "households", currentHouseholdId, "chores"));
  const batch = writeBatch(db);
  snapshot.docs.forEach((task) => batch.delete(task.ref));
  tasks.forEach((task) => {
    batch.set(doc(db, "households", currentHouseholdId, "chores", task.id), {
      ...cleanDocument(task),
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid
    });
  });
  await batch.commit();
}

async function saveSettings(customZones) {
  if (!currentUser || !currentHouseholdId) return;
  const { collection, doc, getDocs, serverTimestamp, writeBatch } = modules.firestore;
  const existing = await getDocs(collection(db, "households", currentHouseholdId, "zones"));
  const batch = writeBatch(db);
  existing.docs.forEach((zone) => batch.delete(zone.ref));
  customZones.forEach((zone) => {
    batch.set(doc(db, "households", currentHouseholdId, "zones", zone.id), {
      ...cleanDocument(zone),
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid
    });
  });
  batch.set(doc(db, "households", currentHouseholdId, "settings", "general"), {
    customZones: cleanDocument(customZones),
    updatedAt: serverTimestamp(),
    updatedBy: currentUser.uid
  }, { merge: true });
  await batch.commit();
}

async function renameHousehold(name) {
  if (!currentUser || !currentHouseholdId) return;
  const { doc, serverTimestamp, setDoc } = modules.firestore;
  await setDoc(doc(db, "households", currentHouseholdId), {
    name: name.trim() || "Our Home",
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export const backend = {
  async start() {
    if (started) return;
    started = true;
    setSession({ status: "connecting", syncMessage: "Checking household sync" });
    try {
      await loadFirebase();
      modules.auth.onAuthStateChanged(auth, (user) => {
        handleAuthUser(user).catch((error) => {
          console.error("Home Rhythm authentication error", error);
          setSession({ status: "error", syncMessage: "Sign-in needs attention" });
        });
      });
    } catch (error) {
      console.error("Firebase could not load", error);
      setSession({ status: "unavailable", syncMessage: "Offline · saved on this device" });
    }
  },

  onSession(listener) {
    sessionListeners.add(listener);
    listener({ ...session });
    return () => sessionListeners.delete(listener);
  },

  onData(listener) {
    dataListeners.add(listener);
    return () => dataListeners.delete(listener);
  },

  async signIn() {
    await loadFirebase();
    const provider = new modules.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await modules.auth.signInWithPopup(auth, provider);
    } catch (error) {
      if (["auth/popup-blocked", "auth/cancelled-popup-request"].includes(error.code)) {
        await modules.auth.signInWithRedirect(auth, provider);
        return;
      }
      throw error;
    }
  },

  async signOut() {
    if (!auth) return;
    await modules.auth.signOut(auth);
  },

  createHousehold,
  joinHousehold,
  saveTask,
  deleteTask,
  replaceTasks,
  saveSettings,
  renameHousehold,

  isSynced() {
    return Boolean(currentUser && currentHouseholdId);
  }
};
