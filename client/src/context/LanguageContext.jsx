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
    pendingApprovals: "Pending approvals", surveyQueue: "Survey queue", surveyQueueDescription: "Review field survey tasks and preserved attempts.", allStatuses: "All statuses", noSurveys: "No surveys found", parcelNumber: "Parcel number", created: "Created", review: "Review", loadSurveysError: "Unable to load surveys.", survey: "Survey", parcelDetails: "Parcel details", openReport: "Open report", missingReport: "A field report is required.", fieldVerification: "Field verification", uploadReport: "Upload report", keepBoundary: "Keep current boundary", adjustBoundary: "Adjust boundary", verificationNotes: "Verification notes", verifySurvey: "Verify survey", cannotVerifyReason: "Reason the boundary cannot be verified", cannotVerify: "Cannot verify", reportRequired: "Choose a survey report first.", uploadError: "Unable to upload the report.", confirmVerification: "Confirm this field verification?", verificationError: "Unable to verify the survey.", reasonRequired: "A reason is required.", cannotVerifyError: "Unable to return the survey.", loadSurveyError: "Unable to load survey.", pendingApprovalsDescription: "Verified registrations awaiting legal approval.", noPendingApprovals: "No registrations are awaiting approval", owners: "Owners", surveyor: "Surveyor", loadApprovalsError: "Unable to load pending approvals.", registrationReview: "Registration review", surveyEvidence: "Survey evidence", approveRegistration: "Approve registration", approving: "Approving…", confirmApproval: "Approve this registration and create immutable ownership history?", approvalError: "Unable to approve registration.", loadParcelError: "Unable to load parcel.", correctParcel: "Correct parcel", correctParcelDescription: "Update the returned application and create a new survey attempt.", correctionError: "Unable to submit the correction.", saving: "Saving…", resubmitSurvey: "Resubmit for survey",
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
    pendingApprovals: "Ansixinnada sugaya", surveyQueue: "Safkaga sahanka", surveyQueueDescription: "Dib u eeg hawlaha sahanka iyo isku-dayadii hore.", allStatuses: "Dhammaan xaaladaha", noSurveys: "Sahan lama helin", parcelNumber: "Lambarka dhulka", created: "La abuuray", review: "Dib u eeg", loadSurveysError: "Sahannada lama soo rari karin.", survey: "Sahan", parcelDetails: "Faahfaahinta dhulka", openReport: "Fur warbixinta", missingReport: "Warbixinta goobta waa loo baahan yahay.", fieldVerification: "Xaqiijinta goobta", uploadReport: "Soo geli warbixin", keepBoundary: "Xadka hadda hay", adjustBoundary: "Hagaaji xadka", verificationNotes: "Qoraallada xaqiijinta", verifySurvey: "Xaqiiji sahanka", cannotVerifyReason: "Sababta xadka loo xaqiijin waayay", cannotVerify: "Lama xaqiijin karo", reportRequired: "Marka hore dooro warbixinta sahanka.", uploadError: "Warbixinta lama soo gelin karin.", confirmVerification: "Ma xaqiijinaysaa sahankan goobta?", verificationError: "Sahanka lama xaqiijin karin.", reasonRequired: "Sabab ayaa loo baahan yahay.", cannotVerifyError: "Sahanka dib looma celin karin.", loadSurveyError: "Sahanka lama soo rari karin.", pendingApprovalsDescription: "Diiwaangelin la sahmiyay oo sugaysa ansixin sharci.", noPendingApprovals: "Ma jiro ansixin sugaya", owners: "Milkiilayaasha", surveyor: "Sahmiye", loadApprovalsError: "Ansixinnada lama soo rari karin.", registrationReview: "Dib u eegista diiwaangelinta", surveyEvidence: "Caddeynta sahanka", approveRegistration: "Ansixi diiwaangelinta", approving: "Waa la ansixinayaa…", confirmApproval: "Ansixi oo samee taariikh lahaansho aan la beddeli karin?", approvalError: "Diiwaangelinta lama ansixin karin.", loadParcelError: "Dhulka lama soo rari karin.", correctParcel: "Sax dhulka", correctParcelDescription: "Sax codsiga oo samee sahan cusub.", correctionError: "Sixitaanka lama gudbin karin.", saving: "Waa la kaydinayaa…", resubmitSurvey: "Dib ugu gudbi sahan",
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
