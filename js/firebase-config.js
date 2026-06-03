/* ---------------------------------------------------------------------------
 * Firebase live-sync config  (FREE — no credit card needed)
 *
 * While the values below are placeholders, the app runs LOCAL-ONLY (each device
 * keeps its own copy). Fill them in to share ONE live itinerary across everyone.
 *
 * Setup (~3 minutes):
 *  1. Go to https://console.firebase.google.com  →  "Add project"  (any name,
 *     you can disable Google Analytics).
 *  2. In the project: "Build → Realtime Database" → "Create Database" →
 *     pick a location → start in **test mode** (fine for a private trip; you can
 *     tighten the rules later — see README).
 *  3. Project settings (gear icon) → "Your apps" → Web ( </> ) → register an app.
 *  4. Copy the shown firebaseConfig values into the object below. The important
 *     one is **databaseURL** (looks like https://xxxx-default-rtdb.firebaseio.com).
 *  5. Choose any hard-to-guess TRIP_CODE and share the deployed link with your
 *     group. Everyone who opens it edits the same live itinerary.
 * ------------------------------------------------------------------------- */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA_SXVJVVjbnFYBw_2F2fhVa8p95tKo-t8",
  authDomain: "seoulitin.firebaseapp.com",
  databaseURL: "https://seoulitin-default-rtdb.firebaseio.com",
  projectId: "seoulitin",
  storageBucket: "seoulitin.firebasestorage.app",
  messagingSenderId: "359068553111",
  appId: "1:359068553111:web:1ce88109ff033381f83ed2",
  measurementId: "G-913YZ1BZ69"
};

// Everyone in your group must use the SAME trip code to see each other's edits.
const DEFAULT_TRIP_CODE = "korea-2026-itaewon";
