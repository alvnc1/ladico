import { initializeApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import {getAuth, GoogleAuthProvider} from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyCTvT6xz3ehX-eA31pcTXbJ26JVOSRI9bo",
  authDomain: "ladico-80eb7.firebaseapp.com",
  projectId: "ladico-80eb7",
  storageBucket: "ladico-80eb7.firebasestorage.app",
  messagingSenderId: "955310221466",
  appId: "1:955310221466:web:38b9fa11acb37004fb1723",
  measurementId: "G-782WZNGPYZ"
};


const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const auth = getAuth(app)
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
export {auth,provider, db};