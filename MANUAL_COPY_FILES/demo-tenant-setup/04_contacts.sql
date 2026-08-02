-- =====================================================================
-- DEMO TENANT SETUP — Script 04: Contacts (heavy)
-- Sellers (T1-T4): 3 anchor buyer companies (Pulse/Complex/Gold) with
--   facility contact persons, 10 industry-relevant filler companies
--   (6 with contact persons), 3 individuals. 25 contacts each.
-- Buyers (T5-T7): the 4 seller companies as vendors (with owner contact
--   persons), 3 internal team members, 2 other vendors. 13 each.
-- contact_number via generate_unique_sequence_for_contact (real RPC).
-- Channels: corporates email+mobile, persons mobile+email, individuals mobile.
-- Office address for every corporate. is_live=true.
-- Fixed UUID scheme (T = tenant ordinal, M/MM = counterpart ordinal):
--   anchors/vendors:      ee000000-0T00-4000-8000-00000000000M
--   anchor/vendor person: ef000000-0T00-4000-8000-00000000000M
--   fillers:              ea000000-0T00-4000-8000-0000000000MM
--   filler persons:       eb000000-0T00-4000-8000-0000000000MM
--   individuals/team:     ec000000-0T00-4000-8000-0000000000MM
-- Idempotent: ON CONFLICT (id) DO NOTHING + NOT EXISTS guards.
-- =====================================================================
DO $$
DECLARE
  c jsonb; i int := 0;
  v_tid uuid; v_cid uuid; v_num text; v_num_json json; v_mobile text; v_email text; v_slug text;
  v_cfg jsonb := '[
    {"t":1,"id":"ee000000-0100-4000-8000-000000000005","ty":"corporate","co":"Pulse Hospital","cls":["client"],"ind":"healthcare","city":"Hyderabad","addr":"Road No 2, Banjara Hills"},
    {"t":1,"id":"ee000000-0100-4000-8000-000000000006","ty":"corporate","co":"Complex Pharma","cls":["client"],"ind":"pharma","city":"Hyderabad","addr":"IDA Pashamylaram, Patancheru"},
    {"t":1,"id":"ee000000-0100-4000-8000-000000000007","ty":"corporate","co":"Gold Fusionn","cls":["client"],"ind":"manufacturing","city":"Chennai","addr":"SIPCOT Industrial Park, Sriperumbudur"},
    {"t":1,"id":"ef000000-0100-4000-8000-000000000005","ty":"contact_person","nm":"Mohan Krishna","des":"Facility Manager","par":"ee000000-0100-4000-8000-000000000005"},
    {"t":1,"id":"ef000000-0100-4000-8000-000000000006","ty":"contact_person","nm":"Ravi Teja","des":"Engineering Head","par":"ee000000-0100-4000-8000-000000000006"},
    {"t":1,"id":"ef000000-0100-4000-8000-000000000007","ty":"contact_person","nm":"Senthil Kumar","des":"Plant Maintenance Manager","par":"ee000000-0100-4000-8000-000000000007"},
    {"t":1,"id":"ea000000-0100-4000-8000-000000000001","ty":"corporate","co":"Orchid Grand Hotel","cls":["client"],"ind":"hospitality","city":"Hyderabad","addr":"Necklace Road"},
    {"t":1,"id":"ea000000-0100-4000-8000-000000000002","ty":"corporate","co":"Medicover Clinics","cls":["client"],"ind":"healthcare","city":"Hyderabad","addr":"Madhapur Main Road"},
    {"t":1,"id":"ea000000-0100-4000-8000-000000000003","ty":"corporate","co":"Sunrise Mall","cls":["client"],"ind":"retail","city":"Secunderabad","addr":"SD Road"},
    {"t":1,"id":"ea000000-0100-4000-8000-000000000004","ty":"corporate","co":"TechPark One","cls":["client"],"ind":"real_estate","city":"Hyderabad","addr":"HITEC City Phase 2"},
    {"t":1,"id":"ea000000-0100-4000-8000-000000000005","ty":"corporate","co":"Krishna Cold Storage","cls":["client"],"ind":"logistics","city":"Medchal","addr":"NH-44 Service Road"},
    {"t":1,"id":"ea000000-0100-4000-8000-000000000006","ty":"corporate","co":"Apex Diagnostics","cls":["client"],"ind":"healthcare","city":"Kukatpally","addr":"KPHB Phase 3"},
    {"t":1,"id":"ea000000-0100-4000-8000-000000000007","ty":"corporate","co":"Delta BPO Towers","cls":["client"],"ind":"technology","city":"Gachibowli","addr":"Financial District"},
    {"t":1,"id":"ea000000-0100-4000-8000-000000000008","ty":"corporate","co":"GreenLeaf Residency","cls":["client"],"ind":"real_estate","city":"Kondapur","addr":"Botanical Garden Road"},
    {"t":1,"id":"ea000000-0100-4000-8000-000000000009","ty":"corporate","co":"Novotel Convention","cls":["client"],"ind":"hospitality","city":"Hyderabad","addr":"HICC Complex, Madhapur"},
    {"t":1,"id":"ea000000-0100-4000-8000-000000000010","ty":"corporate","co":"Sri Vishnu Pharma Labs","cls":["client"],"ind":"pharma","city":"Jeedimetla","addr":"Phase IV, IDA Jeedimetla"},
    {"t":1,"id":"eb000000-0100-4000-8000-000000000001","ty":"contact_person","nm":"Arjun Mehta","des":"Chief Engineer","par":"ea000000-0100-4000-8000-000000000001"},
    {"t":1,"id":"eb000000-0100-4000-8000-000000000002","ty":"contact_person","nm":"Divya Reddy","des":"Admin Manager","par":"ea000000-0100-4000-8000-000000000002"},
    {"t":1,"id":"eb000000-0100-4000-8000-000000000003","ty":"contact_person","nm":"Farhan Ali","des":"Mall Operations Head","par":"ea000000-0100-4000-8000-000000000003"},
    {"t":1,"id":"eb000000-0100-4000-8000-000000000004","ty":"contact_person","nm":"Kiran Rao","des":"Estate Manager","par":"ea000000-0100-4000-8000-000000000004"},
    {"t":1,"id":"eb000000-0100-4000-8000-000000000005","ty":"contact_person","nm":"Prakash Yadav","des":"Stores Head","par":"ea000000-0100-4000-8000-000000000005"},
    {"t":1,"id":"eb000000-0100-4000-8000-000000000006","ty":"contact_person","nm":"Sneha Kapoor","des":"Lab Manager","par":"ea000000-0100-4000-8000-000000000006"},
    {"t":1,"id":"ec000000-0100-4000-8000-000000000001","ty":"individual","nm":"Venkatesh B","des":"MEP Consultant","cls":["partner"]},
    {"t":1,"id":"ec000000-0100-4000-8000-000000000002","ty":"individual","nm":"Ramesh Gupta","des":"Site Engineer","cls":["partner"]},
    {"t":1,"id":"ec000000-0100-4000-8000-000000000003","ty":"individual","nm":"Anita Desai","des":"Procurement Consultant","cls":["partner"]},

    {"t":2,"id":"ee000000-0200-4000-8000-000000000005","ty":"corporate","co":"Pulse Hospital","cls":["client"],"ind":"healthcare","city":"Hyderabad","addr":"Road No 2, Banjara Hills"},
    {"t":2,"id":"ee000000-0200-4000-8000-000000000006","ty":"corporate","co":"Complex Pharma","cls":["client"],"ind":"pharma","city":"Hyderabad","addr":"IDA Pashamylaram, Patancheru"},
    {"t":2,"id":"ee000000-0200-4000-8000-000000000007","ty":"corporate","co":"Gold Fusionn","cls":["client"],"ind":"manufacturing","city":"Chennai","addr":"SIPCOT Industrial Park, Sriperumbudur"},
    {"t":2,"id":"ef000000-0200-4000-8000-000000000005","ty":"contact_person","nm":"Mohan Krishna","des":"Facility Manager","par":"ee000000-0200-4000-8000-000000000005"},
    {"t":2,"id":"ef000000-0200-4000-8000-000000000006","ty":"contact_person","nm":"Ravi Teja","des":"Engineering Head","par":"ee000000-0200-4000-8000-000000000006"},
    {"t":2,"id":"ef000000-0200-4000-8000-000000000007","ty":"contact_person","nm":"Senthil Kumar","des":"Plant Maintenance Manager","par":"ee000000-0200-4000-8000-000000000007"},
    {"t":2,"id":"ea000000-0200-4000-8000-000000000001","ty":"corporate","co":"Skyline Residency Towers","cls":["client"],"ind":"real_estate","city":"Bengaluru","addr":"Sarjapur Road"},
    {"t":2,"id":"ea000000-0200-4000-8000-000000000002","ty":"corporate","co":"Metro Business Center","cls":["client"],"ind":"real_estate","city":"Bengaluru","addr":"MG Road"},
    {"t":2,"id":"ea000000-0200-4000-8000-000000000003","ty":"corporate","co":"City Central Mall","cls":["client"],"ind":"retail","city":"Bengaluru","addr":"Magrath Road"},
    {"t":2,"id":"ea000000-0200-4000-8000-000000000004","ty":"corporate","co":"Lotus Grand Apartments","cls":["client"],"ind":"real_estate","city":"Whitefield","addr":"ITPL Main Road"},
    {"t":2,"id":"ea000000-0200-4000-8000-000000000005","ty":"corporate","co":"Prestige Tech Campus","cls":["client"],"ind":"technology","city":"Bengaluru","addr":"Outer Ring Road, Kadubeesanahalli"},
    {"t":2,"id":"ea000000-0200-4000-8000-000000000006","ty":"corporate","co":"Global Hospital Annex","cls":["client"],"ind":"healthcare","city":"Bengaluru","addr":"Richmond Road"},
    {"t":2,"id":"ea000000-0200-4000-8000-000000000007","ty":"corporate","co":"Imperial Heights","cls":["client"],"ind":"real_estate","city":"Hebbal","addr":"Bellary Road"},
    {"t":2,"id":"ea000000-0200-4000-8000-000000000008","ty":"corporate","co":"Raintree Hotel","cls":["client"],"ind":"hospitality","city":"Bengaluru","addr":"Sankey Road"},
    {"t":2,"id":"ea000000-0200-4000-8000-000000000009","ty":"corporate","co":"SLN Commercial Complex","cls":["client"],"ind":"real_estate","city":"Jayanagar","addr":"4th Block"},
    {"t":2,"id":"ea000000-0200-4000-8000-000000000010","ty":"corporate","co":"MyHome Towers","cls":["client"],"ind":"real_estate","city":"Electronic City","addr":"Phase 1"},
    {"t":2,"id":"eb000000-0200-4000-8000-000000000001","ty":"contact_person","nm":"Naveen Shetty","des":"Society Secretary","par":"ea000000-0200-4000-8000-000000000001"},
    {"t":2,"id":"eb000000-0200-4000-8000-000000000002","ty":"contact_person","nm":"Pooja Iyer","des":"Facility Executive","par":"ea000000-0200-4000-8000-000000000002"},
    {"t":2,"id":"eb000000-0200-4000-8000-000000000003","ty":"contact_person","nm":"Rahul Jain","des":"Mall Manager","par":"ea000000-0200-4000-8000-000000000003"},
    {"t":2,"id":"eb000000-0200-4000-8000-000000000004","ty":"contact_person","nm":"Sandeep Verma","des":"Association President","par":"ea000000-0200-4000-8000-000000000004"},
    {"t":2,"id":"eb000000-0200-4000-8000-000000000005","ty":"contact_person","nm":"Tara Nair","des":"Campus FM Lead","par":"ea000000-0200-4000-8000-000000000005"},
    {"t":2,"id":"eb000000-0200-4000-8000-000000000006","ty":"contact_person","nm":"Uday Bhaskar","des":"Biomedical Officer","par":"ea000000-0200-4000-8000-000000000006"},
    {"t":2,"id":"ec000000-0200-4000-8000-000000000001","ty":"individual","nm":"Girish Rao","des":"Lift Consultant","cls":["partner"]},
    {"t":2,"id":"ec000000-0200-4000-8000-000000000002","ty":"individual","nm":"Mahesh P","des":"AMC Auditor","cls":["partner"]},
    {"t":2,"id":"ec000000-0200-4000-8000-000000000003","ty":"individual","nm":"Shweta Kulkarni","des":"Procurement Head","cls":["partner"]},

    {"t":3,"id":"ee000000-0300-4000-8000-000000000005","ty":"corporate","co":"Pulse Hospital","cls":["client"],"ind":"healthcare","city":"Hyderabad","addr":"Road No 2, Banjara Hills"},
    {"t":3,"id":"ee000000-0300-4000-8000-000000000006","ty":"corporate","co":"Complex Pharma","cls":["client"],"ind":"pharma","city":"Hyderabad","addr":"IDA Pashamylaram, Patancheru"},
    {"t":3,"id":"ee000000-0300-4000-8000-000000000007","ty":"corporate","co":"Gold Fusionn","cls":["client"],"ind":"manufacturing","city":"Chennai","addr":"SIPCOT Industrial Park, Sriperumbudur"},
    {"t":3,"id":"ef000000-0300-4000-8000-000000000005","ty":"contact_person","nm":"Mohan Krishna","des":"Facility Manager","par":"ee000000-0300-4000-8000-000000000005"},
    {"t":3,"id":"ef000000-0300-4000-8000-000000000006","ty":"contact_person","nm":"Ravi Teja","des":"Engineering Head","par":"ee000000-0300-4000-8000-000000000006"},
    {"t":3,"id":"ef000000-0300-4000-8000-000000000007","ty":"contact_person","nm":"Senthil Kumar","des":"Plant Maintenance Manager","par":"ee000000-0300-4000-8000-000000000007"},
    {"t":3,"id":"ea000000-0300-4000-8000-000000000001","ty":"corporate","co":"Spice Garden Restaurants","cls":["client"],"ind":"hospitality","city":"Pune","addr":"FC Road"},
    {"t":3,"id":"ea000000-0300-4000-8000-000000000002","ty":"corporate","co":"Grand Kakatiya Hotel","cls":["client"],"ind":"hospitality","city":"Pune","addr":"Senapati Bapat Road"},
    {"t":3,"id":"ea000000-0300-4000-8000-000000000003","ty":"corporate","co":"FreshMart Supermarkets","cls":["client"],"ind":"retail","city":"Pune","addr":"Aundh"},
    {"t":3,"id":"ea000000-0300-4000-8000-000000000004","ty":"corporate","co":"Sunshine International School","cls":["client"],"ind":"education","city":"Pune","addr":"Baner Road"},
    {"t":3,"id":"ea000000-0300-4000-8000-000000000005","ty":"corporate","co":"Ananta Warehousing","cls":["client"],"ind":"logistics","city":"Chakan","addr":"MIDC Phase 2"},
    {"t":3,"id":"ea000000-0300-4000-8000-000000000006","ty":"corporate","co":"Green Meadows Villas","cls":["client"],"ind":"real_estate","city":"Wagholi","addr":"Nagar Road"},
    {"t":3,"id":"ea000000-0300-4000-8000-000000000007","ty":"corporate","co":"Krishna Rice Mills","cls":["client"],"ind":"manufacturing","city":"Baramati","addr":"MIDC Area"},
    {"t":3,"id":"ea000000-0300-4000-8000-000000000008","ty":"corporate","co":"MedPlus Distribution Center","cls":["client"],"ind":"pharma","city":"Pune","addr":"Hadapsar Industrial Estate"},
    {"t":3,"id":"ea000000-0300-4000-8000-000000000009","ty":"corporate","co":"Bella Vista Resort","cls":["client"],"ind":"hospitality","city":"Lonavala","addr":"Old Mumbai Highway"},
    {"t":3,"id":"ea000000-0300-4000-8000-000000000010","ty":"corporate","co":"Corniche Business Center","cls":["client"],"ind":"real_estate","city":"Pune","addr":"Koregaon Park"},
    {"t":3,"id":"eb000000-0300-4000-8000-000000000001","ty":"contact_person","nm":"Aditya Kulkarni","des":"F&B Manager","par":"ea000000-0300-4000-8000-000000000001"},
    {"t":3,"id":"eb000000-0300-4000-8000-000000000002","ty":"contact_person","nm":"Bhavana Joshi","des":"Housekeeping Head","par":"ea000000-0300-4000-8000-000000000002"},
    {"t":3,"id":"eb000000-0300-4000-8000-000000000003","ty":"contact_person","nm":"Chetan Patil","des":"Store Manager","par":"ea000000-0300-4000-8000-000000000003"},
    {"t":3,"id":"eb000000-0300-4000-8000-000000000004","ty":"contact_person","nm":"Deepa Menon","des":"School Administrator","par":"ea000000-0300-4000-8000-000000000004"},
    {"t":3,"id":"eb000000-0300-4000-8000-000000000005","ty":"contact_person","nm":"Eshwar Rao","des":"Warehouse Manager","par":"ea000000-0300-4000-8000-000000000005"},
    {"t":3,"id":"eb000000-0300-4000-8000-000000000006","ty":"contact_person","nm":"Firoz Khan","des":"Estate Supervisor","par":"ea000000-0300-4000-8000-000000000006"},
    {"t":3,"id":"ec000000-0300-4000-8000-000000000001","ty":"individual","nm":"Ganesh Bhosale","des":"Food Safety Auditor","cls":["partner"]},
    {"t":3,"id":"ec000000-0300-4000-8000-000000000002","ty":"individual","nm":"Hema Latha","des":"Community Manager","cls":["partner"]},
    {"t":3,"id":"ec000000-0300-4000-8000-000000000003","ty":"individual","nm":"Irfan Sayyed","des":"Procurement Officer","cls":["partner"]},

    {"t":4,"id":"ee000000-0400-4000-8000-000000000005","ty":"corporate","co":"Pulse Hospital","cls":["client"],"ind":"healthcare","city":"Hyderabad","addr":"Road No 2, Banjara Hills"},
    {"t":4,"id":"ee000000-0400-4000-8000-000000000006","ty":"corporate","co":"Complex Pharma","cls":["client"],"ind":"pharma","city":"Hyderabad","addr":"IDA Pashamylaram, Patancheru"},
    {"t":4,"id":"ee000000-0400-4000-8000-000000000007","ty":"corporate","co":"Gold Fusionn","cls":["client"],"ind":"manufacturing","city":"Chennai","addr":"SIPCOT Industrial Park, Sriperumbudur"},
    {"t":4,"id":"ef000000-0400-4000-8000-000000000005","ty":"contact_person","nm":"Mohan Krishna","des":"Facility Manager","par":"ee000000-0400-4000-8000-000000000005"},
    {"t":4,"id":"ef000000-0400-4000-8000-000000000006","ty":"contact_person","nm":"Ravi Teja","des":"Engineering Head","par":"ee000000-0400-4000-8000-000000000006"},
    {"t":4,"id":"ef000000-0400-4000-8000-000000000007","ty":"contact_person","nm":"Senthil Kumar","des":"Plant Maintenance Manager","par":"ee000000-0400-4000-8000-000000000007"},
    {"t":4,"id":"ea000000-0400-4000-8000-000000000001","ty":"corporate","co":"Landmark Towers","cls":["client"],"ind":"real_estate","city":"Chennai","addr":"Anna Salai"},
    {"t":4,"id":"ea000000-0400-4000-8000-000000000002","ty":"corporate","co":"Apollo Clinic Kilpauk","cls":["client"],"ind":"healthcare","city":"Chennai","addr":"Kilpauk Garden Road"},
    {"t":4,"id":"ea000000-0400-4000-8000-000000000003","ty":"corporate","co":"Chennai One IT Park","cls":["client"],"ind":"technology","city":"Chennai","addr":"Thoraipakkam, OMR"},
    {"t":4,"id":"ea000000-0400-4000-8000-000000000004","ty":"corporate","co":"Trident Business Hotel","cls":["client"],"ind":"hospitality","city":"Chennai","addr":"GST Road, Meenambakkam"},
    {"t":4,"id":"ea000000-0400-4000-8000-000000000005","ty":"corporate","co":"SRM College Block","cls":["client"],"ind":"education","city":"Kattankulathur","addr":"SRM Nagar"},
    {"t":4,"id":"ea000000-0400-4000-8000-000000000006","ty":"corporate","co":"Marina Bay Offices","cls":["client"],"ind":"real_estate","city":"Chennai","addr":"Santhome High Road"},
    {"t":4,"id":"ea000000-0400-4000-8000-000000000007","ty":"corporate","co":"Ceebros Corporate House","cls":["client"],"ind":"real_estate","city":"Chennai","addr":"Teynampet"},
    {"t":4,"id":"ea000000-0400-4000-8000-000000000008","ty":"corporate","co":"VGP Commercial Center","cls":["client"],"ind":"retail","city":"Chennai","addr":"ECR Injambakkam"},
    {"t":4,"id":"ea000000-0400-4000-8000-000000000009","ty":"corporate","co":"Olympia Tech Square","cls":["client"],"ind":"technology","city":"Guindy","addr":"SIDCO Industrial Estate"},
    {"t":4,"id":"ea000000-0400-4000-8000-000000000010","ty":"corporate","co":"Kauvery Medical Center","cls":["client"],"ind":"healthcare","city":"Chennai","addr":"Alwarpet"},
    {"t":4,"id":"eb000000-0400-4000-8000-000000000001","ty":"contact_person","nm":"Jayanthi R","des":"Admin Head","par":"ea000000-0400-4000-8000-000000000001"},
    {"t":4,"id":"eb000000-0400-4000-8000-000000000002","ty":"contact_person","nm":"Karthik Subramanian","des":"Clinic Manager","par":"ea000000-0400-4000-8000-000000000002"},
    {"t":4,"id":"eb000000-0400-4000-8000-000000000003","ty":"contact_person","nm":"Lavanya Devi","des":"Park Operations Lead","par":"ea000000-0400-4000-8000-000000000003"},
    {"t":4,"id":"eb000000-0400-4000-8000-000000000004","ty":"contact_person","nm":"Manoj Pillai","des":"Hotel Duty Manager","par":"ea000000-0400-4000-8000-000000000004"},
    {"t":4,"id":"eb000000-0400-4000-8000-000000000005","ty":"contact_person","nm":"Nithya Shree","des":"College Estate Officer","par":"ea000000-0400-4000-8000-000000000005"},
    {"t":4,"id":"eb000000-0400-4000-8000-000000000006","ty":"contact_person","nm":"Prabhu Dev","des":"Office Manager","par":"ea000000-0400-4000-8000-000000000006"},
    {"t":4,"id":"ec000000-0400-4000-8000-000000000001","ty":"individual","nm":"Ramya Krishnan","des":"Hygiene Auditor","cls":["partner"]},
    {"t":4,"id":"ec000000-0400-4000-8000-000000000002","ty":"individual","nm":"Saravanan M","des":"Facility Consultant","cls":["partner"]},
    {"t":4,"id":"ec000000-0400-4000-8000-000000000003","ty":"individual","nm":"Uma Maheswari","des":"Vendor Coordinator","cls":["partner"]},

    {"t":5,"id":"ee000000-0500-4000-8000-000000000001","ty":"corporate","co":"Trinity Tecnitions","cls":["vendor"],"ind":"hvac","city":"Hyderabad","addr":"Plot 42, Balanagar Industrial Area"},
    {"t":5,"id":"ee000000-0500-4000-8000-000000000002","ty":"corporate","co":"Value Elevators","cls":["vendor"],"ind":"lifts_elevators","city":"Bengaluru","addr":"18/2, Hosur Main Road, Bommanahalli"},
    {"t":5,"id":"ee000000-0500-4000-8000-000000000003","ty":"corporate","co":"Freedom Services","cls":["vendor"],"ind":"facility_management","city":"Pune","addr":"Office 7, Wakdewadi, Shivajinagar"},
    {"t":5,"id":"ee000000-0500-4000-8000-000000000004","ty":"corporate","co":"Hygene Services","cls":["vendor"],"ind":"facility_management","city":"Chennai","addr":"No 96, Mount Road, Guindy"},
    {"t":5,"id":"ef000000-0500-4000-8000-000000000001","ty":"contact_person","nm":"Rajesh Kumar","des":"Proprietor","par":"ee000000-0500-4000-8000-000000000001"},
    {"t":5,"id":"ef000000-0500-4000-8000-000000000002","ty":"contact_person","nm":"Suresh Menon","des":"Managing Partner","par":"ee000000-0500-4000-8000-000000000002"},
    {"t":5,"id":"ef000000-0500-4000-8000-000000000003","ty":"contact_person","nm":"Imran Shaikh","des":"Proprietor","par":"ee000000-0500-4000-8000-000000000003"},
    {"t":5,"id":"ef000000-0500-4000-8000-000000000004","ty":"contact_person","nm":"Lakshmi Nair","des":"Director","par":"ee000000-0500-4000-8000-000000000004"},
    {"t":5,"id":"ec000000-0500-4000-8000-000000000001","ty":"individual","nm":"Mohan Krishna","des":"Facility Manager","cls":["team_member"]},
    {"t":5,"id":"ec000000-0500-4000-8000-000000000002","ty":"individual","nm":"Dr. Kavitha Rani","des":"Medical Superintendent","cls":["team_member"]},
    {"t":5,"id":"ec000000-0500-4000-8000-000000000003","ty":"individual","nm":"Suman Reddy","des":"Biomedical Engineer","cls":["team_member"]},
    {"t":5,"id":"ea000000-0500-4000-8000-000000000001","ty":"corporate","co":"MedGas Solutions","cls":["vendor"],"ind":"healthcare","city":"Hyderabad","addr":"Moosapet"},
    {"t":5,"id":"ea000000-0500-4000-8000-000000000002","ty":"corporate","co":"BioWaste Care","cls":["vendor"],"ind":"healthcare","city":"Hyderabad","addr":"Kattedan"},

    {"t":6,"id":"ee000000-0600-4000-8000-000000000001","ty":"corporate","co":"Trinity Tecnitions","cls":["vendor"],"ind":"hvac","city":"Hyderabad","addr":"Plot 42, Balanagar Industrial Area"},
    {"t":6,"id":"ee000000-0600-4000-8000-000000000002","ty":"corporate","co":"Value Elevators","cls":["vendor"],"ind":"lifts_elevators","city":"Bengaluru","addr":"18/2, Hosur Main Road, Bommanahalli"},
    {"t":6,"id":"ee000000-0600-4000-8000-000000000003","ty":"corporate","co":"Freedom Services","cls":["vendor"],"ind":"facility_management","city":"Pune","addr":"Office 7, Wakdewadi, Shivajinagar"},
    {"t":6,"id":"ee000000-0600-4000-8000-000000000004","ty":"corporate","co":"Hygene Services","cls":["vendor"],"ind":"facility_management","city":"Chennai","addr":"No 96, Mount Road, Guindy"},
    {"t":6,"id":"ef000000-0600-4000-8000-000000000001","ty":"contact_person","nm":"Rajesh Kumar","des":"Proprietor","par":"ee000000-0600-4000-8000-000000000001"},
    {"t":6,"id":"ef000000-0600-4000-8000-000000000002","ty":"contact_person","nm":"Suresh Menon","des":"Managing Partner","par":"ee000000-0600-4000-8000-000000000002"},
    {"t":6,"id":"ef000000-0600-4000-8000-000000000003","ty":"contact_person","nm":"Imran Shaikh","des":"Proprietor","par":"ee000000-0600-4000-8000-000000000003"},
    {"t":6,"id":"ef000000-0600-4000-8000-000000000004","ty":"contact_person","nm":"Lakshmi Nair","des":"Director","par":"ee000000-0600-4000-8000-000000000004"},
    {"t":6,"id":"ec000000-0600-4000-8000-000000000001","ty":"individual","nm":"Ravi Teja","des":"Engineering Head","cls":["team_member"]},
    {"t":6,"id":"ec000000-0600-4000-8000-000000000002","ty":"individual","nm":"Dr. Nagesh Kumar","des":"QA Head","cls":["team_member"]},
    {"t":6,"id":"ec000000-0600-4000-8000-000000000003","ty":"individual","nm":"Swapna M","des":"Utilities Engineer","cls":["team_member"]},
    {"t":6,"id":"ea000000-0600-4000-8000-000000000001","ty":"corporate","co":"CalibLab Services","cls":["vendor"],"ind":"pharma","city":"Hyderabad","addr":"Bollaram"},
    {"t":6,"id":"ea000000-0600-4000-8000-000000000002","ty":"corporate","co":"Qualichem Suppliers","cls":["vendor"],"ind":"pharma","city":"Hyderabad","addr":"Kukatpally"},

    {"t":7,"id":"ee000000-0700-4000-8000-000000000001","ty":"corporate","co":"Trinity Tecnitions","cls":["vendor"],"ind":"hvac","city":"Hyderabad","addr":"Plot 42, Balanagar Industrial Area"},
    {"t":7,"id":"ee000000-0700-4000-8000-000000000002","ty":"corporate","co":"Value Elevators","cls":["vendor"],"ind":"lifts_elevators","city":"Bengaluru","addr":"18/2, Hosur Main Road, Bommanahalli"},
    {"t":7,"id":"ee000000-0700-4000-8000-000000000003","ty":"corporate","co":"Freedom Services","cls":["vendor"],"ind":"facility_management","city":"Pune","addr":"Office 7, Wakdewadi, Shivajinagar"},
    {"t":7,"id":"ee000000-0700-4000-8000-000000000004","ty":"corporate","co":"Hygene Services","cls":["vendor"],"ind":"facility_management","city":"Chennai","addr":"No 96, Mount Road, Guindy"},
    {"t":7,"id":"ef000000-0700-4000-8000-000000000001","ty":"contact_person","nm":"Rajesh Kumar","des":"Proprietor","par":"ee000000-0700-4000-8000-000000000001"},
    {"t":7,"id":"ef000000-0700-4000-8000-000000000002","ty":"contact_person","nm":"Suresh Menon","des":"Managing Partner","par":"ee000000-0700-4000-8000-000000000002"},
    {"t":7,"id":"ef000000-0700-4000-8000-000000000003","ty":"contact_person","nm":"Imran Shaikh","des":"Proprietor","par":"ee000000-0700-4000-8000-000000000003"},
    {"t":7,"id":"ef000000-0700-4000-8000-000000000004","ty":"contact_person","nm":"Lakshmi Nair","des":"Director","par":"ee000000-0700-4000-8000-000000000004"},
    {"t":7,"id":"ec000000-0700-4000-8000-000000000001","ty":"individual","nm":"Senthil Kumar","des":"Plant Maintenance Manager","cls":["team_member"]},
    {"t":7,"id":"ec000000-0700-4000-8000-000000000002","ty":"individual","nm":"Meena Rani","des":"EHS Officer","cls":["team_member"]},
    {"t":7,"id":"ec000000-0700-4000-8000-000000000003","ty":"individual","nm":"Arun Prasad","des":"Production Head","cls":["team_member"]},
    {"t":7,"id":"ea000000-0700-4000-8000-000000000001","ty":"corporate","co":"ToolCraft Services","cls":["vendor"],"ind":"manufacturing","city":"Chennai","addr":"Ambattur Industrial Estate"},
    {"t":7,"id":"ea000000-0700-4000-8000-000000000002","ty":"corporate","co":"SafetyFirst PPE","cls":["vendor"],"ind":"manufacturing","city":"Chennai","addr":"Padi"}
  ]'::jsonb;
BEGIN
  FOR c IN SELECT * FROM jsonb_array_elements(v_cfg) LOOP
    i := i + 1;
    v_tid := ('c0000000-0000-4000-8000-00000000000' || (c->>'t'))::uuid;
    v_cid := (c->>'id')::uuid;

    IF EXISTS (SELECT 1 FROM t_contacts e WHERE e.id = v_cid) THEN CONTINUE; END IF;

    -- RPC returns json: {"formatted":"CT-1001", ...}
    v_num_json := generate_unique_sequence_for_contact(v_tid, true);
    v_num := v_num_json->>'formatted';
    v_mobile := '98' || lpad((66100000 + i)::text, 8, '0');
    v_slug := regexp_replace(lower(coalesce(c->>'co', c->>'nm')), '[^a-z]', '', 'g');
    v_email := CASE
      WHEN c->>'ty' = 'corporate' THEN 'contact@' || v_slug || '.in'
      WHEN c->>'ty' = 'contact_person' THEN
        regexp_replace(lower(c->>'nm'), '[^a-z]+', '.', 'g') || '@' ||
        (SELECT regexp_replace(lower(p.company_name), '[^a-z]', '', 'g') FROM t_contacts p WHERE p.id = (c->>'par')::uuid) || '.in'
      ELSE regexp_replace(lower(c->>'nm'), '[^a-z]+', '.', 'g') || '@gmail.com'
    END;

    INSERT INTO t_contacts (
      id, tenant_id, type, status, name, company_name, designation,
      is_primary_contact, parent_contact_id, parent_contact_ids,
      classifications, tags, industries, contact_number, source, is_live, is_seed, is_active
    ) VALUES (
      v_cid, v_tid, c->>'ty', 'active',
      CASE WHEN c->>'ty' = 'corporate' THEN NULL ELSE c->>'nm' END,
      CASE WHEN c->>'ty' = 'corporate' THEN c->>'co' ELSE NULL END,
      c->>'des',
      (c->>'ty' = 'contact_person'),
      (c->>'par')::uuid,
      CASE WHEN c->>'par' IS NOT NULL THEN jsonb_build_array(c->>'par') ELSE '[]'::jsonb END,
      COALESCE(c->'cls', '[]'::jsonb), '[]'::jsonb,
      CASE WHEN c->>'ind' IS NOT NULL THEN jsonb_build_array(c->>'ind') ELSE '[]'::jsonb END,
      v_num, 'demo-setup', true, false, true
    );

    -- channels
    INSERT INTO t_contact_channels (id, contact_id, channel_type, value, country_code, is_primary, is_verified)
    VALUES (gen_random_uuid(), v_cid, 'email', v_email, NULL, (c->>'ty') = 'corporate', false);
    INSERT INTO t_contact_channels (id, contact_id, channel_type, value, country_code, is_primary, is_verified)
    VALUES (gen_random_uuid(), v_cid, 'mobile', '+91' || v_mobile, '+91', (c->>'ty') <> 'corporate', false);

    -- office address for corporates
    IF c->>'ty' = 'corporate' THEN
      INSERT INTO t_contact_addresses (id, contact_id, type, label, address_line1, city, country_code, postal_code, is_primary)
      VALUES (gen_random_uuid(), v_cid, 'office', 'Registered Office', c->>'addr', c->>'city', 'IN', NULL, true);
    END IF;
  END LOOP;
END $$;
