/**
 * Sarthi (सारथी) | Single Page Application Core Controller
 * Plain vanilla JavaScript with centralized state, localStorage persistence,
 * 14-day tracking simulation, and bilingual support (EN / HI / MR).
 */

const DEFAULT_STATE = {
  currentScreen: 'login',
  language: 'en',
  user: { isLoggedIn: false, mobile: '', aadhaarLast4: '', name: 'Savitri Deshmukh', otpSent: false },
  selectedService: 'Income Certificate',
  documents: {
    aadhaar: { fullName: '', dob: '', gender: '', aadhaarLast4: '', isAdded: false },
    ration: { rationNo: '', familyMembers: '', isAdded: false },
    address: { addressLine: '', city: '', district: 'Nagpur', state: 'Maharashtra', pin: '', isAdded: false },
    income: { occupation: '', annualIncome: '', incomeSource: '', isAdded: false }
  },
  form: {
    applicantName: '', dob: '', gender: 'Female', fatherHusbandName: 'Ramesh Deshmukh',
    address: '', city: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', pin: '',
    mobile: '', aadhaarMasked: '', occupation: '', annualIncome: '', incomeSource: '',
    purpose: 'Scholarship', confirmed: false, hasAnimated: false
  },
  application: { submitted: false, id: '', submissionDate: '', currentDay: 1, isCompleted: false },
  activityLog: []
};

let state = null;
let trackingInterval = null;
let autofillTimer = null;
let isSubmitting = false;

// LocalStorage Persistence
function saveState() {
  try { localStorage.setItem('sarthi_state', JSON.stringify(state)); } catch (e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem('sarthi_state');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.user && parsed.documents && parsed.application) {
        state = Object.assign({}, JSON.parse(JSON.stringify(DEFAULT_STATE)), parsed);
        return;
      }
    }
  } catch (e) {}
  state = JSON.parse(JSON.stringify(DEFAULT_STATE));
}

// Translations
const translations = {
  en: {
    brandName: 'Sarthi', brandTagline: 'Government Services Portal',
    navDashboard: 'Dashboard', navSearch: 'Search Service', navDocuments: 'My Documents',
    navTrack: 'Track Application', navHelp: 'Help & Support', navLogout: 'Logout',
    stepLogin: 'Login', stepSearch: 'Search', stepDocuments: 'Documents',
    stepAutofill: 'Auto-fill', stepReview: 'Review', stepTrack: 'Track', stepCertificate: 'Certificate',
    loginDesc: 'Access government services with mobile and Aadhaar',
    labelMobile: 'Mobile Number (10 digits)', labelAadhaar: 'Aadhaar Last 4 Digits',
    btnSendOtp: 'Send OTP', labelEnterOtp: 'Enter 6-Digit OTP', btnLogin: 'Login to Sarthi',
    btnDemoLogin: 'Use demo login (Savitri Deshmukh)',
    searchDesc: 'Find revenue, welfare, and civic certificates available under the Citizen Services Guarantee Act.',
    catalogTitle: 'Available Services', catalogDesc: 'Select Income Certificate to proceed with the full auto-fill workflow.',
    docTitle: 'Income Certificate — Required Documents',
    docDesc: 'Fill the 4 required verification documents. Sarthi will auto-fill your application once all 4 are added.',
    btnSample: 'Use sample data (Savitri Deshmukh, Nagpur)', btnAutoFill: 'Auto-fill my form',
    consentText: 'I confirm these details are correct and I consent to submit this application for statutory income verification.',
    btnBack: 'Back to documents', btnProceed: 'Proceed to Summary',
    revTitle: 'Review Application Summary', revDesc: 'Please review all fields carefully. Once submitted, your application cannot be edited.',
    btnSubmit: 'Submit Application', btnTrack: 'Track my application (Day 1 of 14)',
    trackHead: '14-Day Application Tracking', trackDesc: 'Live monitoring of statutory verification stages under the Right to Public Services Act.',
    btnSkip: 'Skip to Day 14 (Instant Complete)', certReadyTitle: 'Your Income Certificate has been successfully generated.',
    btnViewCert: 'View & Download Certificate', btnPrint: 'Download / Print Certificate',
    btnCopy: 'Copy Application ID', btnAnother: 'Apply for another service',
    dashDesc: 'Your single window portal for Maharashtra time-bound public services and income certification.',
    btnContinue: 'Continue where I left off', footerNote: 'Demo with fake data. Sarthi never stores real documents.'
  },
  hi: {
    brandName: 'सारथी', brandTagline: 'सरकारी सेवा पोर्टल',
    navDashboard: 'डैशबोर्ड', navSearch: 'सेवा खोजें', navDocuments: 'मेरे दस्तावेज़',
    navTrack: 'आवेदन ट्रैक करें', navHelp: 'मदद और सहायता', navLogout: 'लॉगआउट',
    stepLogin: 'लॉगिन', stepSearch: 'खोजें', stepDocuments: 'दस्तावेज़',
    stepAutofill: 'ऑटो-फिल', stepReview: 'समीक्षा', stepTrack: 'ट्रैकिंग', stepCertificate: 'प्रमाणपत्र',
    loginDesc: 'मोबाइल और आधार से सरकारी सेवाओं का लाभ उठाएं',
    labelMobile: 'मोबाइल नंबर (10 अंक)', labelAadhaar: 'आधार के अंतिम 4 अंक',
    btnSendOtp: 'ओटीपी भेजें', labelEnterOtp: '6 अंकों का ओटीपी दर्ज करें', btnLogin: 'सारथी में लॉगिन करें',
    btnDemoLogin: 'डेमो लॉगिन उपयोग करें (सावित्री देशमुख)',
    searchDesc: 'लोकसेवा गारंटी कानून के तहत उपलब्ध राजस्व और प्रमाण पत्र खोजें।',
    catalogTitle: 'उपलब्ध सेवाएँ', catalogDesc: 'पूर्ण ऑटो-फिल प्रक्रिया के लिए आय प्रमाण पत्र चुनें।',
    docTitle: 'आय प्रमाण पत्र — आवश्यक दस्तावेज़',
    docDesc: 'चारों आवश्यक दस्तावेज़ विवरण भरें। चारों जुड़ने के बाद सारथी आपका फॉर्म स्वतः भर देगा।',
    btnSample: 'नमूना डेटा भरें (सावित्री देशमुख, नागपुर)', btnAutoFill: 'मेरा फॉर्म स्वतः भरें (Auto-fill)',
    consentText: 'मैं पुष्टि करती/करता हूँ कि सभी विवरण सही हैं और आय सत्यापन हेतु प्रस्तुत करने की सहमति देता/देती हूँ।',
    btnBack: 'दस्तावेज़ों पर वापस जाएं', btnProceed: 'सारांश की ओर बढ़ें',
    revTitle: 'आवेदन सारांश की समीक्षा करें', revDesc: 'कृपया सभी विवरण ध्यान से जांचें। सबमिट करने के बाद बदलाव नहीं किया जा सकेगा।',
    btnSubmit: 'आवेदन सबमिट करें', btnTrack: 'मेरा आवेदन ट्रैक करें (पहला दिन)',
    trackHead: '14-दिवसीय आवेदन ट्रैकिंग', trackDesc: 'लोकसेवा गारंटी कानून के तहत सत्यापन चरणों की लाइव निगरानी।',
    btnSkip: 'सीधे 14वें दिन पर जाएं (तुरंत पूर्ण)', certReadyTitle: 'आपका आय प्रमाण पत्र सफलतापूर्वक तैयार हो गया है।',
    btnViewCert: 'प्रमाणपत्र देखें और डाउनलोड करें', btnPrint: 'प्रमाणपत्र डाउनलोड / प्रिंट करें',
    btnCopy: 'आवेदन संख्या कॉपी करें', btnAnother: 'अन्य सेवा के लिए आवेदन करें',
    dashDesc: 'महाराष्ट्र की समयबद्ध लोक सेवाओं और आय प्रमाण पत्र का नागरिक पोर्टल।',
    btnContinue: 'जहाँ छोड़ा था वहीं से जारी रखें', footerNote: 'नकली डेमो डेटा। सारथी कभी भी वास्तविक दस्तावेज़ संग्रहीत नहीं करता है।'
  },
  mr: {
    brandName: 'सारथी', brandTagline: 'शासकीय सेवा पोर्टल',
    navDashboard: 'डॅशबोर्ड', navSearch: 'सेवा शोधा', navDocuments: 'माझी कागदपत्रे',
    navTrack: 'अर्ज ट्रॅक करा', navHelp: 'मदत व सहाय्य', navLogout: 'लॉगआउट',
    stepLogin: 'लॉगिन', stepSearch: 'शोधा', stepDocuments: 'कागदपत्रे',
    stepAutofill: 'ऑटो-फिल', stepReview: 'पुनरावलोकन', stepTrack: 'ट्रॅकिंग', stepCertificate: 'प्रमाणपत्र',
    loginDesc: 'मोबाईल आणि आधार क्रमांकाने सेवांमध्ये प्रवेश करा',
    labelMobile: 'मोबाईल क्रमांक (१० अंक)', labelAadhaar: 'आधारचे शेवटचे ४ अंक',
    btnSendOtp: 'ओटीपी पाठवा', labelEnterOtp: '६ अंकी ओटीपी टाका', btnLogin: 'सारथी पोर्टलवर लॉगिन करा',
    btnDemoLogin: 'डेमो लॉगिन वापरा (सावित्री देशमुख)',
    searchDesc: 'महाराष्ट्र लोकसेवा हक्क अधिनियमांतर्गत उपलब्ध महसूल सेवा शोधा.',
    catalogTitle: 'उपलब्ध सेवा', catalogDesc: 'ऑटो-फिल प्रक्रियेसाठी उत्पन्न प्रमाणपत्र निवडा.',
    docTitle: 'उत्पन्न प्रमाणपत्र — आवश्यक कागदपत्रे',
    docDesc: 'सर्व ४ आवश्यक कागदपत्रांची माहिती भरा. माहिती भरल्यानंतर सारथी तुमचा अर्ज आपोआप भरेल.',
    btnSample: 'नमुना माहिती वापरा (सावित्री देशमुख, नागपूर)', btnAutoFill: 'माझा अर्ज आपोआप भरा (Auto-fill)',
    consentText: 'मी खात्री करतो/करते की सर्व माहिती सत्य असून शासकीय पडताळणीसाठी अर्ज सादर करण्यास माझी संमती आहे.',
    btnBack: 'कागदपत्रांकडे परत जा', btnProceed: 'अर्जाचा सारांश पहा',
    revTitle: 'अर्जाच्या सारांशाचे पुनरावलोकन', revDesc: 'कृपया सर्व माहिती तपासा. अर्ज सादर केल्यानंतर त्यात बदल करता येणार नाही.',
    btnSubmit: 'अर्ज सादर करा', btnTrack: 'माझा अर्ज ट्रॅक करा (दिवस १)',
    trackHead: '१४ दिवसांची अर्ज ट्रॅकिंग प्रणाली', trackDesc: 'लोकसेवा हक्क अधिनियमांतर्गत शासकीय पडताळणी टप्प्यांची थेट स्थिती.',
    btnSkip: 'थेट १४ व्या दिवसावर जा (पूर्ण करा)', certReadyTitle: 'आपले उत्पन्न प्रमाणपत्र यशस्वीरित्या तयार झाले आहे.',
    btnViewCert: 'प्रमाणपत्र पहा व डाउनलोड करा', btnPrint: 'प्रमाणपत्र डाउनलोड / प्रिंट करा',
    btnCopy: 'अर्ज क्रमांक कॉपी करा', btnAnother: 'दुसऱ्या सेवेसाठी अर्ज करा',
    dashDesc: 'महाराष्ट्र लोकसेवा आणि उत्पन्न प्रमाणपत्रासाठी आपले नागरिक पोर्टल.',
    btnContinue: 'मागील टप्प्यापासून पुढे सुरू करा', footerNote: 'डेमो नमुना माहिती. सारथी पोर्टल कधीही खरी कागदपत्रे साठवत नाही.'
  }
};

function setLanguage(lang) {
  if (!translations[lang]) return;
  state.language = lang;
  saveState();
  document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.id === 'lang-' + lang));
  const t = translations[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key];
  });
  document.getElementById('sidebarTitle').textContent = t.brandName;
  document.getElementById('sidebarSubtitle').textContent = t.brandTagline;
  document.getElementById('astTitle').textContent = t.brandName + ' Assistant';
  document.getElementById('astBtn').textContent = t.brandName + ' Assistant';
  renderCurrentScreen();
}

// Activity Audit Log
function logActivity(text) {
  const timestamp = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  state.activityLog.unshift({ timestamp, text });
  if (state.activityLog.length > 50) state.activityLog.pop();
  saveState();
  renderActivityLog();
}

function renderActivityLog() {
  const box = document.getElementById('activityLogBox');
  if (!box) return;
  if (state.activityLog.length === 0) {
    box.innerHTML = `<div style="text-align:center; padding:16px; color:var(--muted);">No activity logged yet.</div>`;
    return;
  }
  box.innerHTML = state.activityLog.map(item => `
    <div class="log-item">
      <div class="log-dot"></div>
      <div>${escapeHtml(item.text)}</div>
      <div class="log-time">${escapeHtml(item.timestamp)}</div>
    </div>`).join('');
}

function downloadLog() {
  let content = `SARTHI CITIZEN SERVICES PORTAL - AUDIT LOG\nCitizen: ${state.user.name} | Application ID: ${state.application.id || 'N/A'}\nDate: ${new Date().toLocaleString()}\n\n`;
  state.activityLog.forEach(l => { content += `[${l.timestamp}] ${l.text}\n`; });
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'sarthi-activity-log.txt';
  a.click();
  showToast('Downloaded activity log!', 'success');
}

// Router & Screen Navigation
function navigate(screenName) {
  if (screenName !== 'login' && !state.user.isLoggedIn) {
    showToast('Please login first.', 'error');
    navigate('login');
    return;
  }
  if ((screenName === 'autofill' || screenName === 'review') && !areAllDocumentsAdded()) {
    showToast('Please add all 4 required documents before reviewing.', 'error');
    navigate('documents');
    return;
  }
  if ((screenName === 'track' || screenName === 'certificate') && !state.application.submitted) {
    showToast('Please submit your application first to view tracking.', 'info');
    navigate(areAllDocumentsAdded() ? 'review' : 'documents');
    return;
  }
  if (state.currentScreen === 'track' && screenName !== 'track') {
    if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null; }
  }

  state.currentScreen = screenName;
  saveState();
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
  renderCurrentScreen();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCurrentScreen() {
  const screens = ['login', 'search', 'documents', 'autofill', 'review', 'track', 'certificate', 'dashboard', 'help'];
  screens.forEach(s => {
    const el = document.getElementById('screen-' + s);
    if (el) el.classList.toggle('active', s === state.currentScreen);
  });

  document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
  const navMap = { dashboard: 'dashboard', search: 'search', documents: 'documents', autofill: 'documents', review: 'documents', track: 'track', certificate: 'track', help: 'help' };
  const activeNav = document.getElementById('nav-' + (navMap[state.currentScreen] || state.currentScreen));
  if (activeNav) activeNav.classList.add('active');

  updateStepperUI();

  const profileDisplay = document.getElementById('userNameDisplay');
  if (profileDisplay) profileDisplay.textContent = state.user.isLoggedIn ? (state.user.name || 'Savitri Deshmukh') : 'Citizen';

  switch (state.currentScreen) {
    case 'login': renderLogin(); break;
    case 'search': renderSearch(); break;
    case 'documents': renderDocuments(); break;
    case 'autofill': renderAutofill(); break;
    case 'review': renderReview(); break;
    case 'track': renderTrack(); break;
    case 'certificate': renderCertificate(); break;
    case 'dashboard': renderDashboard(); break;
    case 'help': break;
  }
  updateAssistantAdvice();
}

function updateStepperUI() {
  const stepMap = { login: 1, search: 2, documents: 3, autofill: 4, review: 5, track: 6, certificate: 7 };
  let currentNum = stepMap[state.currentScreen];
  if (!currentNum) {
    if (state.application.isCompleted) currentNum = 7;
    else if (state.application.submitted) currentNum = 6;
    else if (state.form.confirmed) currentNum = 5;
    else if (areAllDocumentsAdded()) currentNum = 4;
    else if (state.user.isLoggedIn) currentNum = 2;
    else currentNum = 1;
  }

  const stepKeys = ['login', 'search', 'documents', 'autofill', 'review', 'track', 'certificate'];
  stepKeys.forEach((key, index) => {
    const node = document.getElementById('step-node-' + key);
    if (!node) return;
    const order = index + 1;
    node.classList.remove('active', 'completed');
    const numEl = node.querySelector('.step-num');
    if (order < currentNum) {
      node.classList.add('completed');
      if (numEl) numEl.innerHTML = '✓';
    } else if (order === currentNum) {
      node.classList.add('active');
      if (numEl) numEl.textContent = order;
    } else {
      if (numEl) numEl.textContent = order;
    }
  });
}

function continueWhereLeftOff() {
  if (state.application.isCompleted) navigate('certificate');
  else if (state.application.submitted) navigate('track');
  else if (areAllDocumentsAdded()) navigate('autofill');
  else if (state.user.isLoggedIn) navigate('documents');
  else navigate('login');
}

// 1. LOGIN
function renderLogin() {
  setValue('loginMobile', state.user.mobile);
  setValue('loginAadhaar', state.user.aadhaarLast4);
  const otpSec = document.getElementById('otpSection');
  const btnSend = document.getElementById('btnSendOtp');
  if (state.user.otpSent) {
    otpSec.style.display = 'block';
    btnSend.textContent = 'Resend OTP';
  } else {
    otpSec.style.display = 'none';
    btnSend.textContent = (translations[state.language]?.btnSendOtp || 'Send OTP') + ' →';
  }
}

function handleSendOtp(e) {
  e.preventDefault();
  const mobile = document.getElementById('loginMobile').value.trim();
  const aadhaar = document.getElementById('loginAadhaar').value.trim();

  if (!validateMobile(mobile)) {
    showToast('Please enter a valid 10-digit Indian mobile number (starts with 6-9)', 'error');
    return;
  }
  if (!validateAadhaar(aadhaar)) {
    showToast('Please enter exactly 4 digits of Aadhaar', 'error');
    return;
  }

  state.user.mobile = mobile;
  state.user.aadhaarLast4 = aadhaar;
  state.user.otpSent = true;
  saveState();
  document.getElementById('otpSection').style.display = 'block';
  document.getElementById('loginOtp').value = '';
  document.getElementById('loginOtp').focus();
  logActivity(`OTP requested for +91-${mobile.slice(0, 2)}XXXXXX${mobile.slice(-2)}`);
  showToast('OTP sent! Demo OTP: 123456', 'success');
}

function handleLoginSubmit() {
  const otp = document.getElementById('loginOtp').value.trim();
  if (otp !== '123456') {
    showToast('Invalid OTP! Please enter 123456', 'error');
    return;
  }
  state.user.isLoggedIn = true;
  state.user.name = state.user.name || 'Savitri Deshmukh';
  saveState();
  logActivity(`Citizen logged in: ${state.user.name}`);
  showToast(`Welcome to Sarthi, ${state.user.name}!`, 'success');
  navigate('search');
}

function useDemoLogin() {
  setValue('loginMobile', '9876543210');
  setValue('loginAadhaar', '4321');
  state.user.mobile = '9876543210';
  state.user.aadhaarLast4 = '4321';
  state.user.name = 'Savitri Deshmukh';
  state.user.otpSent = true;
  document.getElementById('otpSection').style.display = 'block';
  setValue('loginOtp', '123456');
  showToast('Demo login prefilled! Click Login to proceed.', 'info');
}

// 2. SEARCH
const SERVICES_CATALOG = [
  { id: 'income', title: 'Income Certificate', desc: 'Official revenue document certifying family annual income from all legitimate sources.', icon: '📜', active: true },
  { id: 'caste', title: 'Caste Certificate', desc: 'Verification of constitutional category (SC/ST/VJNT/OBC/SEBC) through revenue scrutiny.', icon: '🪪', active: false },
  { id: 'domicile', title: 'Domicile Certificate', desc: 'Certificate of continuous 15-year residence within the State of Maharashtra.', icon: '🏛️', active: false },
  { id: 'birth', title: 'Birth Certificate', desc: 'Official registration record and vital statistics copy issued by local civic body.', icon: '👶', active: false },
  { id: 'ration', title: 'Ration Card', desc: 'Inclusion/deletion of family members and address modification on digital ration card.', icon: '🌾', active: false },
  { id: 'pension', title: 'Pension', desc: 'Re-activation of monthly pension disbursements under Sanjay Gandhi Niradhar Yojana.', icon: '🧓', active: false },
  { id: 'scholarship', title: 'Scholarship', desc: 'Post-matric state merit and freeship benefits for undergraduate college students.', icon: '🎓', active: false }
];

function renderSearch() {
  const q = (document.getElementById('serviceSearchInput')?.value || '').toLowerCase().trim();
  filterServices(q);
}

function syncSearch(query) {
  const searchInput = document.getElementById('serviceSearchInput');
  if (searchInput && searchInput.value !== query) searchInput.value = query;
  if (state.user.isLoggedIn && state.currentScreen !== 'search' && query.trim().length > 0) {
    navigate('search');
  }
  filterServices(query);
}

function filterServices(q) {
  const grid = document.getElementById('servicesGrid');
  const empty = document.getElementById('noServices');
  if (!grid) return;
  const filtered = SERVICES_CATALOG.filter(s => s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = filtered.map(s => {
    if (s.active) {
      return `
        <div class="service-card active-card" onclick="selectService('${s.title}')">
          <div>
            <div class="service-icon">${s.icon}</div>
            <div class="service-title">${escapeHtml(s.title)}</div>
            <div class="service-desc">${escapeHtml(s.desc)}</div>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="service-badge badge-active">● Active</span>
            <strong style="color:var(--blue); font-size:12px;">Apply Now →</strong>
          </div>
        </div>`;
    } else {
      return `
        <div class="service-card coming-soon" onclick="showToast('${escapeHtml(s.title)} is coming soon. Please apply for Income Certificate.', 'info')">
          <div>
            <div class="service-icon">${s.icon}</div>
            <div class="service-title">${escapeHtml(s.title)}</div>
            <div class="service-desc">${escapeHtml(s.desc)}</div>
          </div>
          <div><span class="service-badge badge-soon">Coming soon</span></div>
        </div>`;
    }
  }).join('');
}

function selectService(name) {
  state.selectedService = name;
  saveState();
  logActivity(`Selected service: ${name}`);
  showToast(`Selected ${name}. Please provide your 4 documents.`, 'info');
  navigate('documents');
}

// 3. DOCUMENTS CHECKLIST
function renderDocuments() {
  const d = state.documents;
  setValue('docName', d.aadhaar.fullName);
  setValue('docDob', d.aadhaar.dob);
  setValue('docGender', d.aadhaar.gender);
  setValue('docAadhaarLast4', d.aadhaar.aadhaarLast4);

  setValue('docRationNo', d.ration.rationNo);
  setValue('docMembers', d.ration.familyMembers);

  setValue('docAddress', d.address.addressLine);
  setValue('docCity', d.address.city);
  setValue('docDistrict', d.address.district || 'Nagpur');
  setValue('docState', d.address.state || 'Maharashtra');
  setValue('docPin', d.address.pin);

  setValue('docOccupation', d.income.occupation);
  setValue('docIncome', d.income.annualIncome);
  setValue('docSource', d.income.incomeSource);

  validateDocs();
}

function validateDocs() {
  const d = state.documents;
  // Aadhaar
  const name = (document.getElementById('docName')?.value || '').trim();
  const dob = (document.getElementById('docDob')?.value || '').trim();
  const gender = (document.getElementById('docGender')?.value || '').trim();
  const a4 = (document.getElementById('docAadhaarLast4')?.value || '').trim();
  d.aadhaar = { fullName: name, dob, gender, aadhaarLast4: a4, isAdded: validateName(name) && dob && gender && validateAadhaar(a4) };
  updateDocUI('aadhaar', d.aadhaar.isAdded);

  // Ration
  const rNo = (document.getElementById('docRationNo')?.value || '').trim();
  const members = parseInt(document.getElementById('docMembers')?.value, 10);
  d.ration = { rationNo: rNo, familyMembers: members ? members.toString() : '', isAdded: rNo.length >= 4 && members >= 1 };
  updateDocUI('ration', d.ration.isAdded);

  // Address
  const addr = (document.getElementById('docAddress')?.value || '').trim();
  const city = (document.getElementById('docCity')?.value || '').trim();
  const dist = (document.getElementById('docDistrict')?.value || '').trim();
  const st = (document.getElementById('docState')?.value || '').trim();
  const pin = (document.getElementById('docPin')?.value || '').trim();
  d.address = { addressLine: addr, city, district: dist, state: st, pin, isAdded: addr.length >= 5 && city && dist && st && validatePin(pin) };
  updateDocUI('address', d.address.isAdded);

  // Income
  const occ = (document.getElementById('docOccupation')?.value || '').trim();
  const inc = parseFloat(document.getElementById('docIncome')?.value);
  const src = (document.getElementById('docSource')?.value || '').trim();
  d.income = { occupation: occ, annualIncome: inc ? inc.toString() : '', incomeSource: src, isAdded: occ && inc > 0 && src };
  updateDocUI('income', d.income.isAdded);

  const count = countAddedDocuments();
  const notice = document.getElementById('docCountNotice');
  const btn = document.getElementById('btnAutoFill');
  const statDocs = document.getElementById('statDocs');
  if (notice) notice.innerHTML = count === 4 ? '<span class="green">✓ All 4 documents verified!</span>' : `${count} of 4 documents added (${4 - count} left)`;
  if (btn) btn.disabled = count !== 4;
  if (statDocs) statDocs.textContent = `${count} of 4`;
}

function updateDocUI(key, added) {
  const card = document.getElementById('doc-card-' + key);
  const badge = document.getElementById('badge-' + key);
  if (!card || !badge) return;
  card.classList.toggle('is-added', added);
  badge.className = 'status-badge ' + (added ? 'added' : 'pending');
  badge.textContent = added ? '✓ Added' : 'Pending';
}

function countAddedDocuments() {
  const d = state.documents;
  return (d.aadhaar.isAdded ? 1 : 0) + (d.ration.isAdded ? 1 : 0) + (d.address.isAdded ? 1 : 0) + (d.income.isAdded ? 1 : 0);
}
function areAllDocumentsAdded() { return countAddedDocuments() === 4; }

function useSampleData() {
  state.documents = {
    aadhaar: { fullName: 'Savitri Deshmukh', dob: '1988-06-15', gender: 'Female', aadhaarLast4: '4321', isAdded: true },
    ration: { rationNo: 'RC-MH-2024-89712', familyMembers: '4', isAdded: true },
    address: { addressLine: 'Plot 42, Anand Nagar, Wardha Road', city: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', pin: '440015', isAdded: true },
    income: { occupation: 'Agriculture & Small Dairy', annualIncome: '85000', incomeSource: 'Farming & Milk Production', isAdded: true }
  };
  state.user.name = 'Savitri Deshmukh';
  saveState();
  renderDocuments();
  logActivity('Loaded verified sample document data for Savitri Deshmukh (Nagpur)');
  showToast('Sample documents loaded for Savitri Deshmukh!', 'success');
}

// 4. AUTO-FILL
function startAutoFill() {
  if (!areAllDocumentsAdded()) return;
  const d = state.documents;
  state.form.applicantName = d.aadhaar.fullName;
  state.form.dob = d.aadhaar.dob;
  state.form.gender = d.aadhaar.gender;
  state.form.fatherHusbandName = state.form.fatherHusbandName || 'Ramesh Deshmukh';
  state.form.address = `${d.address.addressLine}, ${d.address.city}`;
  state.form.city = d.address.city;
  state.form.district = d.address.district;
  state.form.state = d.address.state;
  state.form.pin = d.address.pin;
  state.form.mobile = state.user.mobile || '9876543210';
  state.form.aadhaarMasked = `XXXX-XXXX-${d.aadhaar.aadhaarLast4 || '4321'}`;
  state.form.occupation = d.income.occupation;
  state.form.annualIncome = d.income.annualIncome;
  state.form.incomeSource = d.income.incomeSource;
  state.form.hasAnimated = false;
  saveState();

  logActivity('Initiated Sarthi auto-fill process for Form 1-A');
  navigate('autofill');
}

function renderAutofill() {
  const f = state.form;
  const consent = document.getElementById('consentCheck');
  const replay = document.getElementById('btnReplay');

  if (!f.hasAnimated) {
    ['fName', 'fDob', 'fGender', 'fRelation', 'fAddress', 'fDistrict', 'fState', 'fPin', 'fMobile', 'fAadhaar', 'fOccupation', 'fIncome', 'fPurpose'].forEach(id => setValue(id, ''));
    if (consent) { consent.checked = false; consent.disabled = true; }
    if (replay) replay.style.display = 'none';
    runAutoFillAnimation();
  } else {
    setValue('fName', f.applicantName); setValue('fDob', f.dob); setValue('fGender', f.gender);
    setValue('fRelation', f.fatherHusbandName); setValue('fAddress', f.address); setValue('fDistrict', f.district);
    setValue('fState', f.state); setValue('fPin', f.pin); setValue('fMobile', f.mobile);
    setValue('fAadhaar', f.aadhaarMasked); setValue('fOccupation', f.occupation); setValue('fIncome', f.annualIncome);
    setValue('fPurpose', f.purpose || 'Scholarship');

    if (consent) { consent.checked = f.confirmed || false; consent.disabled = false; }
    const title = document.getElementById('animTitle');
    const bar = document.getElementById('animBar');
    const pct = document.getElementById('animPct');
    if (title) title.innerHTML = '✓ Form Auto-filled Successfully! Recheck details, tick confirmation below and proceed.';
    if (bar) bar.style.width = '100%';
    if (pct) pct.textContent = '100%';
    if (replay) replay.style.display = 'inline-block';
    enableFormInputs(true);
    validateReviewForm();
  }
}

function runAutoFillAnimation() {
  const f = state.form;
  const fields = [
    { id: 'fName', val: f.applicantName || 'Savitri Deshmukh' },
    { id: 'fDob', val: f.dob || '1988-06-15' },
    { id: 'fGender', val: f.gender || 'Female' },
    { id: 'fRelation', val: f.fatherHusbandName || 'Ramesh Deshmukh' },
    { id: 'fAddress', val: f.address || 'Plot 42, Anand Nagar, Wardha Road, Nagpur' },
    { id: 'fDistrict', val: f.district || 'Nagpur' },
    { id: 'fState', val: f.state || 'Maharashtra' },
    { id: 'fPin', val: f.pin || '440015' },
    { id: 'fMobile', val: f.mobile || '9876543210' },
    { id: 'fAadhaar', val: f.aadhaarMasked || 'XXXX-XXXX-4321' },
    { id: 'fOccupation', val: f.occupation || 'Agriculture & Small Dairy' },
    { id: 'fIncome', val: f.annualIncome || '85000' },
    { id: 'fPurpose', val: f.purpose || 'Scholarship' }
  ];

  const bar = document.getElementById('animBar');
  const pct = document.getElementById('animPct');
  const title = document.getElementById('animTitle');
  const proceed = document.getElementById('btnProceedReview');
  const consent = document.getElementById('consentCheck');
  const replay = document.getElementById('btnReplay');

  if (proceed) proceed.disabled = true;
  if (consent) consent.disabled = true;
  if (bar) bar.style.width = '0%';
  if (pct) pct.textContent = '0%';
  if (title) title.innerHTML = '⚡ Sarthi is filling your form from verified documents...';
  if (replay) replay.style.display = 'none';

  enableFormInputs(false);
  let step = 0;
  if (autofillTimer) clearInterval(autofillTimer);

  autofillTimer = setInterval(() => {
    if (step < fields.length) {
      const item = fields[step];
      setValue(item.id, item.val);
      const el = document.getElementById(item.id);
      if (el) {
        el.classList.add('field-highlight');
        setTimeout(() => el.classList.remove('field-highlight'), 350);
      }
      step++;
      const p = Math.round((step / fields.length) * 100);
      if (bar) bar.style.width = p + '%';
      if (pct) pct.textContent = p + '%';
    } else {
      clearInterval(autofillTimer);
      autofillTimer = null;
      state.form.hasAnimated = true;
      saveState();
      if (title) title.innerHTML = '✓ Form Auto-filled Successfully! Recheck details, tick confirmation below and proceed.';
      if (replay) replay.style.display = 'inline-block';
      if (consent) consent.disabled = false;
      enableFormInputs(true);
      validateReviewForm();
      showToast('All fields auto-filled! Please recheck and confirm.', 'success');
      logActivity('Sarthi auto-populated Form 1-A (100%)');
    }
  }, 200);
}

function replayAutoFill() {
  state.form.hasAnimated = false;
  saveState();
  renderAutofill();
}

function enableFormInputs(enabled) {
  const form = document.getElementById('formAutoFilled');
  if (!form) return;
  form.querySelectorAll('input, select').forEach(inp => {
    if (inp.id !== 'fAadhaar') {
      inp.readOnly = !enabled;
      if (inp.tagName === 'SELECT') inp.disabled = !enabled;
    }
  });
}

function validateReviewForm() {
  const relation = (document.getElementById('fRelation')?.value || '').trim();
  const consent = document.getElementById('consentCheck')?.checked || false;
  const btn = document.getElementById('btnProceedReview');
  state.form.fatherHusbandName = relation;
  state.form.confirmed = consent;
  if (btn) btn.disabled = !(validateName(relation) && consent);
}

function saveFormAndProceed() {
  const f = state.form;
  f.applicantName = document.getElementById('fName').value.trim();
  f.dob = document.getElementById('fDob').value.trim();
  f.gender = document.getElementById('fGender').value.trim();
  f.fatherHusbandName = document.getElementById('fRelation').value.trim();
  f.address = document.getElementById('fAddress').value.trim();
  f.district = document.getElementById('fDistrict').value.trim();
  f.state = document.getElementById('fState').value.trim();
  f.pin = document.getElementById('fPin').value.trim();
  f.mobile = document.getElementById('fMobile').value.trim();
  f.occupation = document.getElementById('fOccupation').value.trim();
  f.annualIncome = document.getElementById('fIncome').value.trim();
  f.purpose = document.getElementById('fPurpose').value.trim();
  f.confirmed = document.getElementById('consentCheck').checked;
  saveState();
  logActivity('Citizen reviewed and confirmed Form 1-A details');
  navigate('review');
}

// 5. REVIEW SUMMARY
function renderReview() {
  const pending = document.getElementById('reviewPending');
  const success = document.getElementById('reviewSuccess');
  if (state.application.submitted) {
    pending.style.display = 'none';
    success.style.display = 'block';
    document.getElementById('postAppId').textContent = state.application.id;
    document.getElementById('postDate').textContent = 'Submitted on: ' + (state.application.submissionDate || 'Today');
  } else {
    pending.style.display = 'block';
    success.style.display = 'none';
    const f = state.form;
    setText('revName', f.applicantName); setText('revRelation', f.fatherHusbandName);
    setText('revDob', f.dob); setText('revGender', f.gender);
    setText('revAadhaar', f.aadhaarMasked || 'XXXX-XXXX-4321'); setText('revMobile', f.mobile);
    setText('revAddress', f.address); setText('revDistrict', f.district);
    setText('revStatePin', `${f.state} - ${f.pin}`);
    setText('revOccupation', f.occupation);
    setText('revIncome', `₹${formatNumber(f.annualIncome)} (${numberToWordsRupees(f.annualIncome)})`);
    setText('revSource', f.incomeSource || state.documents.income.incomeSource);
    setText('revMembers', state.documents.ration.familyMembers || '4');
    setText('revRation', state.documents.ration.rationNo || 'RC-MH-2024-89712');
    setText('revPurpose', f.purpose || 'Scholarship');
  }
}

function openSubmitModal() { document.getElementById('modalSubmit').classList.add('open'); }
function closeSubmitModal() { document.getElementById('modalSubmit').classList.remove('open'); }

function confirmSubmission() {
  if (isSubmitting || state.application.submitted) return;
  isSubmitting = true;
  closeSubmitModal();

  const random6 = Math.floor(100000 + Math.random() * 900000);
  const appId = `IC-2026-${random6}`;
  const submissionDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  state.application.submitted = true;
  state.application.id = appId;
  state.application.submissionDate = submissionDate;
  state.application.currentDay = 1;
  state.application.isCompleted = false;
  saveState();

  logActivity(`Application submitted! Generated ID: ${appId}`);
  showToast(`Application ${appId} submitted successfully!`, 'success');
  isSubmitting = false;
  renderReview();
}

// 6. 14-DAY TRACKING
const TIMELINE_STAGES = [
  { day: 1, title: 'Application received', desc: 'Application registered in Tehsil portal and acknowledgment generated.' },
  { day: 2, title: 'Documents verified', desc: 'Desk verification of Aadhaar, Ration Card and Address completed.' },
  { day: 3, dayRange: 'Day 3-4', title: 'Sent to Talathi for field check', desc: 'Local verification officer (Talathi) assigned for spot inquiry.' },
  { day: 5, dayRange: 'Day 5-6', title: 'Field report received', desc: 'Talathi submitted physical inquiry report and panchnama.' },
  { day: 7, title: 'Sent to Tehsildar', desc: 'Case file forwarded to the Sub-Divisional Magistrate / Tehsildar office.' },
  { day: 8, dayRange: 'Day 8-10', title: 'Under review by Tehsildar', desc: 'Scrutiny of land records, tax history, and annual income.' },
  { day: 11, title: 'Approved', desc: 'Application officially approved by Executive Magistrate / Tehsildar.' },
  { day: 12, title: 'Certificate being generated', desc: 'Drafting digital certificate record in state registry.' },
  { day: 13, title: 'Digitally signed', desc: 'Cryptographic signature and digital timestamp applied.' },
  { day: 14, title: 'Certificate ready', desc: 'Income Certificate issued, downloadable with official QR verification.' }
];

function renderTrack() {
  const currentDay = state.application.currentDay || 1;
  const appId = state.application.id || 'IC-2026-749201';

  document.getElementById('trackAppId').textContent = appId;
  document.getElementById('trackDayBadge').textContent = `Day ${currentDay} of 14`;
  const pct = Math.min(100, Math.round((currentDay / 14) * 100));
  document.getElementById('trackBar').style.width = pct + '%';

  const container = document.getElementById('timelineContainer');
  if (container) {
    container.innerHTML = TIMELINE_STAGES.map(stage => {
      let statusClass = 'upcoming';
      let icon = stage.day;
      if (currentDay > stage.day) {
        statusClass = 'done'; icon = '✓';
      } else if (currentDay >= stage.day && (stage.dayRange ? currentDay <= getStageEndDay(stage) : currentDay === stage.day)) {
        statusClass = 'current'; icon = '⏰';
      }
      const dayLabel = stage.dayRange || `Day ${stage.day}`;
      return `
        <div class="timeline-item ${statusClass}">
          <div class="timeline-bullet">${icon}</div>
          <div class="timeline-content">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong>${escapeHtml(stage.title)}</strong>
              <small class="font-bold ${statusClass === 'done' ? 'green' : (statusClass === 'current' ? 'font-bold' : 'muted')}">${dayLabel}</small>
            </div>
            <p class="muted" style="margin-top:2px;">${escapeHtml(stage.desc)}</p>
          </div>
        </div>`;
    }).join('');
  }

  const stageObj = getStageForDay(currentDay);
  document.getElementById('trackStageHeading').textContent = stageObj ? stageObj.title : 'Under Process';

  const readyBox = document.getElementById('certReadyBox');
  if (currentDay >= 14) {
    readyBox.style.display = 'block';
    state.application.isCompleted = true;
    saveState();
  } else {
    readyBox.style.display = 'none';
  }
  startTrackingTimer();
}

function getStageEndDay(s) {
  if (s.day === 3) return 4;
  if (s.day === 5) return 6;
  if (s.day === 8) return 10;
  return s.day;
}

function getStageForDay(day) {
  for (let i = TIMELINE_STAGES.length - 1; i >= 0; i--) {
    if (day >= TIMELINE_STAGES[i].day) return TIMELINE_STAGES[i];
  }
  return TIMELINE_STAGES[0];
}

function startTrackingTimer() {
  if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null; }
  if (state.application.currentDay >= 14) return;

  trackingInterval = setInterval(() => {
    if (state.application.currentDay < 14) {
      state.application.currentDay++;
      saveState();
      renderTrack();
      if (state.application.currentDay >= 14) {
        clearInterval(trackingInterval);
        trackingInterval = null;
        state.application.isCompleted = true;
        saveState();
        showToast('🎉 Day 14: Your Income Certificate is ready!', 'success');
      }
    } else {
      clearInterval(trackingInterval);
      trackingInterval = null;
    }
  }, 4000);
}

function skipToDay14() {
  if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null; }
  state.application.currentDay = 14;
  state.application.isCompleted = true;
  saveState();
  logActivity('Skipped timeline to Day 14');
  showToast('Jumped to Day 14: Certificate ready!', 'success');
  renderTrack();
}

// 7. CERTIFICATE
function renderCertificate() {
  const f = state.form;
  const appId = state.application.id || 'IC-2026-749201';
  const issueDate = state.application.submissionDate || 'Today';

  setText('cNum', appId); setText('cDate', issueDate);
  setText('cName', f.applicantName || 'Savitri Deshmukh');
  setText('cRelation', f.fatherHusbandName || 'Ramesh Deshmukh');
  setText('cAddress', `${f.address || 'Plot 42, Anand Nagar, Wardha Road'}, ${f.city || 'Nagpur'}, ${f.district || 'Nagpur'}, ${f.state || 'Maharashtra'} - ${f.pin || '440015'}`);

  const inc = f.annualIncome || '85000';
  setText('cIncomeNum', 'Rs. ' + formatNumber(inc));
  setText('cIncomeWords', 'Rupees ' + numberToWordsRupees(inc));
  setText('cSource', f.incomeSource || state.documents.income.incomeSource || 'Agriculture & Small Dairy');
  setText('cPurpose', f.purpose || 'Scholarship');
  setText('ctName', f.applicantName || 'Savitri Deshmukh');
  setText('ctOcc', f.occupation || 'Agriculture & Dairy');
  setText('ctIncome', '₹' + formatNumber(inc));
  setText('cSignDate', `Verified on: ${issueDate}`);
}

function printCert() {
  logActivity('Printed / saved Income Certificate');
  window.print();
}

function copyId() {
  const id = state.application.id || 'IC-2026-749201';
  navigator.clipboard.writeText(id).then(() => {
    showToast(`Copied Application ID: ${id}!`, 'success');
  }).catch(() => { showToast(`Application ID: ${id}`, 'info'); });
}

function openResetModal() { document.getElementById('modalReset').classList.add('open'); }
function closeResetModal() { document.getElementById('modalReset').classList.remove('open'); }

function confirmReset() {
  closeResetModal();
  state.application = { submitted: false, id: '', submissionDate: '', currentDay: 1, isCompleted: false };
  state.form.hasAnimated = false;
  state.form.confirmed = false;
  saveState();
  logActivity('Reset application to apply for another service');
  showToast('Ready to apply for another service.', 'info');
  navigate('search');
}

// 8. DASHBOARD
function renderDashboard() {
  const welcome = document.getElementById('dashWelcome');
  if (welcome) {
    const brand = translations[state.language].brandName;
    welcome.innerHTML = `Welcome to <span>${brand}</span>, ${escapeHtml(state.user.name || 'Citizen')}!`;
  }
  setText('statActive', state.application.submitted ? '1' : '0');
  let stageText = 'Search Service';
  if (state.application.isCompleted) stageText = 'Certificate Ready ✓';
  else if (state.application.submitted) stageText = `Day ${state.application.currentDay} of 14`;
  else if (areAllDocumentsAdded()) stageText = 'Ready for Review';
  else if (countAddedDocuments() > 0) stageText = `Documents (${countAddedDocuments()}/4)`;
  setText('statStage', stageText);
  setText('statDocs', `${countAddedDocuments()} of 4`);
  renderActivityLog();
}

function toggleFaq(el) { el.parentElement.classList.toggle('open'); }

// LOGOUT
function openLogoutModal() { document.getElementById('modalLogout').classList.add('open'); }
function closeLogoutModal() { document.getElementById('modalLogout').classList.remove('open'); }

function confirmLogout() {
  closeLogoutModal();
  if (trackingInterval) { clearInterval(trackingInterval); trackingInterval = null; }
  if (autofillTimer) { clearInterval(autofillTimer); autofillTimer = null; }
  try { localStorage.removeItem('sarthi_state'); } catch (e) {}
  state = JSON.parse(JSON.stringify(DEFAULT_STATE));
  saveState();
  showToast('Logged out successfully.', 'info');
  navigate('login');
}

// ASSISTANT & TOASTS
const ASSISTANT_HINTS = {
  login: '💡 Tip: Click "Use demo login" to test with verified credentials. Demo OTP is 123456.',
  search: '💡 Tip: Click on "Income Certificate" (active card). Other services show "Coming soon".',
  documents: '💡 Tip: Click "Use sample data" to quickly fill all 4 verification documents.',
  autofill: '💡 Tip: Watch Sarthi auto-fill! Verify details, tick the confirmation box, and proceed.',
  review: '💡 Tip: Review all details. Click "Submit Application" to register your Application ID.',
  track: '💡 Tip: Timeline advances 1 day every 4 seconds. Click "Skip to Day 14" to complete instantly!',
  certificate: '💡 Tip: Certificate is digitally signed! Click "Download / Print" to save as PDF.',
  dashboard: '💡 Tip: Click "Continue where I left off" to jump back to your active step.',
  help: '💡 Tip: Income Certificates in Maharashtra are guaranteed within 14 working days under the RTS Act.'
};

function updateAssistantAdvice() {
  const body = document.getElementById('assistantBody');
  if (body) body.textContent = ASSISTANT_HINTS[state.currentScreen] || 'Welcome to Sarthi!';
}
function toggleAssistant() { document.getElementById('assistantPanel').classList.toggle('open'); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function showToast(message, type = 'info') {
  const box = document.getElementById('toastBox');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'error' ? 'toast-error' : (type === 'success' ? 'toast-success' : ''));
  t.innerHTML = `<span>${type === 'error' ? '❌' : (type === 'success' ? '✅' : 'ℹ️')}</span> <span>${escapeHtml(message)}</span>`;
  box.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(8px)';
    t.style.transition = 'all 0.25s';
    setTimeout(() => t.remove(), 250);
  }, 3200);
}

// HELPERS
function validateMobile(m) { return /^[6-9]\d{9}$/.test(m); }
function validateAadhaar(a) { return /^\d{4}$/.test(a); }
function validatePin(p) { return /^\d{6}$/.test(p); }
function validateName(n) { return /^[a-zA-Z\s]{3,60}$/.test(n); }
function formatNumber(n) { const num = parseInt(n, 10); return isNaN(num) ? n : num.toLocaleString('en-IN'); }
function setValue(id, val) { const el = document.getElementById(id); if (el) el.value = val || ''; }
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val || '-'; }

function numberToWordsRupees(num) {
  const n = parseInt(num, 10);
  if (isNaN(n) || n === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function convert(val) {
    let s = '';
    if (val >= 100) { s += ones[Math.floor(val / 100)] + ' Hundred '; val %= 100; }
    if (val >= 20) { s += tens[Math.floor(val / 10)] + (val % 10 ? ' ' + ones[val % 10] : ''); }
    else if (val > 0) { s += ones[val]; }
    return s.trim();
  }
  let crore = Math.floor(n / 10000000), lakh = Math.floor((n % 10000000) / 100000), thousand = Math.floor((n % 100000) / 1000), rem = n % 1000;
  let res = '';
  if (crore) res += convert(crore) + ' Crore ';
  if (lakh) res += convert(lakh) + ' Lakh ';
  if (thousand) res += convert(thousand) + ' Thousand ';
  if (rem) res += convert(rem);
  return (res.trim() + ' Rupees Only').replace(/\s+/g, ' ');
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// INIT
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  if (!state.user.isLoggedIn) state.currentScreen = 'login';
  setLanguage(state.language || 'en');
  navigate(state.currentScreen || 'login');
  renderSearch();
});

window.addEventListener('beforeunload', () => {
  if (trackingInterval) clearInterval(trackingInterval);
  if (autofillTimer) clearInterval(autofillTimer);
});