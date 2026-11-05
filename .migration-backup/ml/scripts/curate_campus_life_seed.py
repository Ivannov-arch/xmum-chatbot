"""Curate campus_life seed rows after automated CSV extraction.

Run from the repository root:
    python ml/scripts/curate_campus_life_seed.py

The extraction pipeline already imports many rows, but some rows land in a
broad or wrong sub-intent. This script keeps those fixes reproducible and adds
natural long-form Q&A variants for common campus-life questions.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any


SEED_PATH = Path(__file__).resolve().parents[1] / "database" / "seeds" / "campus_life.json"
CJK_RE = re.compile(r"[\u3400-\u9fff]")


QUESTION_SUB_INTENT_OVERRIDES = {
    "What security precautions does the University take on campus?": "hostel_rules_maintenance",
    "Do students need to observe any curfew regulation?": "hostel_rules_maintenance",
    "What kind of sports facilities does XMUM provide?": "facilities_services",
    "In an event of an emergency, who should be contacted?": "health_safety",
    "What learning services are provided by the Xiamen University Malaysia Library?": "library",
    "How do students log in to the campus WIFI?": "it_connectivity",
    "Where should students go for Lost and Found items?": "documents_identity",
    "How can students make an appointment with the Counselling Centre?": "health_safety",
    "What are the contact details and office hours for the Counselling Centre?": "health_safety",
    "What are the parking regulations on campus?": "facilities_services",
    "What are the penalties for parking violations?": "facilities_services",
    "What are the emergency contact numbers for Police Stations near XMUM?": "health_safety",
    "What are the emergency contact numbers for Fire Brigades near XMUM?": "health_safety",
    "What are the emergency helplines on campus?": "health_safety",
    "What types of sports facilities are available at XMUM?": "facilities_services",
    "What are the operation hours for the gymnasium?": "facilities_services",
    "What are the operation hours for the swimming pool?": "facilities_services",
    "What are some key rules for using the XMUM swimming pool?": "facilities_services",
    "What medical services are available on-campus?": "health_safety",
    "What is the curfew for student residences?": "hostel_rules_maintenance",
    "What are the rules for self-service laundry rooms?": "hostel_rules_maintenance",
}


QUESTION_FIELD_OVERRIDES: dict[str, dict[str, Any]] = {
    "How can students request maintenance services?": {
        "sub_intent": "hostel_rules_maintenance",
        "answer": (
            "Students should submit maintenance reports through AskA Maintenance at "
            "https://app.xmu.edu.my/Maintenance/?p=6. Use the form to report room "
            "or campus defects and provide clear details. For urgent issues, contact "
            "the Maintenance Hotline at 017-313 5947."
        ),
        "keywords": [
            "maintenance",
            "repair",
            "defect",
            "aska maintenance",
            "maintenance form",
            "maintenance request",
            "report defect",
            "repair request",
            "repair form",
            "maintenance website",
            "017-313 5947",
        ],
    },
    "What kind of sports facilities does XMUM provide?": {
        "sub_intent": "facilities_services",
        "answer": (
            "XMUM sports and recreational facilities include the gym on the 3rd floor "
            "of Building B1 (Student Activity Centre), the Indoor Sport Centre and "
            "Yoga Room in Building B1, an Olympic-sized swimming pool, and a stadium "
            "with a football field and running track. The gym is equipped with cardio "
            "machines such as treadmills, weights, and weight machines, and is open "
            "to all students and staff."
        ),
        "keywords": [
            "sport",
            "sports",
            "sports facilities",
            "gym",
            "gymnasium",
            "student activity centre",
            "b1",
            "indoor sport centre",
            "yoga room",
            "swimming pool",
            "stadium",
            "football field",
            "running track",
        ],
    },
    "What types of sports facilities are available at XMUM?": {
        "sub_intent": "facilities_services",
        "answer": (
            "XMUM sports and recreational facilities include the gym on the 3rd floor "
            "of Building B1 (Student Activity Centre), the Indoor Sport Centre and "
            "Yoga Room in Building B1, an Olympic-sized swimming pool, and a stadium "
            "with a football field and running track. The gym is equipped with cardio "
            "machines such as treadmills, weights, and weight machines, and is open "
            "to all students and staff."
        ),
        "keywords": [
            "sport",
            "sports",
            "sports facilities",
            "gym",
            "gymnasium",
            "student activity centre",
            "b1",
            "indoor sport centre",
            "yoga room",
            "swimming pool",
            "stadium",
            "football field",
            "running track",
        ],
    },
    "What are the operation hours for the gymnasium?": {
        "sub_intent": "facilities_services",
        "answer": (
            "The XMUM gym is located on the 3rd floor of Building B1 (Student "
            "Activity Centre). It is open Monday to Sunday from 08:30 to 22:30 "
            "and is available to all students and staff."
        ),
        "keywords": [
            "gym",
            "gymnasium",
            "gym hours",
            "gymnasium hours",
            "operating hours",
            "opening hours",
            "student activity centre",
            "b1",
        ],
    },
    "What are the operation hours for the swimming pool?": {
        "sub_intent": "facilities_services",
        "answer": (
            "The XMUM swimming pool is an Olympic-sized on-campus pool in Building "
            "B1 (Student Activity Centre). It is free and available only to registered "
            "students and staff. Opening hours are Tuesday to Sunday, 4:00 pm to "
            "10:00 pm. It is closed on Monday and public holidays."
        ),
        "keywords": [
            "swimming pool",
            "pool",
            "swimming pool hours",
            "pool hours",
            "pool location",
            "student activity centre",
            "b1",
            "free swimming pool",
        ],
    },
    "What are some key rules for using the XMUM swimming pool?": {
        "sub_intent": "facilities_services",
        "answer": (
            "Use the swimming pool only during official opening hours and when a "
            "lifeguard is on duty. Proper swimming attire is required. Food, drinks, "
            "pets, running, rough play, excessive noise, and spitting are not allowed. "
            "Users with infectious diseases or open wounds must not enter the pool."
        ),
        "keywords": [
            "swimming pool rules",
            "pool rules",
            "lifeguard",
            "swimming attire",
            "pool safety",
            "pool regulation",
        ],
    },
    "Where can students get medical assistance?": {
        "sub_intent": "health_safety",
        "answer": (
            "Students can visit Plux Health Clinic at Block B1 Ground Floor, Unit "
            "G11, for general healthcare, consultations, and routine check-ups. For "
            "urgent campus emergencies, call 019-348 9999. For mental health support, "
            "the Counselling Centre is in Room B1-110."
        ),
        "keywords": [
            "medical assistance",
            "clinic",
            "plux health clinic",
            "b1 g11",
            "doctor",
            "consultation",
            "counselling centre",
            "b1-110",
        ],
    },
    "What medical services are available on-campus?": {
        "sub_intent": "health_safety",
        "answer": (
            "On-campus medical support is available at Plux Health Clinic, Block B1 "
            "Ground Floor, Unit G11. It provides general healthcare, consultations, "
            "and routine medical check-ups. For urgent emergencies, call 019-348 9999."
        ),
        "keywords": [
            "medical services",
            "on-campus clinic",
            "plux health clinic",
            "b1 g11",
            "healthcare",
            "medical check-up",
            "emergency helpline",
        ],
    },
    "In an event of an emergency, who should be contacted?": {
        "sub_intent": "health_safety",
        "answer": (
            "For campus emergencies, call the 24-hour Security Hotline at 019-348 "
            "9999 or 019-295 9998. You can also email security@xmu.edu.my. For "
            "non-office-hour residence support, call the Assistant Warden Hotline "
            "at 013-517 6801 or 013-917 6801. For maintenance emergencies, call "
            "017-313 5947."
        ),
        "keywords": [
            "emergency",
            "emergency hotline",
            "security hotline",
            "security email",
            "assistant warden",
            "warden hotline",
            "maintenance hotline",
            "019-348 9999",
            "019-295 9998",
        ],
    },
    "What are the emergency helplines on campus?": {
        "sub_intent": "health_safety",
        "answer": (
            "Campus emergency contacts: Security Hotline 019-348 9999 or 019-295 "
            "9998; security@xmu.edu.my; Assistant Warden Hotline 013-517 6801 or "
            "013-917 6801 for non-office-hour residence matters; Maintenance Hotline "
            "017-313 5947."
        ),
        "keywords": [
            "emergency helplines",
            "security hotline",
            "security email",
            "assistant warden hotline",
            "maintenance hotline",
            "019-348 9999",
            "019-295 9998",
        ],
    },
    "Where should students go for Lost and Found items?": {
        "sub_intent": "documents_identity",
        "answer": (
            "Lost and Found is handled by the Student Helpdesk. Visit during standard "
            "office hours, usually Monday to Friday, 8:30 am to 5:30 pm, or call "
            "03-8800 6800 for general enquiries."
        ),
        "keywords": [
            "lost and found",
            "lost item",
            "found item",
            "student helpdesk",
            "office hours",
            "03-8800 6800",
        ],
    },
    "Where can students report lost items or inquire about found items?": {
        "sub_intent": "documents_identity",
        "answer": (
            "Report lost items or ask about found items at the Student Helpdesk. "
            "Office hours are usually Monday to Friday, 8:30 am to 5:30 pm. For "
            "general enquiries, call 03-8800 6800."
        ),
        "keywords": [
            "lost item",
            "found item",
            "lost and found",
            "student helpdesk",
            "03-8800 6800",
        ],
    },
    "What are the parking regulations on campus?": {
        "sub_intent": "facilities_services",
        "answer": (
            "Students who bring a car or motorcycle to campus must register the "
            "vehicle with the Student Affairs Office and park only in designated "
            "student parking areas. Visitors should register or obtain approval on "
            "arrival, follow security instructions, and park only in visitor or "
            "permitted bays."
        ),
        "keywords": [
            "parking",
            "parking regulations",
            "vehicle registration",
            "student parking",
            "visitor parking",
            "student affairs office",
            "parking sticker",
        ],
    },
}


ADDITIONAL_ROWS: list[dict[str, Any]] = [
    {
        "module": "campus_life",
        "sub_intent": "hostel_rules_maintenance",
        "question": "I am staying in the hostel and something in my room is broken. How do I request maintenance?",
        "answer": "Students should submit maintenance reports through AskA Maintenance at https://app.xmu.edu.my/Maintenance/?p=6. Use the form to report room or campus defects and provide clear details. For urgent issues, contact the Maintenance Hotline at 017-313 5947.",
        "keywords": [
            "hostel maintenance",
            "broken light",
            "room repair",
            "defect",
            "maintenance request",
            "aska maintenance",
            "maintenance hotline",
            "repair request",
            "report defect",
            "https://app.xmu.edu.my/maintenance/?p=6",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "hostel_rules_maintenance",
        "question": "What should I do if I need to leave or return to the residence after midnight?",
        "answer": "The residence curfew is 12:00 am. Residents who wish to leave or return after 12:00 am must report at the guardhouse with their student ID.",
        "keywords": [
            "curfew",
            "after midnight",
            "12:00 am",
            "guardhouse",
            "student id",
            "residence rules",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "documents_identity",
        "question": "I lost my Campus ID or student card. What should I do?",
        "answer": "Students should email or visit B1-107, Student Affairs Office, to report a lost Campus/Student ID. After reporting, proceed to make payment at the Finance Office before submitting the card replacement form to IT. A lost card fee of RM30 applies unless the card is stolen with a police report, damaged, or no longer works.",
        "keywords": [
            "lost card",
            "student card",
            "campus id",
            "student id",
            "ecard replacement",
            "b1-107",
            "rm30",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "documents_identity",
        "question": "Where can I use my Campus ECard?",
        "answer": "The Campus ECard can be used in canteens, supermarkets, and for Library fine payments. The Campus ID and password can also be used for services such as book borrowing, self-service printing, door access, discussion room booking, VPN access, Moodle, Academic Affairs Online Systems, the student portal, and Turnitin.",
        "keywords": [
            "campus ecard",
            "ecard",
            "canteen",
            "supermarket",
            "library fine",
            "self-service printing",
            "door access",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "library",
        "question": "Where can I print documents on campus or in the library?",
        "answer": "Library learning services include Computers and Printing. Students can also use their Campus ID and Campus ID password for self-service printing.",
        "keywords": [
            "printing",
            "print documents",
            "self-service printing",
            "library",
            "computer",
            "campus id",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "food_dining",
        "question": "Are there halal, vegetarian, or other food options at the canteen?",
        "answer": "For Muslim-friendly or pork-free options, the attached cafeteria list includes Sapid (B1 G04, Middle East), Restea (B1 G05, Asian), Astana Restaurant (B1 G06, Central Asian), Poke Bowl Rice (B1 G07), Takwa Mee Tarik (D6 105, Chinese Muslim), Uniq Arabura (D6 201, Middle East/Asian), Mad Plate Express (LY3 107, Japanese hot plate), and several LY3 2F options such as Idaten Garden (Vegetarian), Lanzhou Ramen, Living Ginza Sushi & Bento, and Chiba (Japanese). For strict halal requirements, students should verify directly with the stall.",
        "keywords": [
            "halal food",
            "muslim friendly",
            "muslim-friendly",
            "pork free",
            "pork-free",
            "vegetarian",
            "vegan",
            "canteen",
            "cafeteria",
            "food options",
            "where to eat",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "food_dining",
        "question": "What are the regular operation hours, off days, and locations for XMUM cafeteria stalls?",
        "answer": (
            "Regular cafeteria information: "
            "B1 G04 Sapid (Middle East): 09:00am - 09:00pm Mon-Fri, 10:00am - 09:00pm Sat-Sun, off day none. "
            "B1 G05 Restea (Asian): 10:00am - 10:00pm Mon-Fri, 10:00am - 09:00pm Sat-Sun, off day none. "
            "B1 G06 Astana Restaurant (Central Asian): 11:00am - 10:00pm, off Saturday. "
            "B1 G07 Poke Bowl Rice: 10:00am - 08:00pm, off Saturday. "
            "B1 G08 Zone U Bakery: 07:00am - 07:00pm Mon-Fri, 08:00am - 07:00pm Sunday/public holiday, off Saturday. "
            "D6 G01 Mynews.com: 08:00am - 10:00pm, off Sunday. "
            "D6 G02 Let's Kopitiam (Malaysian): 09:00am - 09:00pm, off day none. "
            "D6 G04 Tuk Tuk Thai & Taro: 10:30am - 12:00am Mon-Thu, 10:30am - 11:00pm Fri-Sun, off day none. "
            "D6 G05 Express Delight House: 06:00am - 12:00am, off day none. "
            "D6 101 Momoyo: 11:00am - 10:00pm, off day none. "
            "D6 102 Da Cheng Xiao Shi: 07:00am - 08:00pm, off day none. "
            "D6 103 Shu Zhi Wei: 10:00am - 08:00pm, with BBQ supper 09:00pm - 12:00am, off day none. "
            "D6 104 Restoran Blossom: 09:00am - 08:00pm, off day none. "
            "D6 105 Takwa Mee Tarik: 10:30am - 07:30pm, off day none. "
            "D6 201 Uniq Arabura: 09:00am - 09:00pm, off Sunday. "
            "D6 202 Nyonya Kitchen: 09:00am - 09:00pm, off Sunday. "
            "D6 203 U&I: 08:00am - 07:00pm, off Sunday. "
            "D6 204 Five Fingers: 10:00am - 08:00pm, off day none. "
            "D6 205 Simple Delicious: 09:00am - 08:00pm, off Saturday. "
            "D6 206 Thumbs Up: 10:00am - 08:00pm, off day none. "
            "D6 207 Little Cloud HK Cafe: 09:00am - 09:00pm, off day none. "
            "LY3 G10 3E Mini Market: 08:00am - 02:00am, off day none. "
            "LY3 101 Uni Hotpot: 09:30am - 09:00pm, off day none. "
            "LY3 102 Under Tree (Chinese): 10:00am - 09:00pm, off Saturday; this is updated from the previous D6 G03 location. "
            "LY3 103 Kami Cemerlang: 11:00am - 08:30pm, off day none. "
            "LY3 105 Castle in the Sky: 08:00am - 09:00pm, off day none. "
            "LY3 106 Xiao Jiu Zhou: 10:00am - 08:00pm, off Saturday. "
            "LY3 107 Mad Plate Express: 10:00am - 08:00pm, off day none. "
            "LY3 109 Yummi: 08:00am - 08:00pm, off day none. "
            "LY3 2F In The Campus: 07:00am - 11:00pm, off day none. "
            "Music Island GF Lake Front Cafe: 09:00am - 12:00am, off day none. "
            "A3 GF Zus Coffee: 08:00am - 09:40pm, off day none. "
            "IAEC GF Cotti Coffee: 08:00am - 10:00pm, off day none. "
            "IAEC LG Boyaxuan Chinese Restaurant: 11:00am - 02:30pm and 04:30pm - 10:00pm, off day none. "
            "Takwa Muslim Stir Fry at the old LY3 102 listing is no longer operating."
        ),
        "keywords": [
            "canteen hours",
            "cafeteria hours",
            "operation hours",
            "opening hours",
            "off day",
            "location",
            "canteen location",
            "food recommendation",
            "canteen timetable",
            "cafeteria timetable",
            "business hours",
            "closed day",
            "stall location",
            "where to eat",
            "food court",
            "dining",
            "regular hours",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "food_dining",
        "question": "Where is Under Tree now and is Takwa Muslim Stir Fry still operating?",
        "answer": "Under Tree has been updated from its previous D6 G03 location to LY3 102. It serves Chinese cuisine and its regular hours are 10:00am - 09:00pm, with Saturday as the off day. The previous LY3 102 Takwa Muslim Stir Fry listing is no longer operating.",
        "keywords": [
            "under tree",
            "under tree location",
            "ly3 102",
            "d6 g03",
            "takwa muslim stir fry",
            "not operating",
            "closed",
            "chinese cuisine",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "food_dining",
        "question": "What Chinese food can I get at XMUM canteens?",
        "answer": "Chinese-food options include Under Tree at LY3 102, Da Cheng Xiao Shi at D6 102 for Chinese mix rice, Shu Zhi Wei at D6 103 for Sichuan cuisine and Chinese noodles, Restoran Blossom at D6 104 for chicken rice and wantan mee, Takwa Mee Tarik at D6 105 for Chinese Muslim cuisine, Simple Delicious at D6 205 for Chinese noodles, Little Cloud HK Cafe at D6 207 for Hong Kong style cuisine, Uni Hotpot at LY3 101 for mala hotpot, Kami Cemerlang at LY3 103, Xiao Jiu Zhou at LY3 106, Yummi at LY3 109, and Boyaxuan Chinese Restaurant at IAEC LG. Takwa Muslim Stir Fry at the old LY3 102 listing is no longer operating.",
        "keywords": [
            "chinese food",
            "chinese cuisine",
            "recommend chinese food",
            "chinese food recommendation",
            "chinese canteen recommendation",
            "under tree",
            "under tree location",
            "mix rice",
            "sichuan",
            "chicken rice",
            "wantan mee",
            "mala hotpot",
            "hong kong style",
            "boyaxuan",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "food_dining",
        "question": "What Western or American food can I get at XMUM canteens?",
        "answer": "For Western-style food, try U&I at D6 203 for American breakfast, Thumbs Up at D6 206 for Asian/Western cuisine, I Want To Eat at LY3 2F In The Campus for Western food, DDD at LY3 2F for sandwiches, and Gravy Boom at LY3 2F for fast food.",
        "keywords": [
            "western food",
            "western food recommendation",
            "western cuisine",
            "american food",
            "american breakfast",
            "sandwich",
            "fast food",
            "u&i",
            "thumbs up",
            "i want to eat",
            "ddd",
            "gravy boom",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "food_dining",
        "question": "What Japanese or Korean food can I get at XMUM canteens?",
        "answer": "Japanese options include Poke Bowl Rice at B1 G07, Mad Plate Express at LY3 107 for Japanese hot plate food, Living Ginza Sushi & Bento at LY3 2F, and Chiba at LY3 2F for Japanese cuisine. Korean options include Five Fingers at D6 204 and Hanok Maeul at LY3 2F.",
        "keywords": [
            "japanese food",
            "japanese cuisine",
            "japanese food recommendation",
            "korean food",
            "korean cuisine",
            "korean food recommendation",
            "korean cuisine recommendation",
            "poke bowl",
            "hot plate",
            "sushi",
            "bento",
            "chiba",
            "five fingers",
            "hanok maeul",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "food_dining",
        "question": "What Middle Eastern, Central Asian, Muslim-friendly, or halal-style food can I get at XMUM canteens?",
        "answer": "For Middle Eastern or Central Asian food, try Sapid at B1 G04, Astana Restaurant at B1 G06, and Uniq Arabura at D6 201. For Muslim-friendly or pork-free choices, the cafeteria list also includes Takwa Mee Tarik at D6 105 for Chinese Muslim cuisine, Lanzhou Ramen at LY3 2F, Restea at B1 G05, Poke Bowl Rice at B1 G07, Mad Plate Express at LY3 107, Idaten Garden at LY3 2F for vegetarian food, Living Ginza Sushi & Bento at LY3 2F, and Chiba at LY3 2F. For strict halal certification, verify directly with the stall.",
        "keywords": [
            "middle east",
            "middle eastern",
            "central asian",
            "halal",
            "halal food",
            "halal recommendation",
            "muslim friendly",
            "muslim-friendly",
            "muslim food",
            "muslim-friendly food",
            "pork free",
            "pork-free",
            "middle eastern food",
            "chinese muslim",
            "lanzhou ramen",
            "sapid",
            "astana",
            "uniq arabura",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "food_dining",
        "question": "What vegetarian food can I get at XMUM canteens?",
        "answer": "For vegetarian food, the pork-free or Muslim-friendly cafeteria list includes Idaten Garden at LY3 2F In The Campus. Students with strict dietary requirements should confirm ingredients and preparation directly with the stall.",
        "keywords": [
            "vegetarian",
            "vegan",
            "vegetarian recommendation",
            "vegetarian food",
            "vegetarian meal",
            "idaten garden",
            "ly3 2f",
            "in the campus",
            "dietary requirement",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "food_dining",
        "question": "What Malaysian, Thai, Nyonya, or local food can I get at XMUM canteens?",
        "answer": "For Malaysian or local food, try Let's Kopitiam at D6 G02, Nyonya Kitchen at D6 202, Houliu at LY3 2F for Yong Taufu/Malaysia Chinese cuisine, Blissful Moments at LY3 2F for chicken rice, dessert and Malaysia cuisine, and Durian Baby at LY3 2F for Malaysia snacks. For Thai food and dessert, try Tuk Tuk Thai & Taro at D6 G04.",
        "keywords": [
            "malaysian food",
            "malaysian food recommendation",
            "malaysian cuisine",
            "local food",
            "thai food",
            "thai cuisine",
            "nyonya",
            "kopitiam",
            "yong taufu",
            "chicken rice",
            "durian baby",
            "tuk tuk thai",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "food_dining",
        "question": "Where can I get drinks, desserts, bakery items, coffee, or snacks on campus?",
        "answer": "For drinks and desserts, options include Zone U Bakery at B1 G08, Express Delight House at D6 G05 for fruits, snacks and beverages, Momoyo at D6 101 for milk tea and ice cream, Castle in the Sky at LY3 105 for fruits, snacks and beverages, DEE Fruit & Juice at LY3 2F, Yi Kou Tian at LY3 2F for bakery items, Tmall Coffee at LY3 2F, Lake Front Cafe at Music Island GF, Zus Coffee at A3 GF, and Cotti Coffee at IAEC GF.",
        "keywords": [
            "drinks",
            "dessert",
            "dessert shop",
            "bakery",
            "bakery items",
            "coffee",
            "coffee shop",
            "snacks",
            "snack food",
            "milk tea",
            "ice cream",
            "fruit",
            "juice",
            "cafe",
            "zus coffee",
            "cotti coffee",
            "lake front cafe",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "food_dining",
        "question": "Which cafeteria lots are pork-free or Muslim-friendly?",
        "answer": "The pork-free or Muslim-friendly cafeteria list includes B1 G04 Sapid, B1 G05 Restea, B1 G06 Astana Restaurant, B1 G07 Poke Bowl Rice, B1 G08 Zone U Bakery, D6 G02 Let's Kopitiam, D6 G04 Tuk Tuk Thai & Taro, D6 G05 Express Delight House, D6 101 Momoyo, D6 105 Takwa Mee Tarik, D6 201 Uniq Arabura, D6 202 Nyonya Kitchen, D6 203 U&I, D6 206 Thumbs Up, LY3 105 Castle in the Sky, LY3 107 Mad Plate Express, LY3 2F Idaten Garden, I Want To Eat, Fujian Shaxian Snacks, One Plate One Flavour, Yuan Food Hall, Houliu, Living Ginza Sushi & Bento, Yikou Yun, Lanzhou Ramen, Blissful Moments, Yuji Rice Noodles, DDD, SunXiaoYe Malatang & Noodles, DEE Fruit & Juice, Gravy Boom, Wuji BBQ & Hot Pot, Yi Kou Tian, Durian Baby, Tmall Coffee, Chiba, Hanok Maeul, plus Music Island GF Lake Front Cafe, A3 GF Zus Coffee, and IAEC GF Cotti Coffee. Takwa Muslim Stir Fry at LY3 102 is no longer operating. For strict halal certification, verify directly with each stall.",
        "keywords": [
            "pork free",
            "pork-free",
            "muslim friendly",
            "muslim-friendly",
            "halal",
            "halal food",
            "cafeteria lots",
            "canteen recommendation",
            "dietary",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "food_dining",
        "question": "Can I order food such as chicken rice through this chatbot?",
        "answer": "No. This chatbot can provide campus dining information, but it cannot take food orders, reserve meals, or process purchases. Please buy food directly from the canteen vendors.",
        "keywords": [
            "order food",
            "chicken rice",
            "food order",
            "canteen",
            "purchase",
            "meal order",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "facilities_services",
        "question": "What sports facilities can students use at XMUM?",
        "answer": "XMUM sports and recreational facilities include the gym on the 3rd floor of Building B1 (Student Activity Centre), the Indoor Sport Centre and Yoga Room in Building B1, an Olympic-sized swimming pool, and a stadium with a football field and running track. The gym is equipped with cardio machines such as treadmills, weights, and weight machines, and is open to all students and staff.",
        "keywords": [
            "sport",
            "sports",
            "sports facilities",
            "gym",
            "gymnasium",
            "gym location",
            "student activity centre",
            "b1",
            "indoor sport centre",
            "indoor sports centre",
            "swimming pool",
            "stadium",
            "running track",
            "football field",
            "football",
            "track",
            "tennis",
            "yoga",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "facilities_services",
        "question": "Where is the XMUM gym and what are its operating hours?",
        "answer": "The XMUM gym is located on the 3rd floor of Building B1 (Student Activity Centre). It is equipped with cardio machines such as treadmills, weights, and weight machines, and is open to all students and staff. Operating hours are Monday to Sunday from 08:30 to 22:30.",
        "keywords": [
            "gym",
            "gymnasium",
            "gym location",
            "gym hours",
            "gym operating hours",
            "gym equipment",
            "student activity centre",
            "b1",
            "third floor",
            "3rd floor",
            "treadmills",
            "weights",
            "weight machines",
            "fitness",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "facilities_services",
        "question": "Where is the XMUM swimming pool and who can use it?",
        "answer": "The XMUM swimming pool is an Olympic-sized pool in Building B1 (Student Activity Centre). It is free to use and is available only to registered XMUM students and staff.",
        "keywords": [
            "swimming pool",
            "pool",
            "pool location",
            "swimming pool location",
            "olympic-sized pool",
            "student activity centre",
            "b1",
            "free swimming pool",
            "pool eligibility",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "facilities_services",
        "question": "What is available at the Indoor Sport Centre?",
        "answer": "The Indoor Sport Centre is at Level 3 of Building B1. It is free for students and staff, with access to the gymnasium, Olympic-sized swimming pool, and indoor courts for badminton and basketball.",
        "keywords": [
            "indoor sport centre",
            "indoor sports centre",
            "indoor sport center",
            "level 3",
            "b1",
            "gymnasium",
            "swimming pool",
            "badminton court",
            "basketball court",
            "indoor courts",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "facilities_services",
        "question": "Do I need to book sports courts at XMUM?",
        "answer": "Sports courts such as basketball and badminton are usually free to use and generally operate on a first-come, first-served basis. Booking is typically not required. Bring your own equipment and use the courts when they are open.",
        "keywords": [
            "court booking",
            "sports court booking",
            "basketball court",
            "badminton court",
            "first-come first-served",
            "book court",
            "court reservation",
            "free court",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "facilities_services",
        "question": "Can I rent or borrow sports equipment at XMUM?",
        "answer": "XMUM does not have a formal sports equipment rental service. Students are recommended to bring their own equipment, such as basketballs, volleyballs, and badminton rackets.",
        "keywords": [
            "sports equipment",
            "equipment rental",
            "equipment loan",
            "borrow equipment",
            "rent equipment",
            "basketball",
            "volleyball",
            "badminton racket",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "facilities_services",
        "question": "Where is the Yoga Room and can students book it?",
        "answer": "The Yoga Room is in the Student Activity Centre. It has full-sized wall mirrors and is suitable for stretching, yoga, and light choreography. It is reserved for XMUM staff, students, and official campus groups, and is generally not available for individual or ad-hoc bookings.",
        "keywords": [
            "yoga room",
            "student activity centre",
            "sac",
            "wall mirrors",
            "stretching",
            "choreography",
            "yoga club",
            "dance club",
            "room booking",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "facilities_services",
        "question": "What are the gym rules at XMUM?",
        "answer": "Gym users must wear proper sports attire and non-marking sports shoes. Slippers, sandals, casual wear, bags, food, and glass containers are not allowed. Bring a towel, wipe equipment after use, re-rack weights, do not drop weights, and do not monopolize equipment.",
        "keywords": [
            "gym rules",
            "gym attire",
            "sports attire",
            "non-marking shoes",
            "gym towel",
            "re-rack weights",
            "gym conduct",
            "gym safety",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "facilities_services",
        "question": "How do I book a room or space on campus?",
        "answer": "Room or space booking is done through the XMUM E-Services | LINC platform using your Campus ID and password. Choose the relevant booking system and room type, such as study rooms, group discussion rooms, silent study rooms, or Student Success Rooms. Availability is usually first-come, first-served.",
        "keywords": [
            "space booking",
            "room booking",
            "book room",
            "book space",
            "e-services",
            "linc",
            "campus id",
            "study room",
            "group discussion room",
            "student success room",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "facilities_services",
        "question": "Where are the prayer rooms or surau at XMUM?",
        "answer": "Prayer rooms are available at the Student Activity Centre and on the Ground Floor of Building A3 (Library Annex). The facilities include ablution areas and separate prayer spaces for men and women.",
        "keywords": [
            "prayer room",
            "surau",
            "muslim prayer room",
            "student activity centre",
            "a3",
            "library annex",
            "ablution",
            "men prayer space",
            "women prayer space",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "facilities_services",
        "question": "Where is the XMUM Print Shop?",
        "answer": "The XMUM Print Shop is located at A1-G. For library self-service printing, students can use their Campus ID and Campus ID password.",
        "keywords": [
            "print shop",
            "printing",
            "photocopy",
            "photocopying",
            "a1-g",
            "self-service printing",
            "campus id",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "facilities_services",
        "question": "Where are the ATMs on campus?",
        "answer": "Public Bank and Maybank ATMs are usually available around the Ground Floor or B1 level near the canteen and Student Affairs Office. An ICBC ATM is also available at D6-G Floor.",
        "keywords": [
            "atm",
            "atms",
            "atm location",
            "atm locations",
            "where are the atms",
            "banking",
            "public bank",
            "maybank",
            "icbc",
            "withdraw money",
            "student affairs office",
            "d6-g",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "documents_identity",
        "question": "Where can I collect my parcel on campus?",
        "answer": "Parcel collection is usually at Building B1 (Student Activity Centre), near the ATM machines. Bring your student card. If your parcel is delivered today, collection is normally available from the next working day, and parcel services generally do not operate on weekends.",
        "keywords": [
            "parcel",
            "parcel collection",
            "collect parcel",
            "mail collection",
            "delivery",
            "student activity centre",
            "b1",
            "atm",
            "student card",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "clubs_activities",
        "question": "What categories of clubs and societies are available at XMUM?",
        "answer": "XMUM clubs and societies include Sports, General, Performing Arts, Culture and Arts, Service and Volunteerism, and International Communities. More details are available at https://www.xmu.edu.my/campus-life/eca/club-societies.",
        "keywords": [
            "clubs",
            "societies",
            "club societies",
            "sports clubs",
            "general clubs",
            "performing arts",
            "culture arts",
            "service volunteerism",
            "international communities",
            "eca",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "clubs_activities",
        "question": "Where can I find the XMUM clubs and societies list?",
        "answer": "You can check the XMUM clubs and societies page at https://www.xmu.edu.my/campus-life/eca/club-societies. It covers sports clubs, general clubs, performing arts, culture and arts, service and volunteerism, and international communities.",
        "keywords": [
            "club list",
            "societies list",
            "clubs and societies",
            "eca clubs",
            "sports clubs",
            "club website",
            "club societies url",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "facilities_services",
        "question": "I want to use campus facilities. What details should I ask for?",
        "answer": "Which facility do you mean? I can help with the gym, swimming pool, Indoor Sport Centre, courts, Yoga Room, prayer rooms, printing, ATMs, parking, or space booking.",
        "keywords": [
            "campus facilities",
            "facility",
            "facilities",
            "use facilities",
            "facility information",
            "what facilities",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "facilities_services",
        "question": "I want to make a booking on campus. What should I specify?",
        "answer": "What would you like to book: a sports court, study room, group discussion room, Student Success Room, or another campus space? Tell me the space type so I can give the right booking guidance.",
        "keywords": [
            "booking",
            "book",
            "reservation",
            "reserve",
            "book facility",
            "book room",
            "book space",
            "book court",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "health_safety",
        "question": "I need help on campus. What information should I provide?",
        "answer": "Is it a medical issue, security emergency, residence issue, or maintenance problem? For immediate emergencies, call Security at 019-348 9999 or 019-295 9998.",
        "keywords": [
            "need help",
            "urgent help",
            "help on campus",
            "emergency help",
            "security emergency",
            "medical issue",
            "residence issue",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "facilities_services",
        "question": "What are the opening hours for the gymnasium and swimming pool?",
        "answer": "The XMUM gym is located on the 3rd floor of Building B1 (Student Activity Centre) and is open Monday to Sunday from 08:30 to 22:30. The swimming pool is open Tuesday to Sunday from 4:00 pm to 10:00 pm and is closed on Monday and public holidays.",
        "keywords": [
            "gym",
            "gymnasium",
            "gymnasium hours",
            "gym hours",
            "gym operating hours",
            "student activity centre",
            "b1",
            "swimming pool hours",
            "sports hours",
            "opening hours",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "health_safety",
        "question": "If I am sick at night or need medical help on campus, where can I go?",
        "answer": "The on-campus clinic is operated by Plux Health Clinic. Nurses are available 24 hours, while doctors are available from 9:00 am to 5:00 pm Monday to Sunday, except on Selangor public holidays. For emergencies, contact the XMUM Emergency Helpline at 019-348 9999.",
        "keywords": [
            "medical help",
            "clinic",
            "sick at night",
            "nurse",
            "doctor",
            "plux health clinic",
            "emergency helpline",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "health_safety",
        "question": "Who should I call during a campus emergency?",
        "answer": "Students should call the 24-hour XMUM Emergency Helpline at 019-348 9999. Nearby police contacts include Sepang Police at 03-8777 4222, Dengkil Police at 03-8768 6222, and Bandar Baru Salak Tinggi Police at 03-8777 4484.",
        "keywords": [
            "emergency",
            "emergency helpline",
            "security hotline",
            "police",
            "urgent help",
            "019-348 9999",
        ],
    },
    {
        "module": "campus_life",
        "sub_intent": "it_connectivity",
        "question": "How do I connect to student WiFi if I cannot get online?",
        "answer": "Student WIFI SSIDs are 'Student-5G' or 'Student'. After connecting, students should enter their Campus ID and password on the redirected login page. For further help, visit IT Office A3-103 during working hours, email it@xmu.edu.my, or raise an AskA request.",
        "keywords": [
            "student wifi",
            "wifi login",
            "student-5g",
            "student ssid",
            "campus id",
            "it office",
            "aska",
        ],
    },
]


def normalize_question(question: str) -> str:
    return " ".join(question.strip().lower().split())


def contains_cjk(value: Any) -> bool:
    if isinstance(value, str):
        return bool(CJK_RE.search(value))
    if isinstance(value, list):
        return any(contains_cjk(item) for item in value)
    if isinstance(value, dict):
        return any(contains_cjk(item) for item in value.values())
    return False


def main() -> int:
    with SEED_PATH.open(encoding="utf-8") as file:
        rows = json.load(file)

    override_map = {
        normalize_question(question): sub_intent
        for question, sub_intent in QUESTION_SUB_INTENT_OVERRIDES.items()
    }
    field_override_map = {
        normalize_question(question): fields
        for question, fields in QUESTION_FIELD_OVERRIDES.items()
    }

    updated = 0
    for row in rows:
        question_key = normalize_question(row.get("question", ""))
        target_sub_intent = override_map.get(question_key)
        if target_sub_intent and row.get("sub_intent") != target_sub_intent:
            row["sub_intent"] = target_sub_intent
            updated += 1
        if "http://app.xmu.edu.my/maintenance" in row.get("answer", ""):
            row["answer"] = row["answer"].replace(
                "http://app.xmu.edu.my/maintenance",
                "https://app.xmu.edu.my/Maintenance/?p=6",
            )
            updated += 1
        field_override = field_override_map.get(question_key)
        if field_override:
            for key, value in field_override.items():
                if row.get(key) != value:
                    row[key] = value
                    updated += 1

    before_filter = len(rows)
    rows = [row for row in rows if not contains_cjk(row)]
    removed = before_filter - len(rows)

    rows_by_question = {
        normalize_question(row.get("question", "")): row
        for row in rows
    }

    added = 0
    for row in ADDITIONAL_ROWS:
        question_key = normalize_question(row["question"])
        existing_row = rows_by_question.get(question_key)
        if existing_row:
            for key, value in row.items():
                if existing_row.get(key) != value:
                    existing_row[key] = value
                    updated += 1
            continue
        rows.append(row)
        rows_by_question[question_key] = row
        added += 1

    with SEED_PATH.open("w", encoding="utf-8") as file:
        json.dump(rows, file, indent=2, ensure_ascii=False)
        file.write("\n")

    print(f"Updated sub_intents: {updated}")
    print(f"Removed CJK rows: {removed}")
    print(f"Added campus_life rows: {added}")
    print(f"Total campus_life rows: {len(rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
