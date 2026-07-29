// Phase 6 §16 — Bangladesh Administrative Location Database
// Divisions, Districts, and Upazilas/Thanas sourced from the Bangladesh
// Election Commission / BBS 2022 administrative boundaries.
// This is used for:
//   1. Checkout district/thana dropdowns
//   2. Delivery estimation (inside/outside Dhaka)
//   3. Future geographic analytics

export interface Upazila {
  name: string;
  bn: string;
}

export interface District {
  name: string;
  bn: string;
  upazilas: Upazila[];
}

export interface Division {
  name: string;
  bn: string;
  districts: District[];
}

export const BD_LOCATIONS: Division[] = [
  {
    name: 'Dhaka', bn: 'ঢাকা',
    districts: [
      { name: 'Dhaka', bn: 'ঢাকা', upazilas: [
        {name:'Adabor',bn:'আদাবর'},{name:'Badda',bn:'বাড্ডা'},{name:'Bangshal',bn:'বংশাল'},{name:'Cantonment',bn:'ক্যান্টনমেন্ট'},{name:'Dhanmondi',bn:'ধানমন্ডি'},{name:'Demra',bn:'ডেমরা'},{name:'Gulshan',bn:'গুলশান'},{name:'Hazaribagh',bn:'হাজারিবাগ'},{name:'Jatrabari',bn:'যাত্রাবাড়ী'},{name:'Kafrul',bn:'কাফরুল'},{name:'Khilgaon',bn:'খিলগাঁও'},{name:'Khilkhet',bn:'খিলক্ষেত'},{name:'Kotwali',bn:'কোতোয়ালি'},{name:'Lalbagh',bn:'লালবাগ'},{name:'Mirpur',bn:'মিরপুর'},{name:'Mohammadpur',bn:'মোহাম্মদপুর'},{name:'Motijheel',bn:'মতিঝিল'},{name:'Pallabi',bn:'পল্লবী'},{name:'Ramna',bn:'রমনা'},{name:'Rayer Bazar',bn:'রায়ের বাজার'},{name:'Sabujbagh',bn:'সবুজবাগ'},{name:'Shah Ali',bn:'শাহ আলী'},{name:'Shahjahanpur',bn:'শাহজাহানপুর'},{name:'Sher-e-Bangla Nagar',bn:'শেরে বাংলা নগর'},{name:'Shyampur',bn:'শ্যামপুর'},{name:'Sutrapur',bn:'সূত্রাপুর'},{name:'Tejgaon',bn:'তেজগাঁও'},{name:'Turag',bn:'তুরাগ'},{name:'Uttara',bn:'উত্তরা'},{name:'Wari',bn:'ওয়ারী'},
      ]},
      { name: 'Gazipur', bn: 'গাজীপুর', upazilas: [{name:'Gazipur Sadar',bn:'গাজীপুর সদর'},{name:'Kaliakair',bn:'কালিয়াকৈর'},{name:'Kaliganj',bn:'কালীগঞ্জ'},{name:'Kapasia',bn:'কাপাসিয়া'},{name:'Sreepur',bn:'শ্রীপুর'}]},
      { name: 'Narsingdi', bn: 'নরসিংদী', upazilas: [{name:'Narsingdi Sadar',bn:'নরসিংদী সদর'},{name:'Belabo',bn:'বেলাবো'},{name:'Monohardi',bn:'মনোহরদী'},{name:'Palash',bn:'পলাশ'},{name:'Raipura',bn:'রায়পুরা'},{name:'Shibpur',bn:'শিবপুর'}]},
      { name: 'Narayanganj', bn: 'নারায়ণগঞ্জ', upazilas: [{name:'Narayanganj Sadar',bn:'নারায়ণগঞ্জ সদর'},{name:'Araihazar',bn:'আড়াইহাজার'},{name:'Bandar',bn:'বন্দর'},{name:'Rupganj',bn:'রূপগঞ্জ'},{name:'Sonargaon',bn:'সোনারগাঁও'}]},
      { name: 'Manikganj', bn: 'মানিকগঞ্জ', upazilas: [{name:'Manikganj Sadar',bn:'মানিকগঞ্জ সদর'},{name:'Daulatpur',bn:'দৌলতপুর'},{name:'Ghior',bn:'ঘিওর'},{name:'Harirampur',bn:'হরিরামপুর'},{name:'Saturia',bn:'সাটুরিয়া'},{name:'Shivalaya',bn:'শিবালয়'},{name:'Singair',bn:'সিংগাইর'}]},
      { name: 'Munshiganj', bn: 'মুন্সিগঞ্জ', upazilas: [{name:'Munshiganj Sadar',bn:'মুন্সিগঞ্জ সদর'},{name:'Gazaria',bn:'গজারিয়া'},{name:'Lohajang',bn:'লৌহজং'},{name:'Sirajdikhan',bn:'সিরাজদিখান'},{name:'Sreenagar',bn:'শ্রীনগর'},{name:'Tongibari',bn:'টঙ্গীবাড়ী'}]},
      { name: 'Kishoreganj', bn: 'কিশোরগঞ্জ', upazilas: [{name:'Kishoreganj Sadar',bn:'কিশোরগঞ্জ সদর'},{name:'Bajitpur',bn:'বাজিতপুর'},{name:'Bhairab',bn:'ভৈরব'},{name:'Hossainpur',bn:'হোসেনপুর'},{name:'Itna',bn:'ইটনা'},{name:'Katiadi',bn:'কটিয়াদি'},{name:'Kuliarchar',bn:'কুলিয়ারচর'},{name:'Mithamain',bn:'মিঠামইন'},{name:'Nikli',bn:'নিকলী'},{name:'Pakundia',bn:'পাকুন্দিয়া'},{name:'Tarail',bn:'তাড়াইল'}]},
      { name: 'Tangail', bn: 'টাঙ্গাইল', upazilas: [{name:'Tangail Sadar',bn:'টাঙ্গাইল সদর'},{name:'Basail',bn:'বাসাইল'},{name:'Bhuapur',bn:'ভূঞাপুর'},{name:'Delduar',bn:'দেলদুয়ার'},{name:'Ghatail',bn:'ঘাটাইল'},{name:'Gopalpur',bn:'গোপালপুর'},{name:'Kalihati',bn:'কালিহাতী'},{name:'Madhupur',bn:'মধুপুর'},{name:'Mirzapur',bn:'মির্জাপুর'},{name:'Nagarpur',bn:'নাগরপুর'},{name:'Sakhipur',bn:'সখীপুর'}]},
    ],
  },
  {
    name: 'Chittagong', bn: 'চট্টগ্রাম',
    districts: [
      { name: 'Chittagong', bn: 'চট্টগ্রাম', upazilas: [{name:'Akhaura',bn:'আখাউড়া'},{name:'Anwara',bn:'আনোয়ারা'},{name:'Banshkhali',bn:'বাঁশখালী'},{name:'Boalkhali',bn:'বোয়ালখালী'},{name:'Chandanaish',bn:'চন্দনাইশ'},{name:'Double Mooring',bn:'ডবলমুরিং'},{name:'Fatikchhari',bn:'ফটিকছড়ি'},{name:'Hathazari',bn:'হাটহাজারী'},{name:'Karnaphuli',bn:'কর্ণফুলী'},{name:'Kotwali',bn:'কোতোয়ালি'},{name:'Lohagara',bn:'লোহাগাড়া'},{name:'Mirsharai',bn:'মিরসরাই'},{name:'Pahartali',bn:'পাহাড়তলী'},{name:'Patiya',bn:'পটিয়া'},{name:'Panchlaish',bn:'পাঁচলাইশ'},{name:'Rangunia',bn:'রাঙ্গুনিয়া'},{name:'Raozan',bn:'রাউজান'},{name:'Sandwip',bn:'সন্দ্বীপ'},{name:'Satkania',bn:'সাতকানিয়া'},{name:'Sitakunda',bn:'সীতাকুণ্ড'}]},
      { name: "Cox's Bazar", bn: "কক্সবাজার", upazilas: [{name:"Cox's Bazar Sadar",bn:'কক্সবাজার সদর'},{name:'Chakaria',bn:'চকরিয়া'},{name:'Kutubdia',bn:'কুতুবদিয়া'},{name:'Maheshkhali',bn:'মহেশখালী'},{name:'Pekua',bn:'পেকুয়া'},{name:'Ramu',bn:'রামু'},{name:'Teknaf',bn:'টেকনাফ'},{name:'Ukhia',bn:'উখিয়া'}]},
      { name: 'Comilla', bn: 'কুমিল্লা', upazilas: [{name:'Comilla Sadar',bn:'কুমিল্লা সদর'},{name:'Barura',bn:'বরুড়া'},{name:'Brahmanpara',bn:'ব্রাহ্মণপাড়া'},{name:'Burichang',bn:'বুড়িচং'},{name:'Chandina',bn:'চান্দিনা'},{name:'Chauddagram',bn:'চৌদ্দগ্রাম'},{name:'Daudkandi',bn:'দাউদকান্দি'},{name:'Debidwar',bn:'দেবিদ্বার'},{name:'Homna',bn:'হোমনা'},{name:'Laksam',bn:'লাকসাম'},{name:'Lalmai',bn:'লালমাই'},{name:'Meghna',bn:'মেঘনা'},{name:'Monohorganj',bn:'মনোহরগঞ্জ'},{name:'Muradnagar',bn:'মুরাদনগর'},{name:'Nangalkot',bn:'নাঙ্গলকোট'},{name:'Titas',bn:'তিতাস'}]},
    ],
  },
  {
    name: 'Sylhet', bn: 'সিলেট',
    districts: [
      { name: 'Sylhet', bn: 'সিলেট', upazilas: [{name:'Sylhet Sadar',bn:'সিলেট সদর'},{name:'Balaganj',bn:'বালাগঞ্জ'},{name:'Beani Bazar',bn:'বিয়ানীবাজার'},{name:'Bishwanath',bn:'বিশ্বনাথ'},{name:'Company Ganj',bn:'কোম্পানীগঞ্জ'},{name:'Fenchuganj',bn:'ফেঞ্চুগঞ্জ'},{name:'Golapganj',bn:'গোলাপগঞ্জ'},{name:'Gowainghat',bn:'গোয়াইনঘাট'},{name:'Jaintiapur',bn:'জৈন্তাপুর'},{name:'Kanaighat',bn:'কানাইঘাট'},{name:'Osmaninagar',bn:'ওসমানীনগর'},{name:'South Surma',bn:'দক্ষিণ সুরমা'},{name:'Zakiganj',bn:'জকিগঞ্জ'}]},
      { name: 'Sunamganj', bn: 'সুনামগঞ্জ', upazilas: [{name:'Sunamganj Sadar',bn:'সুনামগঞ্জ সদর'},{name:'Bishwamvarpur',bn:'বিশ্বম্ভরপুর'},{name:'Chhatak',bn:'ছাতক'},{name:'Derai',bn:'দিরাই'},{name:'Dharampasha',bn:'ধর্মপাশা'},{name:'Dowarabazar',bn:'দোয়ারাবাজার'},{name:'Jagannathpur',bn:'জগন্নাথপুর'},{name:'Jamalganj',bn:'জামালগঞ্জ'},{name:'Sullah',bn:'সুল্লা'},{name:'Tahirpur',bn:'তাহিরপুর'}]},
      { name: 'Habiganj', bn: 'হবিগঞ্জ', upazilas: [{name:'Habiganj Sadar',bn:'হবিগঞ্জ সদর'},{name:'Ajmiriganj',bn:'আজমিরিগঞ্জ'},{name:'Bahubal',bn:'বাহুবল'},{name:'Baniachong',bn:'বানিয়াচং'},{name:'Chunarughat',bn:'চুনারুঘাট'},{name:'Lakhai',bn:'লাখাই'},{name:'Madhabpur',bn:'মাধবপুর'},{name:'Nabiganj',bn:'নবীগঞ্জ'}]},
      { name: 'Moulvibazar', bn: 'মৌলভীবাজার', upazilas: [{name:'Moulvibazar Sadar',bn:'মৌলভীবাজার সদর'},{name:'Barlekha',bn:'বড়লেখা'},{name:'Juri',bn:'জুড়ী'},{name:'Kamalganj',bn:'কমলগঞ্জ'},{name:'Kulaura',bn:'কুলাউড়া'},{name:'Rajnagar',bn:'রাজনগর'},{name:'Sreemangal',bn:'শ্রীমঙ্গল'}]},
    ],
  },
  {
    name: 'Rajshahi', bn: 'রাজশাহী',
    districts: [
      { name: 'Rajshahi', bn: 'রাজশাহী', upazilas: [{name:'Rajshahi Sadar (Boalia)',bn:'রাজশাহী সদর'},{name:'Bagha',bn:'বাঘা'},{name:'Bagmara',bn:'বাগমারা'},{name:'Charghat',bn:'চারঘাট'},{name:'Durgapur',bn:'দুর্গাপুর'},{name:'Godagari',bn:'গোদাগাড়ী'},{name:'Mohanpur',bn:'মোহনপুর'},{name:'Paba',bn:'পবা'},{name:'Puthia',bn:'পুঠিয়া'},{name:'Tanore',bn:'তানোর'}]},
      { name: 'Bogura', bn: 'বগুড়া', upazilas: [{name:'Bogura Sadar',bn:'বগুড়া সদর'},{name:'Adamdighi',bn:'আদমদীঘি'},{name:'Dhunat',bn:'ধুনট'},{name:'Dhupchanchia',bn:'দুপচাঁচিয়া'},{name:'Gabtali',bn:'গাবতলী'},{name:'Kahaloo',bn:'কাহালু'},{name:'Nandigram',bn:'নন্দীগ্রাম'},{name:'Sariakandi',bn:'সারিয়াকান্দি'},{name:'Shahajanpur',bn:'শাহজাহানপুর'},{name:'Sherpur',bn:'শেরপুর'},{name:'Shibganj',bn:'শিবগঞ্জ'},{name:'Sonatala',bn:'সোনাতলা'}]},
      { name: 'Rangpur', bn: 'রংপুর', upazilas: [{name:'Rangpur Sadar',bn:'রংপুর সদর'},{name:'Badarganj',bn:'বদরগঞ্জ'},{name:'Gangachara',bn:'গঙ্গাচড়া'},{name:'Kaunia',bn:'কাউনিয়া'},{name:'Mithapukur',bn:'মিঠাপুকুর'},{name:'Pirgachha',bn:'পীরগাছা'},{name:'Pirganj',bn:'পীরগঞ্জ'},{name:'Taraganj',bn:'তারাগঞ্জ'}]},
    ],
  },
  {
    name: 'Khulna', bn: 'খুলনা',
    districts: [
      { name: 'Khulna', bn: 'খুলনা', upazilas: [{name:'Khulna Sadar',bn:'খুলনা সদর'},{name:'Batiaghata',bn:'বটিয়াঘাটা'},{name:'Dacope',bn:'দাকোপ'},{name:'Dighalia',bn:'দিঘলিয়া'},{name:'Dumuria',bn:'ডুমুরিয়া'},{name:'Koyra',bn:'কয়রা'},{name:'Paikgachha',bn:'পাইকগাছা'},{name:'Phultala',bn:'ফুলতলা'},{name:'Rupsa',bn:'রূপসা'},{name:'Sonadanga',bn:'সোনাডাঙ্গা'},{name:'Terokhada',bn:'তেরখাদা'}]},
      { name: 'Jessore', bn: 'যশোর', upazilas: [{name:'Jessore Sadar',bn:'যশোর সদর'},{name:'Abhaynagar',bn:'অভয়নগর'},{name:'Bagherpara',bn:'বাঘারপাড়া'},{name:'Chaugachha',bn:'চৌগাছা'},{name:'Jhikargachha',bn:'ঝিকরগাছা'},{name:'Keshabpur',bn:'কেশবপুর'},{name:'Manirampur',bn:'মনিরামপুর'},{name:'Sharsha',bn:'শার্শা'}]},
    ],
  },
  {
    name: 'Barishal', bn: 'বরিশাল',
    districts: [
      { name: 'Barishal', bn: 'বরিশাল', upazilas: [{name:'Barishal Sadar',bn:'বরিশাল সদর'},{name:'Agailjhara',bn:'আগৈলঝাড়া'},{name:'Babuganj',bn:'বাবুগঞ্জ'},{name:'Bakerganj',bn:'বাকেরগঞ্জ'},{name:'Banaripara',bn:'বানারীপাড়া'},{name:'Gaurnadi',bn:'গৌরনদী'},{name:'Hizla',bn:'হিজলা'},{name:'Mehendiganj',bn:'মেহেন্দিগঞ্জ'},{name:'Muladi',bn:'মুলাদী'},{name:'Wazirpur',bn:'উজিরপুর'}]},
    ],
  },
  {
    name: 'Mymensingh', bn: 'ময়মনসিংহ',
    districts: [
      { name: 'Mymensingh', bn: 'ময়মনসিংহ', upazilas: [{name:'Mymensingh Sadar',bn:'ময়মনসিংহ সদর'},{name:'Bhaluka',bn:'ভালুকা'},{name:'Dhobaura',bn:'ধোবাউড়া'},{name:'Fulbaria',bn:'ফুলবাড়িয়া'},{name:'Gaffargaon',bn:'গফরগাঁও'},{name:'Gauripur',bn:'গৌরীপুর'},{name:'Haluaghat',bn:'হালুয়াঘাট'},{name:'Ishwarganj',bn:'ঈশ্বরগঞ্জ'},{name:'Muktagachha',bn:'মুক্তাগাছা'},{name:'Nandail',bn:'নান্দাইল'},{name:'Phulpur',bn:'ফুলপুর'},{name:'Trishal',bn:'ত্রিশাল'}]},
      { name: 'Netrokona', bn: 'নেত্রকোণা', upazilas: [{name:'Netrokona Sadar',bn:'নেত্রকোণা সদর'},{name:'Atpara',bn:'আটপাড়া'},{name:'Barhatta',bn:'বারহাট্টা'},{name:'Durgapur',bn:'দুর্গাপুর'},{name:'Kalmakanda',bn:'কলমাকান্দা'},{name:'Kendua',bn:'কেন্দুয়া'},{name:'Khaliajuri',bn:'খালিয়াজুরী'},{name:'Madan',bn:'মদন'},{name:'Mohanganj',bn:'মোহনগঞ্জ'},{name:'Purbadhala',bn:'পূর্বধলা'}]},
    ],
  },
];

// Helper: check if a district is Dhaka City Corporation
const DHAKA_CITY_THANAS = new Set([
  'Adabor','Badda','Bangshal','Cantonment','Dhanmondi','Demra','Gulshan',
  'Hazaribagh','Jatrabari','Kafrul','Khilgaon','Khilkhet','Kotwali','Lalbagh',
  'Mirpur','Mohammadpur','Motijheel','Pallabi','Ramna','Rayer Bazar','Sabujbagh',
  'Shah Ali','Shahjahanpur','Sher-e-Bangla Nagar','Shyampur','Sutrapur','Tejgaon',
  'Turag','Uttara','Wari',
]);

export function getDeliveryEstimate(district: string, thana?: string): {
  days: number; minDays: number; maxDays: number;
  zone: 'dhaka_city' | 'dhaka_district' | 'outside_dhaka';
  label: string; charge: number; chargeLabel: string;
} {
  const isDhakaCity = district === 'Dhaka' && (!thana || DHAKA_CITY_THANAS.has(thana));
  const isDhakaDistrict = district === 'Dhaka' && !isDhakaCity;

  if (isDhakaCity) {
    return { days: 1, minDays: 1, maxDays: 2, zone: 'dhaka_city', label: 'Dhaka City', charge: 80, chargeLabel: '৳80' };
  } else if (isDhakaDistrict || ['Gazipur','Narayanganj','Narsingdi'].includes(district)) {
    return { days: 2, minDays: 1, maxDays: 3, zone: 'dhaka_district', label: 'Dhaka Metro Area', charge: 100, chargeLabel: '৳100' };
  } else {
    return { days: 4, minDays: 3, maxDays: 5, zone: 'outside_dhaka', label: 'Outside Dhaka', charge: 120, chargeLabel: '৳120' };
  }
}

export function getAllDistricts(): string[] {
  return BD_LOCATIONS.flatMap(d => d.districts.map(dist => dist.name));
}

export function getUpazilas(districtName: string): Upazila[] {
  for (const div of BD_LOCATIONS) {
    const dist = div.districts.find(d => d.name === districtName);
    if (dist) return dist.upazilas;
  }
  return [];
}
