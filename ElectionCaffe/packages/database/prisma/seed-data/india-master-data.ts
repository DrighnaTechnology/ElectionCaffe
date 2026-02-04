// Comprehensive India Master Data for ElectionCaffe
// Complete data for all 28 states and 8 union territories

export const INDIAN_STATES = [
  { name: 'Andhra Pradesh', code: 'AP', capital: 'Amaravati', assemblySeats: 175, parliamentSeats: 25 },
  { name: 'Arunachal Pradesh', code: 'AR', capital: 'Itanagar', assemblySeats: 60, parliamentSeats: 2 },
  { name: 'Assam', code: 'AS', capital: 'Dispur', assemblySeats: 126, parliamentSeats: 14 },
  { name: 'Bihar', code: 'BR', capital: 'Patna', assemblySeats: 243, parliamentSeats: 40 },
  { name: 'Chhattisgarh', code: 'CG', capital: 'Raipur', assemblySeats: 90, parliamentSeats: 11 },
  { name: 'Goa', code: 'GA', capital: 'Panaji', assemblySeats: 40, parliamentSeats: 2 },
  { name: 'Gujarat', code: 'GJ', capital: 'Gandhinagar', assemblySeats: 182, parliamentSeats: 26 },
  { name: 'Haryana', code: 'HR', capital: 'Chandigarh', assemblySeats: 90, parliamentSeats: 10 },
  { name: 'Himachal Pradesh', code: 'HP', capital: 'Shimla', assemblySeats: 68, parliamentSeats: 4 },
  { name: 'Jharkhand', code: 'JH', capital: 'Ranchi', assemblySeats: 81, parliamentSeats: 14 },
  { name: 'Karnataka', code: 'KA', capital: 'Bengaluru', assemblySeats: 224, parliamentSeats: 28 },
  { name: 'Kerala', code: 'KL', capital: 'Thiruvananthapuram', assemblySeats: 140, parliamentSeats: 20 },
  { name: 'Madhya Pradesh', code: 'MP', capital: 'Bhopal', assemblySeats: 230, parliamentSeats: 29 },
  { name: 'Maharashtra', code: 'MH', capital: 'Mumbai', assemblySeats: 288, parliamentSeats: 48 },
  { name: 'Manipur', code: 'MN', capital: 'Imphal', assemblySeats: 60, parliamentSeats: 2 },
  { name: 'Meghalaya', code: 'ML', capital: 'Shillong', assemblySeats: 60, parliamentSeats: 2 },
  { name: 'Mizoram', code: 'MZ', capital: 'Aizawl', assemblySeats: 40, parliamentSeats: 1 },
  { name: 'Nagaland', code: 'NL', capital: 'Kohima', assemblySeats: 60, parliamentSeats: 1 },
  { name: 'Odisha', code: 'OR', capital: 'Bhubaneswar', assemblySeats: 147, parliamentSeats: 21 },
  { name: 'Punjab', code: 'PB', capital: 'Chandigarh', assemblySeats: 117, parliamentSeats: 13 },
  { name: 'Rajasthan', code: 'RJ', capital: 'Jaipur', assemblySeats: 200, parliamentSeats: 25 },
  { name: 'Sikkim', code: 'SK', capital: 'Gangtok', assemblySeats: 32, parliamentSeats: 1 },
  { name: 'Tamil Nadu', code: 'TN', capital: 'Chennai', assemblySeats: 234, parliamentSeats: 39 },
  { name: 'Telangana', code: 'TS', capital: 'Hyderabad', assemblySeats: 119, parliamentSeats: 17 },
  { name: 'Tripura', code: 'TR', capital: 'Agartala', assemblySeats: 60, parliamentSeats: 2 },
  { name: 'Uttar Pradesh', code: 'UP', capital: 'Lucknow', assemblySeats: 403, parliamentSeats: 80 },
  { name: 'Uttarakhand', code: 'UK', capital: 'Dehradun', assemblySeats: 70, parliamentSeats: 5 },
  { name: 'West Bengal', code: 'WB', capital: 'Kolkata', assemblySeats: 294, parliamentSeats: 42 },
];

export const UNION_TERRITORIES = [
  { name: 'Andaman and Nicobar Islands', code: 'AN', capital: 'Port Blair', assemblySeats: 0, parliamentSeats: 1 },
  { name: 'Chandigarh', code: 'CH', capital: 'Chandigarh', assemblySeats: 0, parliamentSeats: 1 },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DD', capital: 'Daman', assemblySeats: 0, parliamentSeats: 2 },
  { name: 'Delhi', code: 'DL', capital: 'New Delhi', assemblySeats: 70, parliamentSeats: 7 },
  { name: 'Jammu and Kashmir', code: 'JK', capital: 'Srinagar', assemblySeats: 90, parliamentSeats: 5 },
  { name: 'Ladakh', code: 'LA', capital: 'Leh', assemblySeats: 0, parliamentSeats: 1 },
  { name: 'Lakshadweep', code: 'LD', capital: 'Kavaratti', assemblySeats: 0, parliamentSeats: 1 },
  { name: 'Puducherry', code: 'PY', capital: 'Puducherry', assemblySeats: 30, parliamentSeats: 1 },
];

// All religions in India
export const RELIGIONS = [
  { name: 'Hindu', nameLocal: 'हिन्दू', color: '#FF9933', percentage: 79.8 },
  { name: 'Muslim', nameLocal: 'मुस्लिम', color: '#006400', percentage: 14.2 },
  { name: 'Christian', nameLocal: 'ईसाई', color: '#800080', percentage: 2.3 },
  { name: 'Sikh', nameLocal: 'सिख', color: '#FF6600', percentage: 1.7 },
  { name: 'Buddhist', nameLocal: 'बौद्ध', color: '#FFD700', percentage: 0.7 },
  { name: 'Jain', nameLocal: 'जैन', color: '#FFFFFF', percentage: 0.4 },
  { name: 'Zoroastrian', nameLocal: 'पारसी', color: '#00BFFF', percentage: 0.01 },
  { name: 'Jewish', nameLocal: 'यहूदी', color: '#0000FF', percentage: 0.01 },
  { name: 'Tribal/Animist', nameLocal: 'आदिवासी', color: '#228B22', percentage: 0.9 },
];

// Caste Categories (All India)
export const CASTE_CATEGORIES = [
  { name: 'GEN', fullName: 'General/Unreserved', reservationPercent: 0 },
  { name: 'OBC', fullName: 'Other Backward Classes', reservationPercent: 27 },
  { name: 'SC', fullName: 'Scheduled Castes', reservationPercent: 15 },
  { name: 'ST', fullName: 'Scheduled Tribes', reservationPercent: 7.5 },
  { name: 'EWS', fullName: 'Economically Weaker Sections', reservationPercent: 10 },
];

// State-wise Caste Categories with variations
export const STATE_CASTE_CATEGORIES: Record<string, Array<{ name: string; fullName: string; reservationPercent?: number }>> = {
  'Tamil Nadu': [
    { name: 'OC', fullName: 'Other Caste (Forward/General)' },
    { name: 'BC', fullName: 'Backward Class', reservationPercent: 26.5 },
    { name: 'BCM', fullName: 'Backward Class Muslim', reservationPercent: 3.5 },
    { name: 'MBC', fullName: 'Most Backward Class', reservationPercent: 20 },
    { name: 'DNC', fullName: 'Denotified Communities', reservationPercent: 0 },
    { name: 'SC', fullName: 'Scheduled Caste', reservationPercent: 18 },
    { name: 'SCA', fullName: 'Scheduled Caste Arunthathiyar', reservationPercent: 3 },
    { name: 'ST', fullName: 'Scheduled Tribe', reservationPercent: 1 },
  ],
  'Karnataka': [
    { name: 'GM', fullName: 'General Merit' },
    { name: 'Cat-1', fullName: 'Category 1', reservationPercent: 4 },
    { name: 'Cat-2A', fullName: 'Category 2A', reservationPercent: 15 },
    { name: 'Cat-2B', fullName: 'Category 2B', reservationPercent: 4 },
    { name: 'Cat-3A', fullName: 'Category 3A', reservationPercent: 4 },
    { name: 'Cat-3B', fullName: 'Category 3B', reservationPercent: 5 },
    { name: 'SC', fullName: 'Scheduled Caste', reservationPercent: 15 },
    { name: 'ST', fullName: 'Scheduled Tribe', reservationPercent: 3 },
  ],
  'Andhra Pradesh': [
    { name: 'OC', fullName: 'Open Category' },
    { name: 'BC-A', fullName: 'Backward Class A', reservationPercent: 7 },
    { name: 'BC-B', fullName: 'Backward Class B', reservationPercent: 10 },
    { name: 'BC-C', fullName: 'Backward Class C', reservationPercent: 1 },
    { name: 'BC-D', fullName: 'Backward Class D', reservationPercent: 7 },
    { name: 'BC-E', fullName: 'Backward Class E', reservationPercent: 4 },
    { name: 'SC', fullName: 'Scheduled Caste', reservationPercent: 15 },
    { name: 'ST', fullName: 'Scheduled Tribe', reservationPercent: 6 },
    { name: 'EWS', fullName: 'Economically Weaker Sections', reservationPercent: 10 },
  ],
  'Maharashtra': [
    { name: 'Open', fullName: 'Open Category' },
    { name: 'OBC', fullName: 'Other Backward Class', reservationPercent: 19 },
    { name: 'SBC', fullName: 'Special Backward Class', reservationPercent: 2 },
    { name: 'VJNT', fullName: 'Vimukta Jatis and Nomadic Tribes', reservationPercent: 11 },
    { name: 'NT-B', fullName: 'Nomadic Tribes B', reservationPercent: 2.5 },
    { name: 'NT-C', fullName: 'Nomadic Tribes C', reservationPercent: 3.5 },
    { name: 'NT-D', fullName: 'Nomadic Tribes D', reservationPercent: 2 },
    { name: 'SC', fullName: 'Scheduled Caste', reservationPercent: 13 },
    { name: 'ST', fullName: 'Scheduled Tribe', reservationPercent: 7 },
    { name: 'EWS', fullName: 'Economically Weaker Sections', reservationPercent: 10 },
  ],
  'Gujarat': [
    { name: 'General', fullName: 'General Category' },
    { name: 'SEBC', fullName: 'Socially and Educationally Backward Classes', reservationPercent: 27 },
    { name: 'SC', fullName: 'Scheduled Caste', reservationPercent: 7 },
    { name: 'ST', fullName: 'Scheduled Tribe', reservationPercent: 15 },
    { name: 'EWS', fullName: 'Economically Weaker Sections', reservationPercent: 10 },
  ],
  'Uttar Pradesh': [
    { name: 'General', fullName: 'General/Unreserved' },
    { name: 'OBC', fullName: 'Other Backward Classes', reservationPercent: 27 },
    { name: 'SC', fullName: 'Scheduled Caste', reservationPercent: 21 },
    { name: 'ST', fullName: 'Scheduled Tribe', reservationPercent: 2 },
    { name: 'EWS', fullName: 'Economically Weaker Sections', reservationPercent: 10 },
  ],
};

// Major Castes by State
export const STATE_CASTES: Record<string, Array<{ name: string; nameLocal: string; category: string; subCastes?: string[] }>> = {
  'Tamil Nadu': [
    { name: 'Vanniyar', nameLocal: 'வன்னியர்', category: 'MBC', subCastes: ['Vanniya Kula Kshatriya', 'Padayachi', 'Palli'] },
    { name: 'Mukkulathor', nameLocal: 'முக்குலத்தோர்', category: 'BC', subCastes: ['Kallar', 'Maravar', 'Agamudaiyar'] },
    { name: 'Kongu Vellalar', nameLocal: 'கொங்கு வேளாளர்', category: 'BC', subCastes: ['Gounder', 'Vellala Gounder'] },
    { name: 'Nadar', nameLocal: 'நாடார்', category: 'BC', subCastes: ['Shanar', 'Nadaan'] },
    { name: 'Thevar', nameLocal: 'தேவர்', category: 'BC', subCastes: ['Kallar', 'Maravar', 'Agamudaiyar', 'Appathandar'] },
    { name: 'Mudaliar', nameLocal: 'முதலியார்', category: 'OC', subCastes: ['Saiva Mudaliar', 'Senguntha Mudaliar', 'Kaikolar'] },
    { name: 'Chettiar', nameLocal: 'செட்டியார்', category: 'OC', subCastes: ['Nattukottai Chettiar', 'Devanga Chettiar', 'Komati Chettiar'] },
    { name: 'Pillai', nameLocal: 'பிள்ளை', category: 'OC', subCastes: ['Saiva Pillai', 'Vellala Pillai'] },
    { name: 'Paraiyar', nameLocal: 'பறையர்', category: 'SC', subCastes: ['Samban', 'Parayan'] },
    { name: 'Arunthathiyar', nameLocal: 'அருந்ததியர்', category: 'SCA', subCastes: ['Madari', 'Chakkiliyan'] },
    { name: 'Pallar', nameLocal: 'பள்ளர்', category: 'SC', subCastes: ['Devendra Kula Vellalar', 'Kudumban'] },
    { name: 'Yadava', nameLocal: 'யாதவர்', category: 'BC', subCastes: ['Konar', 'Idaiyar'] },
    { name: 'Vishwakarma', nameLocal: 'விஸ்வகர்மா', category: 'BC', subCastes: ['Kammalar', 'Panchaalar'] },
    { name: 'Reddiar', nameLocal: 'ரெட்டியார்', category: 'BC' },
    { name: 'Nair', nameLocal: 'நாயர்', category: 'OC' },
    { name: 'Brahmin', nameLocal: 'பிராமணர்', category: 'OC', subCastes: ['Iyer', 'Iyengar', 'Smartha', 'Vaishnavite'] },
  ],
  'Karnataka': [
    { name: 'Vokkaligar', nameLocal: 'ಒಕ್ಕಲಿಗ', category: 'Cat-3A', subCastes: ['Morasu', 'Gangadikara', 'Hallikara'] },
    { name: 'Lingayat', nameLocal: 'ಲಿಂಗಾಯತ', category: 'Cat-3B', subCastes: ['Banajiga', 'Sadaru', 'Panchamasali', 'Aradhya'] },
    { name: 'Kuruba', nameLocal: 'ಕುರುಬ', category: 'Cat-2A', subCastes: ['Kuruba Gowda', 'Halu Kuruba'] },
    { name: 'Scheduled Caste', nameLocal: 'ಪರಿಶಿಷ್ಟ ಜಾತಿ', category: 'SC', subCastes: ['Madiga', 'Holeya', 'Bovi'] },
    { name: 'Bunts', nameLocal: 'ಬಂಟ್ಸ್', category: 'Cat-3A' },
    { name: 'Billava', nameLocal: 'ಬಿಲ್ಲವ', category: 'Cat-1' },
    { name: 'Idiga', nameLocal: 'ಈಡಿಗ', category: 'Cat-2A' },
    { name: 'Brahmin', nameLocal: 'ಬ್ರಾಹ್ಮಣ', category: 'GM', subCastes: ['Havyaka', 'Madhwa', 'Smartha', 'Shivalli'] },
    { name: 'Muslim', nameLocal: 'ಮುಸ್ಲಿಂ', category: 'Cat-2B' },
    { name: 'Christian', nameLocal: 'ಕ್ರೈಸ್ತ', category: 'Cat-2B' },
  ],
  'Andhra Pradesh': [
    { name: 'Reddy', nameLocal: 'రెడ్డి', category: 'OC', subCastes: ['Kapu Reddy', 'Panta Reddy', 'Motati Reddy'] },
    { name: 'Kamma', nameLocal: 'కమ్మ', category: 'OC' },
    { name: 'Kapu', nameLocal: 'కాపు', category: 'BC-A', subCastes: ['Balija', 'Telaga', 'Ontari'] },
    { name: 'Velama', nameLocal: 'వెలమ', category: 'OC' },
    { name: 'Brahmin', nameLocal: 'బ్రాహ్మణ', category: 'OC', subCastes: ['Niyogi', 'Vaidiki', 'Telugu'] },
    { name: 'Vysya', nameLocal: 'వైశ్య', category: 'BC-A', subCastes: ['Komati', 'Arya Vysya'] },
    { name: 'Yadava', nameLocal: 'యాదవ', category: 'BC-D', subCastes: ['Golla', 'Kuruma'] },
    { name: 'Mala', nameLocal: 'మాల', category: 'SC' },
    { name: 'Madiga', nameLocal: 'మాదిగ', category: 'SC' },
    { name: 'Lambada', nameLocal: 'లంబాడా', category: 'ST' },
    { name: 'Yerukala', nameLocal: 'ఎరుకల', category: 'ST' },
  ],
  'Maharashtra': [
    { name: 'Maratha', nameLocal: 'मराठा', category: 'Open', subCastes: ['96 Kuli Maratha', 'Kunbi Maratha'] },
    { name: 'Kunbi', nameLocal: 'कुणबी', category: 'OBC' },
    { name: 'Brahmin', nameLocal: 'ब्राह्मण', category: 'Open', subCastes: ['Deshastha', 'Chitpavan', 'Karhade', 'Saraswat'] },
    { name: 'Mali', nameLocal: 'माळी', category: 'OBC' },
    { name: 'Dhangar', nameLocal: 'धनगर', category: 'VJNT' },
    { name: 'Mahar', nameLocal: 'महार', category: 'SC' },
    { name: 'Matang', nameLocal: 'मातंग', category: 'SC' },
    { name: 'Chambhar', nameLocal: 'चांभार', category: 'SC' },
    { name: 'Buddhist', nameLocal: 'बौद्ध', category: 'SC' },
    { name: 'Teli', nameLocal: 'तेली', category: 'OBC' },
    { name: 'Sonar', nameLocal: 'सोनार', category: 'OBC' },
    { name: 'Leva Patil', nameLocal: 'लेवा पाटील', category: 'OBC' },
  ],
  'Gujarat': [
    { name: 'Patel', nameLocal: 'પટેલ', category: 'General', subCastes: ['Leuva Patel', 'Kadva Patel', 'Anjana Patel'] },
    { name: 'Rajput', nameLocal: 'રાજપૂત', category: 'General', subCastes: ['Karadiya', 'Jhala', 'Chavda'] },
    { name: 'Brahmin', nameLocal: 'બ્રાહ્મણ', category: 'General', subCastes: ['Audichya', 'Nagar', 'Modh'] },
    { name: 'Koli', nameLocal: 'કોળી', category: 'SEBC', subCastes: ['Koli Patel', 'Talpada Koli'] },
    { name: 'Vaghri', nameLocal: 'વાઘરી', category: 'SEBC' },
    { name: 'Thakore', nameLocal: 'ઠાકોર', category: 'SEBC' },
    { name: 'Darbar', nameLocal: 'દરબાર', category: 'General' },
    { name: 'Vaniya', nameLocal: 'વાણિયા', category: 'General', subCastes: ['Jain Vaniya', 'Meshri', 'Lohana'] },
    { name: 'Scheduled Caste', nameLocal: 'અનુસૂચિત જાતિ', category: 'SC', subCastes: ['Vankar', 'Chamar', 'Bhangi'] },
    { name: 'Scheduled Tribe', nameLocal: 'અનુસૂચિત જનજાતિ', category: 'ST', subCastes: ['Bhil', 'Rathwa', 'Nayaka'] },
  ],
  'Uttar Pradesh': [
    { name: 'Brahmin', nameLocal: 'ब्राह्मण', category: 'General', subCastes: ['Gaur', 'Kanyakubj', 'Saryu Parin'] },
    { name: 'Rajput', nameLocal: 'राजपूत', category: 'General', subCastes: ['Chauhan', 'Gaharwar', 'Bundela'] },
    { name: 'Yadav', nameLocal: 'यादव', category: 'OBC', subCastes: ['Ahir', 'Goala', 'Gwala'] },
    { name: 'Jat', nameLocal: 'जाट', category: 'OBC' },
    { name: 'Kurmi', nameLocal: 'कुर्मी', category: 'OBC' },
    { name: 'Maurya', nameLocal: 'मौर्य', category: 'OBC', subCastes: ['Kushwaha', 'Koeri', 'Kachhi'] },
    { name: 'Vaishya', nameLocal: 'वैश्य', category: 'General', subCastes: ['Agarwal', 'Gupta', 'Khandelwal'] },
    { name: 'Chamar', nameLocal: 'चमार', category: 'SC', subCastes: ['Jatav', 'Raidas', 'Regar'] },
    { name: 'Pasi', nameLocal: 'पासी', category: 'SC' },
    { name: 'Valmiki', nameLocal: 'वाल्मीकि', category: 'SC', subCastes: ['Bhangi', 'Lal Begi'] },
    { name: 'Muslim', nameLocal: 'मुस्लिम', category: 'General', subCastes: ['Ansari', 'Siddiqui', 'Pathan', 'Sheikh'] },
  ],
};

// Languages by State
export const STATE_LANGUAGES: Record<string, Array<{ name: string; nameLocal: string; code: string; script: string; direction?: string }>> = {
  'Tamil Nadu': [
    { name: 'Tamil', nameLocal: 'தமிழ்', code: 'ta', script: 'Tamil' },
    { name: 'Telugu', nameLocal: 'తెలుగు', code: 'te', script: 'Telugu' },
    { name: 'Malayalam', nameLocal: 'മലയാളം', code: 'ml', script: 'Malayalam' },
    { name: 'Kannada', nameLocal: 'ಕನ್ನಡ', code: 'kn', script: 'Kannada' },
    { name: 'Urdu', nameLocal: 'اردو', code: 'ur', script: 'Arabic', direction: 'rtl' },
    { name: 'Hindi', nameLocal: 'हिन्दी', code: 'hi', script: 'Devanagari' },
    { name: 'Saurashtra', nameLocal: 'सौराष्ट्र', code: 'saz', script: 'Devanagari' },
    { name: 'English', nameLocal: 'English', code: 'en', script: 'Latin' },
  ],
  'Karnataka': [
    { name: 'Kannada', nameLocal: 'ಕನ್ನಡ', code: 'kn', script: 'Kannada' },
    { name: 'Tulu', nameLocal: 'ತುಳು', code: 'tcy', script: 'Kannada' },
    { name: 'Konkani', nameLocal: 'ಕೊಂಕಣಿ', code: 'kok', script: 'Kannada' },
    { name: 'Kodava', nameLocal: 'ಕೊಡವ', code: 'kfa', script: 'Kannada' },
    { name: 'Telugu', nameLocal: 'తెలుగు', code: 'te', script: 'Telugu' },
    { name: 'Tamil', nameLocal: 'தமிழ்', code: 'ta', script: 'Tamil' },
    { name: 'Urdu', nameLocal: 'اردو', code: 'ur', script: 'Arabic', direction: 'rtl' },
    { name: 'Marathi', nameLocal: 'मराठी', code: 'mr', script: 'Devanagari' },
  ],
  'Andhra Pradesh': [
    { name: 'Telugu', nameLocal: 'తెలుగు', code: 'te', script: 'Telugu' },
    { name: 'Urdu', nameLocal: 'اردو', code: 'ur', script: 'Arabic', direction: 'rtl' },
    { name: 'Hindi', nameLocal: 'हिन्दी', code: 'hi', script: 'Devanagari' },
    { name: 'Tamil', nameLocal: 'தமிழ்', code: 'ta', script: 'Tamil' },
    { name: 'Kannada', nameLocal: 'ಕನ್ನಡ', code: 'kn', script: 'Kannada' },
    { name: 'Odia', nameLocal: 'ଓଡ଼ିଆ', code: 'or', script: 'Odia' },
  ],
  'Maharashtra': [
    { name: 'Marathi', nameLocal: 'मराठी', code: 'mr', script: 'Devanagari' },
    { name: 'Hindi', nameLocal: 'हिन्दी', code: 'hi', script: 'Devanagari' },
    { name: 'Urdu', nameLocal: 'اردو', code: 'ur', script: 'Arabic', direction: 'rtl' },
    { name: 'Gujarati', nameLocal: 'ગુજરાતી', code: 'gu', script: 'Gujarati' },
    { name: 'Konkani', nameLocal: 'कोंकणी', code: 'kok', script: 'Devanagari' },
    { name: 'Kannada', nameLocal: 'ಕನ್ನಡ', code: 'kn', script: 'Kannada' },
    { name: 'Telugu', nameLocal: 'తెలుగు', code: 'te', script: 'Telugu' },
  ],
  'Gujarat': [
    { name: 'Gujarati', nameLocal: 'ગુજરાતી', code: 'gu', script: 'Gujarati' },
    { name: 'Hindi', nameLocal: 'हिन्दी', code: 'hi', script: 'Devanagari' },
    { name: 'Sindhi', nameLocal: 'سنڌي', code: 'sd', script: 'Arabic', direction: 'rtl' },
    { name: 'Marathi', nameLocal: 'मराठी', code: 'mr', script: 'Devanagari' },
    { name: 'Kutchi', nameLocal: 'કચ્છી', code: 'kfr', script: 'Gujarati' },
  ],
  'Uttar Pradesh': [
    { name: 'Hindi', nameLocal: 'हिन्दी', code: 'hi', script: 'Devanagari' },
    { name: 'Urdu', nameLocal: 'اردو', code: 'ur', script: 'Arabic', direction: 'rtl' },
    { name: 'Bhojpuri', nameLocal: 'भोजपुरी', code: 'bho', script: 'Devanagari' },
    { name: 'Awadhi', nameLocal: 'अवधी', code: 'awa', script: 'Devanagari' },
    { name: 'Braj', nameLocal: 'ब्रज', code: 'bra', script: 'Devanagari' },
    { name: 'Bundeli', nameLocal: 'बुंदेली', code: 'bns', script: 'Devanagari' },
  ],
  'Kerala': [
    { name: 'Malayalam', nameLocal: 'മലയാളം', code: 'ml', script: 'Malayalam' },
    { name: 'Tamil', nameLocal: 'தமிழ்', code: 'ta', script: 'Tamil' },
    { name: 'Kannada', nameLocal: 'ಕನ್ನಡ', code: 'kn', script: 'Kannada' },
    { name: 'Tulu', nameLocal: 'ತುಳು', code: 'tcy', script: 'Kannada' },
    { name: 'Konkani', nameLocal: 'കൊങ്കണി', code: 'kok', script: 'Malayalam' },
  ],
  'West Bengal': [
    { name: 'Bengali', nameLocal: 'বাংলা', code: 'bn', script: 'Bengali' },
    { name: 'Hindi', nameLocal: 'हिन्दी', code: 'hi', script: 'Devanagari' },
    { name: 'Urdu', nameLocal: 'اردو', code: 'ur', script: 'Arabic', direction: 'rtl' },
    { name: 'Nepali', nameLocal: 'नेपाली', code: 'ne', script: 'Devanagari' },
    { name: 'Santali', nameLocal: 'ᱥᱟᱱᱛᱟᱲᱤ', code: 'sat', script: 'Ol Chiki' },
  ],
};

// Major Political Parties
export const POLITICAL_PARTIES = [
  // National Parties
  { name: 'Bharatiya Janata Party', shortName: 'BJP', color: '#FF9933', alliance: 'NDA', isNational: true },
  { name: 'Indian National Congress', shortName: 'INC', color: '#00BFFF', alliance: 'INDIA', isNational: true },
  { name: 'Aam Aadmi Party', shortName: 'AAP', color: '#0066CC', alliance: 'INDIA', isNational: true },
  { name: 'Bahujan Samaj Party', shortName: 'BSP', color: '#22409A', alliance: 'Independent', isNational: true },
  { name: 'Communist Party of India (Marxist)', shortName: 'CPI(M)', color: '#FF0000', alliance: 'INDIA', isNational: true },
  { name: 'Communist Party of India', shortName: 'CPI', color: '#CC0000', alliance: 'INDIA', isNational: true },
  { name: 'National People\'s Party', shortName: 'NPP', color: '#00FF00', alliance: 'NDA', isNational: true },

  // Regional Parties - South
  { name: 'Dravida Munnetra Kazhagam', shortName: 'DMK', color: '#FF0000', state: 'Tamil Nadu', alliance: 'INDIA' },
  { name: 'All India Anna Dravida Munnetra Kazhagam', shortName: 'AIADMK', color: '#00FF00', state: 'Tamil Nadu', alliance: 'Independent' },
  { name: 'Pattali Makkal Katchi', shortName: 'PMK', color: '#FFFF00', state: 'Tamil Nadu', alliance: 'NDA' },
  { name: 'Desiya Murpokku Dravida Kazhagam', shortName: 'DMDK', color: '#FF6600', state: 'Tamil Nadu' },
  { name: 'Viduthalai Chiruthaigal Katchi', shortName: 'VCK', color: '#0000FF', state: 'Tamil Nadu', alliance: 'INDIA' },
  { name: 'Naam Tamilar Katchi', shortName: 'NTK', color: '#800000', state: 'Tamil Nadu' },

  // Karnataka
  { name: 'Janata Dal (Secular)', shortName: 'JD(S)', color: '#228B22', state: 'Karnataka', alliance: 'NDA' },

  // Andhra Pradesh & Telangana
  { name: 'Telugu Desam Party', shortName: 'TDP', color: '#FFFF00', state: 'Andhra Pradesh', alliance: 'NDA' },
  { name: 'YSR Congress Party', shortName: 'YSRCP', color: '#0066FF', state: 'Andhra Pradesh' },
  { name: 'Jana Sena Party', shortName: 'JSP', color: '#FF4500', state: 'Andhra Pradesh', alliance: 'NDA' },
  { name: 'Bharat Rashtra Samithi', shortName: 'BRS', color: '#FF69B4', state: 'Telangana' },

  // Kerala
  { name: 'Indian Union Muslim League', shortName: 'IUML', color: '#006400', state: 'Kerala', alliance: 'INDIA' },
  { name: 'Kerala Congress (M)', shortName: 'KC(M)', color: '#800080', state: 'Kerala' },

  // Maharashtra
  { name: 'Shiv Sena', shortName: 'SHS', color: '#FF6600', state: 'Maharashtra', alliance: 'NDA' },
  { name: 'Shiv Sena (UBT)', shortName: 'SHS(UBT)', color: '#FF8C00', state: 'Maharashtra', alliance: 'INDIA' },
  { name: 'Nationalist Congress Party', shortName: 'NCP', color: '#0000CD', state: 'Maharashtra', alliance: 'NDA' },
  { name: 'NCP (SP)', shortName: 'NCP(SP)', color: '#4169E1', state: 'Maharashtra', alliance: 'INDIA' },

  // West Bengal
  { name: 'All India Trinamool Congress', shortName: 'TMC', color: '#00FF00', state: 'West Bengal', alliance: 'INDIA' },

  // Uttar Pradesh & Bihar
  { name: 'Samajwadi Party', shortName: 'SP', color: '#FF0000', state: 'Uttar Pradesh', alliance: 'INDIA' },
  { name: 'Rashtriya Janata Dal', shortName: 'RJD', color: '#00FF00', state: 'Bihar', alliance: 'INDIA' },
  { name: 'Janata Dal (United)', shortName: 'JD(U)', color: '#008000', state: 'Bihar', alliance: 'NDA' },
  { name: 'Lok Janshakti Party (Ram Vilas)', shortName: 'LJPRV', color: '#FFFF00', state: 'Bihar', alliance: 'NDA' },

  // Odisha
  { name: 'Biju Janata Dal', shortName: 'BJD', color: '#00FF7F', state: 'Odisha' },

  // Punjab
  { name: 'Shiromani Akali Dal', shortName: 'SAD', color: '#0000FF', state: 'Punjab' },

  // North East
  { name: 'Asom Gana Parishad', shortName: 'AGP', color: '#008080', state: 'Assam', alliance: 'NDA' },
  { name: 'United Democratic Party', shortName: 'UDP', color: '#FF1493', state: 'Meghalaya' },

  // Others
  { name: 'Independent', shortName: 'IND', color: '#FFFFFF', isNeutral: true },
  { name: 'Neutral', shortName: 'N/A', color: '#808080', isNeutral: true },
  { name: 'NOTA', shortName: 'NOTA', color: '#000000', isNeutral: true },
];

// Government Schemes
export const GOVERNMENT_SCHEMES = [
  // Central Government Schemes
  { name: 'Pradhan Mantri Jan Dhan Yojana', shortName: 'PMJDY', provider: 'UNION_GOVT', category: 'Financial Inclusion', value: 0 },
  { name: 'Pradhan Mantri Ujjwala Yojana', shortName: 'PMUY', provider: 'UNION_GOVT', category: 'LPG Connection', value: 1600 },
  { name: 'Pradhan Mantri Mudra Yojana', shortName: 'PMMY', provider: 'UNION_GOVT', category: 'Business Loan', value: 50000 },
  { name: 'PM Kisan Samman Nidhi', shortName: 'PMKISAN', provider: 'UNION_GOVT', category: 'Agriculture', value: 6000, valueType: 'YEARLY' },
  { name: 'Pradhan Mantri Awas Yojana - Gramin', shortName: 'PMAY-G', provider: 'UNION_GOVT', category: 'Housing', value: 120000 },
  { name: 'Pradhan Mantri Awas Yojana - Urban', shortName: 'PMAY-U', provider: 'UNION_GOVT', category: 'Housing', value: 250000 },
  { name: 'Ayushman Bharat - PMJAY', shortName: 'ABPMJAY', provider: 'UNION_GOVT', category: 'Health', value: 500000 },
  { name: 'PM Vishwakarma Yojana', shortName: 'PMVY', provider: 'UNION_GOVT', category: 'Artisans', value: 300000 },
  { name: 'PM Garib Kalyan Anna Yojana', shortName: 'PMGKAY', provider: 'UNION_GOVT', category: 'Food Security', value: 0 },
  { name: 'Sukanya Samriddhi Yojana', shortName: 'SSY', provider: 'UNION_GOVT', category: 'Girl Child', value: 0 },
  { name: 'Atal Pension Yojana', shortName: 'APY', provider: 'UNION_GOVT', category: 'Pension', value: 5000, valueType: 'MONTHLY' },
  { name: 'PM Suraksha Bima Yojana', shortName: 'PMSBY', provider: 'UNION_GOVT', category: 'Insurance', value: 200000 },
  { name: 'PM Jeevan Jyoti Bima Yojana', shortName: 'PMJJBY', provider: 'UNION_GOVT', category: 'Insurance', value: 200000 },
  { name: 'National Pension Scheme', shortName: 'NPS', provider: 'UNION_GOVT', category: 'Pension', value: 0 },
  { name: 'PM SVANidhi', shortName: 'PMSVANidhi', provider: 'UNION_GOVT', category: 'Street Vendors', value: 50000 },
  { name: 'Stand-Up India', shortName: 'SUI', provider: 'UNION_GOVT', category: 'SC/ST/Women Entrepreneurs', value: 10000000 },
  { name: 'PM KUSUM', shortName: 'KUSUM', provider: 'UNION_GOVT', category: 'Solar Power', value: 0 },

  // Tamil Nadu State Schemes
  { name: 'Kalaignar Magalir Urimai Thogai', shortName: 'KMUT', provider: 'STATE_GOVT', state: 'Tamil Nadu', category: 'Women Welfare', value: 1000, valueType: 'MONTHLY' },
  { name: 'Free Rice Scheme', shortName: 'FRS-TN', provider: 'STATE_GOVT', state: 'Tamil Nadu', category: 'Food Security', value: 0 },
  { name: 'Chief Minister Health Insurance', shortName: 'CMCHIS', provider: 'STATE_GOVT', state: 'Tamil Nadu', category: 'Health', value: 500000 },
  { name: 'Marriage Assistance Scheme', shortName: 'MAS-TN', provider: 'STATE_GOVT', state: 'Tamil Nadu', category: 'Marriage', value: 50000 },
  { name: 'Pudhumai Penn Scheme', shortName: 'PPS', provider: 'STATE_GOVT', state: 'Tamil Nadu', category: 'Girl Education', value: 1000, valueType: 'MONTHLY' },

  // Andhra Pradesh Schemes
  { name: 'Amma Vodi', shortName: 'AV-AP', provider: 'STATE_GOVT', state: 'Andhra Pradesh', category: 'Education', value: 15000, valueType: 'YEARLY' },
  { name: 'YSR Rythu Bharosa', shortName: 'YSRRB', provider: 'STATE_GOVT', state: 'Andhra Pradesh', category: 'Agriculture', value: 13500, valueType: 'YEARLY' },
  { name: 'YSR Asara', shortName: 'YSRA', provider: 'STATE_GOVT', state: 'Andhra Pradesh', category: 'Women SHG', value: 0 },
  { name: 'Jagananna Vidya Deevena', shortName: 'JVD', provider: 'STATE_GOVT', state: 'Andhra Pradesh', category: 'Education', value: 0 },

  // Karnataka Schemes
  { name: 'Gruha Lakshmi', shortName: 'GL-KA', provider: 'STATE_GOVT', state: 'Karnataka', category: 'Women Welfare', value: 2000, valueType: 'MONTHLY' },
  { name: 'Gruha Jyothi', shortName: 'GJ-KA', provider: 'STATE_GOVT', state: 'Karnataka', category: 'Free Electricity', value: 0 },
  { name: 'Anna Bhagya', shortName: 'AB-KA', provider: 'STATE_GOVT', state: 'Karnataka', category: 'Food Security', value: 0 },
  { name: 'Shakti', shortName: 'SK-KA', provider: 'STATE_GOVT', state: 'Karnataka', category: 'Free Bus Travel', value: 0 },
  { name: 'Yuva Nidhi', shortName: 'YN-KA', provider: 'STATE_GOVT', state: 'Karnataka', category: 'Youth Unemployment', value: 3000, valueType: 'MONTHLY' },

  // Maharashtra Schemes
  { name: 'Mukhyamantri Majhi Ladki Bahin', shortName: 'MMLB', provider: 'STATE_GOVT', state: 'Maharashtra', category: 'Women Welfare', value: 1500, valueType: 'MONTHLY' },
  { name: 'Mahatma Phule Jan Arogya Yojana', shortName: 'MPJAY', provider: 'STATE_GOVT', state: 'Maharashtra', category: 'Health', value: 500000 },

  // Gujarat Schemes
  { name: 'Mukhyamantri Amrutam Yojana', shortName: 'MAY-GJ', provider: 'STATE_GOVT', state: 'Gujarat', category: 'Health', value: 500000 },
  { name: 'Vahali Dikri Yojana', shortName: 'VDY', provider: 'STATE_GOVT', state: 'Gujarat', category: 'Girl Child', value: 110000 },

  // Uttar Pradesh Schemes
  { name: 'Kanya Sumangala Yojana', shortName: 'KSY-UP', provider: 'STATE_GOVT', state: 'Uttar Pradesh', category: 'Girl Child', value: 25000 },
  { name: 'BC Sakhi Yojana', shortName: 'BCSY', provider: 'STATE_GOVT', state: 'Uttar Pradesh', category: 'Women SHG', value: 4000, valueType: 'MONTHLY' },
];

// Voter Categories (Status Categories)
export const VOTER_CATEGORIES = [
  { name: 'Available', nameLocal: 'उपलब्ध', color: '#52C41A', icon: 'check-circle', description: 'Voter is available at registered address' },
  { name: 'Shifted', nameLocal: 'स्थानांतरित', color: '#1890FF', icon: 'arrow-right', description: 'Voter has shifted to different address' },
  { name: 'Double Entry', nameLocal: 'दोहरी प्रविष्टि', color: '#FF4D4F', icon: 'copy', description: 'Duplicate voter entry' },
  { name: 'Outstation', nameLocal: 'बाहर रहनेवाला', color: '#FAAD14', icon: 'environment', description: 'Voter is staying in different city/state' },
  { name: 'Not in Home', nameLocal: 'घर पर नहीं', color: '#8C8C8C', icon: 'close-circle', description: 'Voter not found at home during visit' },
  { name: 'Deceased', nameLocal: 'मृत', color: '#000000', icon: 'user-delete', description: 'Voter has passed away' },
  { name: 'NRI', nameLocal: 'एनआरआई', color: '#722ED1', icon: 'global', description: 'Non-Resident Indian' },
  { name: 'PwD', nameLocal: 'दिव्यांग', color: '#13C2C2', icon: 'heart', description: 'Person with Disability' },
  { name: 'Senior Citizen', nameLocal: 'वरिष्ठ नागरिक', color: '#FA8C16', icon: 'user', description: 'Age 60+' },
  { name: 'First Time Voter', nameLocal: 'प्रथम मतदाता', color: '#EB2F96', icon: 'star', description: 'Age 18-19, new voter' },
];

// Sample Constituencies for each state
export const SAMPLE_CONSTITUENCIES: Record<string, string[]> = {
  'Tamil Nadu': ['Chennai South', 'Chennai Central', 'Chennai North', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli', 'Tirunelveli', 'Karaikudi', 'Thanjavur'],
  'Karnataka': ['Bangalore South', 'Bangalore Central', 'Bangalore North', 'Mysore', 'Mangalore', 'Belgaum', 'Hubli-Dharwad', 'Bellary', 'Shimoga', 'Chitradurga'],
  'Andhra Pradesh': ['Vijayawada', 'Visakhapatnam', 'Guntur', 'Nellore', 'Tirupati', 'Kadapa', 'Anantapur', 'Kurnool', 'Rajamahendravaram', 'Eluru'],
  'Maharashtra': ['Mumbai South', 'Mumbai North', 'Mumbai North East', 'Thane', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Kolhapur', 'Solapur'],
  'Gujarat': ['Ahmedabad East', 'Ahmedabad West', 'Gandhinagar', 'Vadodara', 'Surat', 'Rajkot', 'Bhavnagar', 'Junagadh', 'Kutch', 'Kheda'],
  'Uttar Pradesh': ['Lucknow', 'Varanasi', 'Kanpur', 'Agra', 'Allahabad', 'Gorakhpur', 'Meerut', 'Ghaziabad', 'Noida', 'Mathura'],
  'West Bengal': ['Kolkata North', 'Kolkata South', 'Howrah', 'Hooghly', 'Midnapore', 'Bankura', 'Birbhum', 'Murshidabad', 'Malda', 'Darjeeling'],
  'Kerala': ['Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram'],
  'Rajasthan': ['Jaipur Rural', 'Jaipur', 'Alwar', 'Bharatpur', 'Karauli-Dholpur', 'Dausa', 'Tonk-Sawai Madhopur', 'Ajmer', 'Nagaur', 'Jodhpur'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Vidisha', 'Rajgarh', 'Dewas', 'Khargone'],
};

// Sample First Names (Indian)
export const INDIAN_FIRST_NAMES = {
  male: [
    'Arun', 'Bala', 'Chandra', 'Dinesh', 'Ezhil', 'Gopi', 'Hari', 'Jaya', 'Karthik', 'Lakshman',
    'Mohan', 'Naresh', 'Om', 'Prakash', 'Rajesh', 'Suresh', 'Tamil', 'Udhay', 'Vijay', 'Yogesh',
    'Amit', 'Rahul', 'Pradeep', 'Sanjay', 'Manoj', 'Ravi', 'Krishna', 'Ganesh', 'Venkat', 'Ashok',
    'Ramesh', 'Mukesh', 'Satish', 'Rakesh', 'Naveen', 'Anil', 'Ajay', 'Deepak', 'Vinod', 'Anand',
  ],
  female: [
    'Aadhira', 'Bhavani', 'Chitra', 'Devi', 'Eswari', 'Geetha', 'Hema', 'Indira', 'Jayanthi', 'Kamala',
    'Lakshmi', 'Meena', 'Nirmala', 'Padma', 'Radha', 'Saraswati', 'Tamilselvi', 'Uma', 'Vasanthi', 'Yamuna',
    'Priya', 'Divya', 'Anjali', 'Pooja', 'Kavitha', 'Revathi', 'Sudha', 'Vani', 'Saritha', 'Anitha',
    'Sunitha', 'Malathi', 'Jyothi', 'Shanthi', 'Prema', 'Shobha', 'Rekha', 'Usha', 'Rani', 'Mala',
  ],
};

// Sample Last Names by Region
export const INDIAN_LAST_NAMES: Record<string, string[]> = {
  'Tamil Nadu': ['Kumar', 'Rajan', 'Murugan', 'Sundaram', 'Pillai', 'Nadar', 'Thevar', 'Gounder', 'Chettiar', 'Iyer', 'Iyengar', 'Naicker', 'Nair', 'Reddy', 'Ramasamy'],
  'Karnataka': ['Gowda', 'Swamy', 'Shetty', 'Naik', 'Rao', 'Reddy', 'Hegde', 'Bhat', 'Patel', 'Acharya', 'Murthy', 'Prasad', 'Kumar', 'Babu', 'Patil'],
  'Andhra Pradesh': ['Reddy', 'Naidu', 'Rao', 'Sharma', 'Raju', 'Prasad', 'Varma', 'Chowdary', 'Goud', 'Setty', 'Kumar', 'Babu', 'Murthy', 'Krishna', 'Yadav'],
  'Maharashtra': ['Patil', 'Deshmukh', 'Jadhav', 'Shinde', 'More', 'Pawar', 'Chavan', 'Kadam', 'Gaikwad', 'Bhosale', 'Kale', 'Kulkarni', 'Joshi', 'Desai', 'Deshpande'],
  'Gujarat': ['Patel', 'Shah', 'Mehta', 'Desai', 'Modi', 'Joshi', 'Trivedi', 'Pandya', 'Bhatt', 'Dave', 'Parekh', 'Solanki', 'Thakkar', 'Vyas', 'Sharma'],
  'Uttar Pradesh': ['Singh', 'Sharma', 'Verma', 'Mishra', 'Yadav', 'Gupta', 'Tiwari', 'Pandey', 'Dubey', 'Srivastava', 'Agarwal', 'Chauhan', 'Maurya', 'Rajput', 'Khan'],
  'West Bengal': ['Banerjee', 'Mukherjee', 'Chatterjee', 'Chakraborty', 'Das', 'Ghosh', 'Sen', 'Bose', 'Roy', 'Dutta', 'Sarkar', 'Mondal', 'Biswas', 'Pal', 'Saha'],
  'Kerala': ['Nair', 'Menon', 'Pillai', 'Kurup', 'Varma', 'Iyer', 'Nambiar', 'Kumar', 'Krishnan', 'Gopalan', 'Mohan', 'Thomas', 'Joseph', 'George', 'Mathew'],
  'default': ['Kumar', 'Singh', 'Sharma', 'Verma', 'Yadav', 'Gupta', 'Patel', 'Shah', 'Reddy', 'Rao', 'Naidu', 'Pillai', 'Nair', 'Mukherjee', 'Das'],
};

// Feedback Issue Categories
export const FEEDBACK_CATEGORIES = [
  { name: 'Water Supply', subCategories: ['No Water', 'Low Pressure', 'Contaminated Water', 'Pipeline Leak'] },
  { name: 'Roads', subCategories: ['Potholes', 'No Streetlights', 'Road Damage', 'Traffic Issues'] },
  { name: 'Drainage', subCategories: ['Clogged Drains', 'Overflow', 'Sewage Smell', 'Flooding'] },
  { name: 'Electricity', subCategories: ['Power Cuts', 'Voltage Fluctuation', 'Faulty Transformer', 'No Connection'] },
  { name: 'Healthcare', subCategories: ['Hospital Facilities', 'Medicine Shortage', 'Staff Issues', 'Ambulance'] },
  { name: 'Education', subCategories: ['School Infrastructure', 'Teacher Shortage', 'Mid-day Meal', 'Fees'] },
  { name: 'Sanitation', subCategories: ['Garbage Collection', 'Open Defecation', 'Public Toilets', 'Pest Control'] },
  { name: 'Agriculture', subCategories: ['Fertilizer Supply', 'Seeds', 'Irrigation', 'Crop Insurance'] },
  { name: 'Employment', subCategories: ['MGNREGA', 'Skill Training', 'Job Fair', 'Youth Employment'] },
  { name: 'Social Welfare', subCategories: ['Pension', 'Ration Card', 'Scheme Benefits', 'BPL Card'] },
];

export default {
  INDIAN_STATES,
  UNION_TERRITORIES,
  RELIGIONS,
  CASTE_CATEGORIES,
  STATE_CASTE_CATEGORIES,
  STATE_CASTES,
  STATE_LANGUAGES,
  POLITICAL_PARTIES,
  GOVERNMENT_SCHEMES,
  VOTER_CATEGORIES,
  SAMPLE_CONSTITUENCIES,
  INDIAN_FIRST_NAMES,
  INDIAN_LAST_NAMES,
  FEEDBACK_CATEGORIES,
};
