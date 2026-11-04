import { createContext, useContext, useMemo, useState } from "react";

const messages = {
  en: {
    appName: "Land Title Registry", appSubtitle: "Digital Land Management", dashboard: "Dashboard", parcels: "Parcels",
    registerParcel: "Register Parcel", owners: "Owners", surveys: "Surveys", disputes: "Disputes", transfers: "Transfers",
    certificates: "Certificates", reports: "Reports", users: "Users", settings: "Settings", comingSoon: "Coming soon",
    logout: "Logout", loading: "Loading…", retry: "Try again", noResults: "No records found", search: "Search",
    language: "Language", welcome: "Welcome", registryOverview: "Registry overview", createOwner: "Create owner",
    createParcel: "Register new parcel", view: "View", status: "Status", district: "District", area: "Area",
    landUse: "Land use", actions: "Actions", previous: "Previous", next: "Next", save: "Save", cancel: "Cancel",
    conflict: "Registration blocked by an overlap", pendingSurvey: "This parcel is awaiting survey verification.",
  },
  so: {
    appName: "Diiwaanka Lahaanshaha Dhulka", appSubtitle: "Maamulka Dijitaalka Dhulka", dashboard: "Bogga Guud", parcels: "Dhulalka",
    registerParcel: "Diiwaangeli Dhul", owners: "Milkiilayaasha", surveys: "Sahannada", disputes: "Khilaafaadka", transfers: "Wareejinta",
    certificates: "Shahaadooyinka", reports: "Warbixinnada", users: "Isticmaalayaasha", settings: "Dejinta", comingSoon: "Dhawaan",
    logout: "Ka bax", loading: "Waa la soo rarayaa…", retry: "Mar kale isku day", noResults: "Wax xog ah lama helin", search: "Raadi",
    language: "Luqad", welcome: "Soo dhowow", registryOverview: "Dulmarka diiwaanka", createOwner: "Abuur milkiile",
    createParcel: "Diiwaangeli dhul cusub", view: "Eeg", status: "Xaalad", district: "Degmo", area: "Baaxad",
    landUse: "Isticmaalka dhulka", actions: "Ficillada", previous: "Hore", next: "Xiga", save: "Kaydi", cancel: "Jooji",
    conflict: "Diiwaangelinta waxaa joojiyay is-dul-saar", pendingSurvey: "Dhulkan wuxuu sugayaa xaqiijinta sahanka.",
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("ltr_language") || "en");
  const value = useMemo(() => ({
    language,
    setLanguage(next) { localStorage.setItem("ltr_language", next); setLanguage(next); },
    t(key) { return messages[language]?.[key] || messages.en[key] || key; },
  }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
