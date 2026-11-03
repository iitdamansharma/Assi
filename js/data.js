/**
 * On-Ground.ai Call Centre — Data Layer (js/data.js)
 * Loads structured data from data/mockData.json when served over HTTP/Node,
 * with embedded fallback so file:// protocol also works out of the box.
 */

const OG_FALLBACK_DATA = {
  "agent": {
    "name": "Avani",
    "fullName": "Avani Sharma",
    "role": "Senior Call Specialist",
    "hub": "Bengaluru South Hub",
    "avatarInitials": "AS",
    "ogScore": 76,
    "rank": 3,
    "totalAgents": 18,
    "sellingAvatar": "Consultant",
    "earnings": {
      "current": 5200,
      "target": 9000,
      "breakdown": [
        { "label": "Base conversion bonus (8 sales)", "amount": 3200 },
        { "label": "EMI attach incentive (4 plans)", "amount": 1200 },
        { "label": "High SOP adherence bonus (92%)", "amount": 800 }
      ]
    },
    "ogDimensions": {
      "Lead Follow-up": 82,
      "Pitch Quality": 78,
      "Conversion": 71,
      "Speed to Call": 85,
      "Cross-sell": 64,
      "SOP Adherence": 76
    },
    "leaderboard": [
      { "rank": 1, "name": "Priya Krishnan", "hub": "Koramangala", "score": 84, "calls": 34, "csat": "97%" },
      { "rank": 2, "name": "Raju Kumar", "hub": "Indiranagar", "score": 79, "calls": 31, "csat": "95%" },
      { "rank": 3, "name": "Avani (You)", "hub": "Bengaluru South", "score": 76, "calls": 28, "csat": "94%", "isMe": true },
      { "rank": 4, "name": "Deepak Verma", "hub": "Whitefield", "score": 73, "calls": 26, "csat": "91%" },
      { "rank": 5, "name": "Neha Nair", "hub": "Jayanagar", "score": 70, "calls": 24, "csat": "89%" }
    ]
  },
  "kpiRanges": {
    "today": {
      "label": "Today",
      "subLabel": "Today · Bengaluru South Hub",
      "ogScore": 76,
      "ogDelta": "+4 vs yesterday",
      "aht": "4m 12s",
      "ahtDelta": "-18s vs target",
      "csat": "94%",
      "csatDelta": "16 of 17 positive",
      "inQueue": 2,
      "queueSub": "Oldest wait 5m",
      "leadsCreated": 3,
      "leadsCalled": 2,
      "callsChart": [18, 22, 19, 25, 24, 21, 28],
      "csatChart": [88, 90, 89, 92, 91, 93, 94]
    },
    "yesterday": {
      "label": "Yesterday",
      "subLabel": "Yesterday · Bengaluru South Hub",
      "ogScore": 72,
      "ogDelta": "+1 vs prior day",
      "aht": "4m 30s",
      "ahtDelta": "On target",
      "csat": "91%",
      "csatDelta": "19 of 21 positive",
      "inQueue": 0,
      "queueSub": "Queue cleared",
      "leadsCreated": 5,
      "leadsCalled": 6,
      "callsChart": [16, 20, 18, 22, 25, 24, 21],
      "csatChart": [86, 88, 90, 89, 92, 91, 91]
    },
    "7d": {
      "label": "Last 7 Days",
      "subLabel": "Last 7 Days · Bengaluru South Hub",
      "ogScore": 75,
      "ogDelta": "+6 vs last week",
      "aht": "4m 18s",
      "ahtDelta": "-12s vs target",
      "csat": "92%",
      "csatDelta": "114 of 124 positive",
      "inQueue": 2,
      "queueSub": "Live queue",
      "leadsCreated": 24,
      "leadsCalled": 19,
      "callsChart": [18, 22, 19, 25, 24, 21, 28],
      "csatChart": [88, 90, 89, 92, 91, 93, 94]
    },
    "month": {
      "label": "This Month",
      "subLabel": "Nov 2026 · Bengaluru South Hub",
      "ogScore": 76,
      "ogDelta": "Top 17% in region",
      "aht": "4m 15s",
      "ahtDelta": "-15s vs target",
      "csat": "93%",
      "csatDelta": "412 of 443 positive",
      "inQueue": 2,
      "queueSub": "Live queue",
      "leadsCreated": 68,
      "leadsCalled": 61,
      "callsChart": [21, 24, 23, 27, 26, 25, 28],
      "csatChart": [90, 91, 91, 93, 92, 94, 94]
    }
  },
  "waitingQueue": [
    {
      "id": "wq-1",
      "name": "Priya Iyer",
      "phone": "+91 98452 88102",
      "topic": "Return call · LG 1.5T AC",
      "wait": "2m",
      "score": 92,
      "product": "LG 1.5T 5-Star Dual Inverter AC",
      "crossSell": "V-Guard 4kVA Stabilizer + 3yr AMC",
      "emi": "6m no-cost EMI on HDFC · ₹6,490/mo",
      "story": "Visited Indiranagar store yesterday evening; asked for installation timeline before booking."
    },
    {
      "id": "wq-2",
      "name": "Suresh Nair",
      "phone": "+91 98801 44920",
      "topic": "New inquiry · IFB Washer",
      "wait": "5m",
      "score": 85,
      "product": "IFB 8kg Senator WSS Steam Front-Load",
      "crossSell": "IFB Essentials Descaler Kit + Stand",
      "emi": "9m Bajaj Finserv 0% · ₹4,100/mo",
      "story": "Inbound helpline inquiry comparing IFB 8kg vs Bosch 8kg motor warranty."
    }
  ],
  "leads": [
    {
      "id": "lead-mukunda",
      "name": "Mukunda",
      "fullName": "Mukunda Rao",
      "initials": "MR",
      "phone": "+91 98450 11223",
      "location": "Bengaluru · Indiranagar",
      "status": "OPEN",
      "sla": "4h left",
      "score": 90,
      "icpScore": 87,
      "intentScore": 91,
      "quoteNeeded": true,
      "value": 29610,
      "preferredProduct": "Whirlpool 7kg Front-Load Washer",
      "crossSell": "IFB Descaler 6-pack + Heavy-duty Stand (₹1,890)",
      "emi": "9m Bajaj Finserv No-Cost EMI · ₹3,290/mo",
      "story": "Walked into Indiranagar store on Sunday with spouse. Shortlisted Whirlpool 7kg Front-Load (₹29,610). Held back to compare exchange value on his 6-year-old top-loader.",
      "bestTime": "11:00 AM – 1:30 PM",
      "language": "English / Kannada",
      "icpBreakdown": [
        { "factor": "Budget Fit", "weight": "30%", "score": "92/100", "note": "Pre-approved Bajaj EMI card limit ₹75,000" },
        { "factor": "Category Urgency", "weight": "25%", "score": "88/100", "note": "Old washer drum bearing noisy; needs replacement this week" },
        { "factor": "Store Proximity", "weight": "20%", "score": "85/100", "note": "Lives 1.8 km from Indiranagar store" },
        { "factor": "Decision Authority", "weight": "25%", "score": "84/100", "note": "Both decision makers visited store together" }
      ],
      "journey": [
        { "time": "2 days ago · 6:15 PM", "event": "Store walk-in at Indiranagar (28 mins on floor)" },
        { "time": "Yesterday · 11:20 AM", "event": "Asked for WhatsApp quote with old machine exchange" },
        { "time": "Today · 9:40 AM", "event": "Opened PDF quote twice & clicked EMI calculator link" }
      ],
      "signals": [
        {
          "title": "Financing Related",
          "badge": "High Intent",
          "detail": "Checked 9-month Bajaj Finserv no-cost EMI split (₹3,290/mo) and zero down-payment eligibility."
        },
        {
          "title": "Quotation Demanded",
          "badge": "Hot Signal",
          "detail": "Requested formal tax invoice breakdown including ₹3,500 exchange bonus on old top-loader."
        },
        {
          "title": "Warranty Related",
          "badge": "Objection Check",
          "detail": "Asked whether the 10-year motor warranty covers hard-water scaling in East Bengaluru."
        }
      ],
      "beforeYouReachOut": [
        "Confirm ₹3,500 instant exchange bonus is locked until 8 PM today.",
        "Lead with 9-month ₹3,290/mo no-cost EMI and free Descaler 6-pack for hard water.",
        "Offer tomorrow morning 10 AM doorstep delivery + same-visit installation."
      ],
      "aiPersona": {
        "greeting": "Hello? Yes, this is Mukunda speaking. I was looking at the Whirlpool 7kg front-load quote you sent.",
        "objection": "My main worry is hard water in Indiranagar and what exchange price I will actually get for my old machine.",
        "emiResponse": "Oh, ₹3,290 a month on 9-month no-cost EMI with ₹3,500 guaranteed exchange sounds really practical.",
        "warrantyResponse": "A 10-year motor warranty plus the descaler kit takes care of my hard-water concern.",
        "closingResponse": "Great, please lock the quote and book the callback/delivery slot for tomorrow morning at 10 AM!"
      }
    },
    {
      "id": "lead-ritu",
      "name": "Ritu S.",
      "fullName": "Ritu Sharma",
      "initials": "RS",
      "phone": "+91 98450 44918",
      "location": "Bengaluru · Whitefield",
      "status": "OPEN",
      "sla": "2h left",
      "score": 96,
      "icpScore": 92,
      "intentScore": 96,
      "quoteNeeded": true,
      "value": 38940,
      "preferredProduct": "LG 1.5T 5-Star Dual Inverter AC",
      "crossSell": "V-Guard 4kVA Stabilizer + 3yr AMC (₹4,200)",
      "emi": "6m no-cost EMI on HDFC · ₹6,490/mo",
      "story": "Inquired for master bedroom cooling before guests arrive this Friday. Very keen on next-day copper-piping installation.",
      "bestTime": "12:00 PM – 3:00 PM",
      "language": "English / Hindi",
      "icpBreakdown": [
        { "factor": "Budget Fit", "weight": "30%", "score": "95/100", "note": "HDFC Infinia cardholder, ready for 6m no-cost EMI" },
        { "factor": "Category Urgency", "weight": "25%", "score": "98/100", "note": "Parents visiting this Friday; needs installation in 24h" },
        { "factor": "Store Proximity", "weight": "20%", "score": "90/100", "note": "Prestige Shantiniketan — express installation zone" },
        { "factor": "Decision Authority", "weight": "25%", "score": "88/100", "note": "Sole buyer, already measured wall unit clearance" }
      ],
      "journey": [
        { "time": "Yesterday · 4:10 PM", "event": "Store demo of LG 1.5T 5-Star AI Convertible 6-in-1 AC" },
        { "time": "Yesterday · 7:30 PM", "event": "WhatsApp message asking if Thursday installation is guaranteed" },
        { "time": "Today · 10:15 AM", "event": "Viewed HDFC 6-month no-cost EMI offer page" }
      ],
      "signals": [
        {
          "title": "Financing Related",
          "badge": "High Intent",
          "detail": "Verified ₹2,500 instant HDFC cashback + ₹6,490/mo 6-month no-cost EMI."
        },
        {
          "title": "Quotation Demanded",
          "badge": "Urgent",
          "detail": "Asked for all-inclusive quote with standard installation and V-Guard stabilizer."
        },
        {
          "title": "Warranty Related",
          "badge": "Confirmed",
          "detail": "Checked 10-year compressor warranty + 5-year PCB coverage."
        }
      ],
      "beforeYouReachOut": [
        "Assure guaranteed 24-hour priority installation in Whitefield.",
        "Bundle V-Guard 4kVA stabilizer at 20% combo discount.",
        "Highlight ₹2,500 HDFC instant cashback on 6-month no-cost EMI."
      ],
      "aiPersona": {
        "greeting": "Hi Avani, Ritu here. Can you confirm if your team can install the LG 1.5 ton AC before Friday?",
        "objection": "Another dealer promised ₹1,000 less, though they said installation might take 3 to 4 days.",
        "emiResponse": "With the ₹2,500 HDFC cashback and ₹6,490 per month no-cost EMI, your effective price actually beats them.",
        "warrantyResponse": "5-year PCB warranty plus the V-Guard stabilizer gives me total peace of mind against voltage drops.",
        "closingResponse": "Perfect! Send me the payment link right now and schedule the engineer for tomorrow 11 AM."
      }
    },
    {
      "id": "lead-faizan",
      "name": "Faizan A.",
      "fullName": "Faizan Ahmed",
      "initials": "FA",
      "phone": "+91 98861 77812",
      "location": "Bengaluru · Jayanagar",
      "status": "AGEING",
      "sla": "1d left",
      "score": 88,
      "icpScore": 82,
      "intentScore": 84,
      "quoteNeeded": true,
      "value": 24900,
      "preferredProduct": "Samsung 253L Frost-Free Convertible Fridge",
      "crossSell": "Premier Voltage Stabilizer + 2yr Extended Warranty",
      "emi": "6m ICICI No-Cost EMI · ₹4,150/mo",
      "story": "Called earlier today (missed call 12m ago). Upgrading from 190L single-door fridge; comparing Samsung 253L vs LG 242L.",
      "bestTime": "2:00 PM – 6:00 PM",
      "language": "English / Urdu / Hindi",
      "icpBreakdown": [
        { "factor": "Budget Fit", "weight": "30%", "score": "85/100", "note": "Looking around ₹25k or ₹4,150/mo EMI" },
        { "factor": "Category Urgency", "weight": "25%", "score": "82/100", "note": "Called store line 12 minutes ago for final price" },
        { "factor": "Store Proximity", "weight": "20%", "score": "80/100", "note": "Jayanagar 4th Block — 15 mins from hub" },
        { "factor": "Decision Authority", "weight": "25%", "score": "81/100", "note": "Ready to book once exchange value is confirmed" }
      ],
      "journey": [
        { "time": "3 days ago · 5:00 PM", "event": "Compared Samsung 253L & LG 242L at Jayanagar store" },
        { "time": "Yesterday · 3:15 PM", "event": "Short call asking about old 190L fridge exchange price" },
        { "time": "Today · 12 mins ago", "event": "Missed incoming call from customer — high callback priority" }
      ],
      "signals": [
        {
          "title": "Financing Related",
          "badge": "Active",
          "detail": "Interested in 6-month ICICI no-cost EMI at ₹4,150/mo."
        },
        {
          "title": "Quotation Demanded",
          "badge": "Pending",
          "detail": "Wants net payable price after old 190L refrigerator exchange."
        },
        {
          "title": "Warranty Related",
          "badge": "Checked",
          "detail": "Asked about 20-year digital inverter compressor warranty."
        }
      ],
      "beforeYouReachOut": [
        "Apologize promptly for the missed call 12 minutes ago.",
        "Quote ₹2,800 exchange bonus on his working 190L fridge.",
        "Pitch 20-year compressor warranty + ₹4,150/mo ICICI no-cost EMI."
      ],
      "aiPersona": {
        "greeting": "Hi, thanks for calling back! I tried reaching the store 10 minutes ago about the Samsung 253L fridge.",
        "objection": "I just wanted to know how much you'll deduct for my old 190L fridge and if delivery is free.",
        "emiResponse": "₹4,150 a month on ICICI no-cost EMI with ₹2,800 off for my old fridge fits my budget nicely.",
        "warrantyResponse": "20 years on the digital inverter compressor plus the stabilizer combo sounds very reliable.",
        "closingResponse": "Awesome, let's lock the Samsung 253L in Luxe Black. Please WhatsApp me the final invoice!"
      }
    },
    {
      "id": "lead-kavitha",
      "name": "Kavitha R.",
      "fullName": "Kavitha Reddy",
      "initials": "KR",
      "phone": "+91 98451 33490",
      "location": "Bengaluru · Koramangala",
      "status": "OPEN",
      "sla": "6h left",
      "score": 55,
      "icpScore": 74,
      "intentScore": 62,
      "quoteNeeded": false,
      "value": 46200,
      "preferredProduct": "Bosch 13-Place Series 4 Dishwasher",
      "crossSell": "Finish All-in-1 Starter Kit (60 tabs + Rinse Aid)",
      "emi": "12m HDFC No-Cost EMI · ₹3,850/mo",
      "story": "Requested a 4:30 PM callback to confirm kitchen plumbing dimensions with our technician before paying booking amount.",
      "bestTime": "4:00 PM – 5:30 PM",
      "language": "English / Telugu",
      "icpBreakdown": [
        { "factor": "Budget Fit", "weight": "30%", "score": "82/100", "note": "Comfortable with ₹3,850/mo 12-month EMI" },
        { "factor": "Category Urgency", "weight": "25%", "score": "68/100", "note": "Needs technician measurement check first" },
        { "factor": "Store Proximity", "weight": "20%", "score": "78/100", "note": "Koramangala 6th Block" },
        { "factor": "Decision Authority", "weight": "25%", "score": "68/100", "note": "Checking counter height with carpenter today" }
      ],
      "journey": [
        { "time": "2 days ago · 1:15 PM", "event": "Inquired about Bosch 13-Place Kadhai rack fit" },
        { "time": "Today · 10:05 AM", "event": "Sent PDF quote & dimension sheet; requested 4:30 PM callback" }
      ],
      "signals": [
        {
          "title": "Financing Related",
          "badge": "Warm",
          "detail": "Reviewed 12-month HDFC no-cost EMI at ₹3,850/mo."
        },
        {
          "title": "Quotation Demanded",
          "badge": "Sent",
          "detail": "Quote already shared at 10:05 AM; awaiting plumbing confirmation."
        },
        {
          "title": "Warranty Related",
          "badge": "Important",
          "detail": "Wants 10-year anti-rust inner tub warranty confirmation."
        }
      ],
      "beforeYouReachOut": [
        "Offer free home site-inspection by Bosch technician today at 5:30 PM.",
        "Include complimentary Finish 60-tablet starter pack worth ₹1,450.",
        "Reconfirm 10-year inner tub rust-through warranty."
      ],
      "aiPersona": {
        "greeting": "Hi Avani, yes I checked the kitchen counter height — we have 85 cm clearance under the slab.",
        "objection": "Will the installation require breaking any tiles for the inlet tap?",
        "emiResponse": "₹3,850 per month for 12 months on HDFC no-cost EMI is very convenient for us.",
        "warrantyResponse": "Good to know Bosch gives a 10-year anti-rust tub warranty and free site inspection.",
        "closingResponse": "Please book the free technician check for 5:30 PM today and hold the Finish starter kit offer!"
      }
    },
    {
      "id": "lead-divya",
      "name": "Divya P.",
      "fullName": "Divya Prakash",
      "initials": "DP",
      "phone": "+91 99001 55210",
      "location": "Bengaluru · HSR Layout",
      "status": "COLD",
      "sla": "3d left",
      "score": 38,
      "icpScore": 58,
      "intentScore": 41,
      "quoteNeeded": false,
      "value": 8490,
      "preferredProduct": "Philips Digital Airfryer HD9252/90 (4.1L)",
      "crossSell": "Non-stick Baking Tray + Muffin Cups (₹990)",
      "emi": "3m Slice / Card Pay · ₹2,830/mo",
      "story": "Browsed small appliances section last weekend; price-checking against online festive sale.",
      "bestTime": "5:00 PM – 7:30 PM",
      "language": "English",
      "icpBreakdown": [
        { "factor": "Budget Fit", "weight": "30%", "score": "65/100", "note": "Comparing store price vs e-commerce flash sale" },
        { "factor": "Category Urgency", "weight": "25%", "score": "45/100", "note": "Casual upgrade, no hard deadline" },
        { "factor": "Store Proximity", "weight": "20%", "score": "70/100", "note": "HSR Sector 2" },
        { "factor": "Decision Authority", "weight": "25%", "score": "52/100", "note": "Price-sensitive buyer" }
      ],
      "journey": [
        { "time": "4 days ago · 6:40 PM", "event": "Checked Philips HD9252 demo unit in HSR store" },
        { "time": "Yesterday · 1:05 PM", "event": "Brief call — said she saw it ₹500 cheaper online" }
      ],
      "signals": [
        {
          "title": "Financing Related",
          "badge": "Low",
          "detail": "Prefers instant card discount or 3-month split."
        },
        {
          "title": "Quotation Demanded",
          "badge": "Price Match",
          "detail": "Will buy today if store matches online price + includes baking tray."
        },
        {
          "title": "Warranty Related",
          "badge": "Standard",
          "detail": "2-year Philips worldwide warranty."
        }
      ],
      "beforeYouReachOut": [
        "Offer store price-match at ₹7,990 + free ₹990 baking accessory kit.",
        "Highlight instant 2-hour store pickup or same-day delivery vs 4-day online shipping."
      ],
      "aiPersona": {
        "greeting": "Hello? Yes, Divya here. I was about to order the Philips Airfryer online.",
        "objection": "Online it's showing ₹7,999, whereas your store tag was ₹8,490.",
        "emiResponse": "Wait, you can match ₹7,990 AND give the baking tray kit free with 3-month no-cost split?",
        "warrantyResponse": "Plus 2-year store-backed Philips replacement support is definitely safer than online.",
        "closingResponse": "Okay, that's a better deal! Hold one piece for me, I'll pick it up from the HSR store at 6 PM."
      }
    }
  ],
  "missedCalls": [
    {
      "id": "mc-1",
      "leadId": "lead-faizan",
      "name": "Faizan A.",
      "phone": "+91 98861 77812",
      "score": 88,
      "timeAgo": "12m ago",
      "product": "Samsung 253L Frost-Free Fridge",
      "value": 24900,
      "note": "Called twice — checking exchange bonus on 190L fridge"
    },
    {
      "id": "mc-2",
      "leadId": "lead-kavitha",
      "name": "Kavitha R.",
      "phone": "+91 98451 33490",
      "score": 79,
      "timeAgo": "28m ago",
      "product": "Bosch 13-Place Dishwasher",
      "value": 46200,
      "note": "Ready to confirm kitchen counter clearance & 5:30 PM visit"
    },
    {
      "id": "mc-3",
      "leadId": "lead-divya",
      "name": "Divya P.",
      "phone": "+91 99001 55210",
      "score": 64,
      "timeAgo": "1h ago",
      "product": "Philips Digital Airfryer HD9252",
      "value": 8490,
      "note": "Checking if store can price-match online offer"
    },
    {
      "id": "mc-4",
      "leadId": "lead-ritu",
      "name": "Ritu S.",
      "phone": "+91 98450 44918",
      "score": 58,
      "timeAgo": "2h ago",
      "product": "LG 1.5T Dual Inverter AC",
      "value": 0,
      "displayValue": "Follow-up",
      "note": "Wanted installation slot confirmation before Friday"
    },
    {
      "id": "mc-5",
      "leadId": null,
      "name": "Unknown",
      "phone": "+91 97312 64019",
      "score": 35,
      "timeAgo": "3h ago",
      "product": "General Store Inquiry · Microwave / OTG",
      "value": 12270,
      "note": "New caller from Sarjapur Road IVR line"
    }
  ],
  "recentCalls": [
    {
      "id": "rc-1",
      "leadId": "lead-mukunda",
      "name": "Mukunda R.",
      "phone": "+91 98450 11223",
      "direction": "incoming",
      "time": "Today · 11:20 AM",
      "duration": "5m 12s",
      "outcome": "Callback set",
      "outcomeTone": "amber",
      "product": "Whirlpool 7kg Front-Load Washer",
      "sopScore": "5/6",
      "sopItems": [
        { "name": "Opening & Intent Confirm", "passed": true, "quote": "\"Good morning Mukunda ji, calling from On-Ground Indiranagar regarding your Whirlpool 7kg washer quote.\"" },
        { "name": "Needs Discovery", "passed": true, "quote": "\"Confirmed family of 4, daily wash cycle, and hard-water supply in Indiranagar.\"" },
        { "name": "Product Pitch", "passed": true, "quote": "\"Highlighted 6th Sense SoftMove drum and built-in heater up to 60°C.\"" },
        { "name": "EMI / Financing Mention", "passed": true, "quote": "\"Shared 9-month Bajaj Finserv no-cost EMI at ₹3,290/month.\"" },
        { "name": "Warranty Mention", "passed": false, "quote": "Missed explicit mention of 10-year motor warranty hard-water terms." },
        { "name": "Closing / Callback Booking", "passed": true, "quote": "\"Booked follow-up call after he checks old machine serial number.\"" }
      ]
    },
    {
      "id": "rc-2",
      "leadId": "lead-kavitha",
      "name": "Kavitha R.",
      "phone": "+91 98451 33490",
      "direction": "outgoing",
      "time": "Today · 10:05 AM",
      "duration": "3m 48s",
      "outcome": "Quote sent",
      "outcomeTone": "blue",
      "product": "Bosch 13-Place Dishwasher",
      "sopScore": "6/6",
      "sopItems": [
        { "name": "Opening & Intent Confirm", "passed": true, "quote": "\"Hi Kavitha ma'am, Avani from On-Ground Koramangala following up on the Bosch 13-Place Dishwasher.\"" },
        { "name": "Needs Discovery", "passed": true, "quote": "\"Checked Indian kadhai & pressure cooker load requirements.\"" },
        { "name": "Product Pitch", "passed": true, "quote": "\"Explained Intensive Kadhai 70°C programme and adjustable VarioFlex basket.\"" },
        { "name": "EMI / Financing Mention", "passed": true, "quote": "\"Walked through 12-month HDFC no-cost EMI at ₹3,850/mo.\"" },
        { "name": "Warranty Mention", "passed": true, "quote": "\"Confirmed 2-year comprehensive + 10-year anti-rust inner tub warranty.\"" },
        { "name": "Closing / Callback Booking", "passed": true, "quote": "\"Scheduled 4:30 PM callback after carpenter checks counter height.\"" }
      ]
    },
    {
      "id": "rc-3",
      "leadId": null,
      "name": "Unknown",
      "phone": "+91 97312 64019",
      "direction": "missed",
      "time": "Today · 9:15 AM",
      "duration": "0m 00s",
      "outcome": "Missed",
      "outcomeTone": "red",
      "product": "Inbound Store Line",
      "sopScore": "0/6",
      "sopItems": [
        { "name": "Opening & Intent Confirm", "passed": false, "quote": "Call was missed while on another line." },
        { "name": "Needs Discovery", "passed": false, "quote": "Not applicable — call unanswered." },
        { "name": "Product Pitch", "passed": false, "quote": "Not applicable — call unanswered." },
        { "name": "EMI / Financing Mention", "passed": false, "quote": "Not applicable — call unanswered." },
        { "name": "Warranty Mention", "passed": false, "quote": "Not applicable — call unanswered." },
        { "name": "Closing / Callback Booking", "passed": false, "quote": "Queued in Incoming tab for immediate callback." }
      ]
    },
    {
      "id": "rc-4",
      "leadId": "lead-ritu",
      "name": "Ritu S.",
      "phone": "+91 98450 44918",
      "direction": "outgoing",
      "time": "Yesterday · 5:40 PM",
      "duration": "6m 10s",
      "outcome": "Converted",
      "outcomeTone": "green",
      "product": "LG 1.5T Dual Inverter AC",
      "sopScore": "6/6",
      "sopItems": [
        { "name": "Opening & Intent Confirm", "passed": true, "quote": "\"Hi Ritu, calling from On-Ground Whitefield with your LG 1.5T 5-Star AC installation schedule.\"" },
        { "name": "Needs Discovery", "passed": true, "quote": "\"Verified 165 sq ft master bedroom west-facing heat load.\"" },
        { "name": "Product Pitch", "passed": true, "quote": "\"Pitched AI Convertible 6-in-1 cooling + V-Guard 4kVA stabilizer bundle.\"" },
        { "name": "EMI / Financing Mention", "passed": true, "quote": "\"Applied ₹2,500 HDFC instant cashback on 6-month no-cost EMI.\"" },
        { "name": "Warranty Mention", "passed": true, "quote": "\"Covered 10-year compressor + 5-year PCB warranty.\"" },
        { "name": "Closing / Callback Booking", "passed": true, "quote": "\"Locked priority Thursday morning installation slot.\"" }
      ]
    },
    {
      "id": "rc-5",
      "leadId": "lead-faizan",
      "name": "Faizan A.",
      "phone": "+91 98861 77812",
      "direction": "incoming",
      "time": "Yesterday · 3:15 PM",
      "duration": "2m 20s",
      "outcome": "Follow-up",
      "outcomeTone": "amber",
      "product": "Samsung 253L Frost-Free Fridge",
      "sopScore": "4/6",
      "sopItems": [
        { "name": "Opening & Intent Confirm", "passed": true, "quote": "\"Greeted caller and pulled up Jayanagar store visit record.\"" },
        { "name": "Needs Discovery", "passed": true, "quote": "\"Checked old 190L direct-cool refrigerator condition for exchange.\"" },
        { "name": "Product Pitch", "passed": true, "quote": "\"Compared Samsung 253L Convertible 5-in-1 vs LG 242L.\"" },
        { "name": "EMI / Financing Mention", "passed": false, "quote": "Did not mention 6-month ICICI no-cost EMI ₹4,150/mo." },
        { "name": "Warranty Mention", "passed": false, "quote": "Did not highlight 20-year digital inverter warranty." },
        { "name": "Closing / Callback Booking", "passed": true, "quote": "\"Agreed to call back once exchange quote is approved.\"" }
      ]
    },
    {
      "id": "rc-6",
      "leadId": "lead-divya",
      "name": "Divya P.",
      "phone": "+91 99001 55210",
      "direction": "outgoing",
      "time": "Yesterday · 1:05 PM",
      "duration": "1m 45s",
      "outcome": "Price check",
      "outcomeTone": "gray",
      "product": "Philips Digital Airfryer HD9252",
      "sopScore": "4/6",
      "sopItems": [
        { "name": "Opening & Intent Confirm", "passed": true, "quote": "\"Introduced HSR store offer on Philips HD9252 Airfryer.\"" },
        { "name": "Needs Discovery", "passed": true, "quote": "\"Noted customer comparing online ₹7,999 festive listing.\"" },
        { "name": "Product Pitch", "passed": true, "quote": "\"Explained Rapid Air technology and 4.1L family capacity.\"" },
        { "name": "EMI / Financing Mention", "passed": false, "quote": "Skipped 3-month no-cost split option." },
        { "name": "Warranty Mention", "passed": true, "quote": "\"Mentioned 2-year Philips store-backed warranty.\"" },
        { "name": "Closing / Callback Booking", "passed": false, "quote": "Ended without locking a store pickup time." }
      ]
    }
  ],
  "tasks": [
    {
      "id": "task-callback",
      "countLabel": "1 callback",
      "title": "Confirm the 4:30pm callback with Kavitha R.",
      "channelId": "callcentre-team",
      "completed": false
    },
    {
      "id": "task-hotleads",
      "countLabel": "2 hot leads",
      "title": "Approve ₹3,500 exchange bonus on Mukunda & Ritu quotes",
      "channelId": "quotation-tickets",
      "completed": false
    },
    {
      "id": "task-outcome",
      "countLabel": "1 outcome",
      "title": "Acknowledge EMI pitch coaching note from Sunita",
      "channelId": "avani-coaching",
      "completed": false
    }
  ],
  "calendarEvents": [
    {
      "id": "ev-1",
      "day": 3,
      "month": 10,
      "year": 2026,
      "title": "Call back — Mukunda R. (Whirlpool 7kg)",
      "time": "11:30 AM – 11:45 AM",
      "type": "callback",
      "attendees": "Avani, Mukunda Rao (+91 98450 11223)",
      "location": "On-Ground Voice Bridge"
    },
    {
      "id": "ev-2",
      "day": 3,
      "month": 10,
      "year": 2026,
      "title": "Coaching Huddle w/ Sunita Rao",
      "time": "2:00 PM – 2:30 PM",
      "type": "coaching",
      "attendees": "Sunita Rao, Avani, Priya K., Raju K.",
      "location": "Pulse Huddle · #avani-coaching"
    },
    {
      "id": "ev-3",
      "day": 3,
      "month": 10,
      "year": 2026,
      "title": "Callback — Kavitha R. (Bosch Dishwasher)",
      "time": "4:30 PM – 4:50 PM",
      "type": "callback",
      "attendees": "Avani, Kavitha Reddy (+91 98451 33490)",
      "location": "On-Ground Voice Bridge"
    },
    {
      "id": "ev-4",
      "day": 4,
      "month": 10,
      "year": 2026,
      "title": "Whitefield Installation Check — Ritu S.",
      "time": "11:00 AM – 11:30 AM",
      "type": "install",
      "attendees": "Avani, Service Engineer Mahesh",
      "location": "Whitefield Hub"
    },
    {
      "id": "ev-5",
      "day": 6,
      "month": 10,
      "year": 2026,
      "title": "Zero-Cost EMI Pitch Clinic",
      "time": "3:00 PM – 3:45 PM",
      "type": "training",
      "attendees": "Bengaluru South Call Team",
      "location": "Training Room B / Pulse"
    },
    {
      "id": "ev-6",
      "day": 9,
      "month": 10,
      "year": 2026,
      "title": "Weekend Walkout Recovery Blitz",
      "time": "10:30 AM – 12:00 PM",
      "type": "campaign",
      "attendees": "All Call Specialists",
      "location": "Bengaluru South Hub"
    }
  ],
  "pulseChannels": {
    "callcentre-team": {
      "id": "callcentre-team",
      "name": "#callcentre-team",
      "category": "channel",
      "subtitle": "18 members · Bengaluru South Hub · Active shift",
      "unread": 2,
      "pin": {
        "taskId": "task-callback",
        "title": "Confirm the 4:30pm callback",
        "description": "Kavitha R. (Bosch 13-Place Dishwasher, ₹46,200) asked to confirm her 4:30 PM callback after kitchen slab measurement.",
        "primaryBtn": "Confirmed",
        "secondaryBtn": "Reschedule",
        "resolved": false,
        "resolutionText": ""
      },
      "messages": [
        {
          "id": "m-101",
          "sender": "Sunita Rao",
          "role": "Team Lead",
          "initials": "SR",
          "time": "10:14 AM",
          "isMe": false,
          "structured": {
            "stakeholders": "Avani (Call Specialist), Kavitha R. (Koramangala Lead), Mahesh (Bosch Site Tech)",
            "issue": "Customer is ready to buy Bosch 13-Place Dishwasher (₹46,200) on 12m HDFC EMI but needs confirmation that our technician can inspect the plumbing tap at 5:30 PM today.",
            "resolution": "Confirm the 4:30 PM callback with Kavitha and lock Mahesh's 5:30 PM Koramangala visit."
          },
          "text": "Team, let's make sure high-value appliance callbacks are locked before lunch. @Avani please confirm Kavitha's 4:30 PM slot."
        },
        {
          "id": "m-102",
          "sender": "Priya Krishnan",
          "role": "Call Specialist",
          "initials": "PK",
          "time": "10:18 AM",
          "isMe": false,
          "text": "I just closed two LG 1.5T AC leads using the ₹2,500 HDFC instant cashback pitch — customers are responding super well to the 6-month no-cost EMI split!"
        },
        {
          "id": "m-103",
          "sender": "Avani (You)",
          "role": "Senior Call Specialist",
          "initials": "AS",
          "time": "10:22 AM",
          "isMe": true,
          "text": "On it @Sunita! I've shared the Bosch dimension sheet with Kavitha and lined up the 4:30 PM callback."
        }
      ]
    },
    "quotation-tickets": {
      "id": "quotation-tickets",
      "name": "#quotation-tickets",
      "category": "channel",
      "subtitle": "9 members · Store Pricing & Exchange Desk",
      "unread": 3,
      "pin": {
        "taskId": "task-hotleads",
        "title": "Approve ₹3,500 exchange bonus on Mukunda & Ritu quotes",
        "description": "Store Manager approved extra ₹500 exchange top-up on Mukunda's Whirlpool 7kg & Ritu's LG 1.5T AC combo. Dispatch updated PDF quotes?",
        "primaryBtn": "Send Updated Quotes",
        "secondaryBtn": "Hold for Call",
        "resolved": false,
        "resolutionText": ""
      },
      "messages": [
        {
          "id": "m-201",
          "sender": "Raju Kumar",
          "role": "Pricing Desk",
          "initials": "RK",
          "time": "9:50 AM",
          "isMe": false,
          "structured": {
            "stakeholders": "Avani, Indiranagar Exchange Desk, Mukunda Rao (Lead #90)",
            "issue": "Mukunda requested ₹3,500 exchange value on his 6-year-old top-load washer against the Whirlpool 7kg Front-Load (₹29,610).",
            "resolution": "Approved ₹3,500 exchange bonus valid till 8 PM today + free Descaler 6-pack."
          },
          "text": "Quote ticket #QT-409 for Mukunda is approved! Net payable drops to ₹26,110 (or ₹2,901/mo on 9m Bajaj no-cost EMI)."
        }
      ]
    },
    "avani-coaching": {
      "id": "avani-coaching",
      "name": "#avani-coaching",
      "category": "channel",
      "subtitle": "Private 1:1 Coaching · Sunita Rao & Avani",
      "unread": 1,
      "pin": {
        "taskId": "task-outcome",
        "title": "Acknowledge EMI pitch coaching note from Sunita",
        "description": "Mentioning monthly EMI figure in the first 90 seconds lifted your conversion from 24% to 38% this week. Commit to trying this on your next 3 calls?",
        "primaryBtn": "Committed ✓",
        "secondaryBtn": "Ask Question",
        "resolved": false,
        "resolutionText": ""
      },
      "messages": [
        {
          "id": "m-301",
          "sender": "Sunita Rao",
          "role": "Team Lead",
          "initials": "SR",
          "time": "9:30 AM",
          "isMe": false,
          "structured": {
            "stakeholders": "Avani Sharma, Sunita Rao (Team Lead)",
            "issue": "On 2 calls yesterday (Faizan A. & Divya P.), EMI and warranty were brought up only after price objection.",
            "resolution": "Anchor with the monthly no-cost EMI (e.g. ₹3,290/mo) right after the product pitch to climb from Rank #3 to #1!"
          },
          "text": "Great job hitting 94% CSAT today, Avani! Review the SOP checklist on Mukunda's call and let's grab that #1 spot."
        }
      ]
    },
    "all-stores": {
      "id": "all-stores",
      "name": "#all-stores",
      "category": "channel",
      "subtitle": "64 members · Bengaluru Region Broadcast",
      "unread": 0,
      "pin": {
        "taskId": null,
        "title": "Festive Exchange Bonus Extended till Sunday",
        "description": "Extra ₹1,500 exchange top-up live on all Front-Load Washers and 5-Star Inverter ACs across Bengaluru stores.",
        "primaryBtn": "Got it",
        "secondaryBtn": "View Slab Sheet",
        "resolved": false,
        "resolutionText": ""
      },
      "messages": [
        {
          "id": "m-401",
          "sender": "Vikram Menon",
          "role": "Regional Manager",
          "initials": "VM",
          "time": "8:45 AM",
          "isMe": false,
          "text": "Good morning Bengaluru hubs! Whitefield and Indiranagar have 18 same-day installation slots open today — push 24h installation on every AC & Washer call."
        }
      ]
    },
    "manage-shipment": {
      "id": "manage-shipment",
      "name": "#manage-shipment",
      "category": "channel",
      "subtitle": "14 members · Dispatch & Installation Ops",
      "unread": 0,
      "pin": {
        "taskId": null,
        "title": "Whitefield Route #4 Express Van Ready",
        "description": "2 priority slots left for tomorrow morning 10 AM – 1 PM delivery + copper piping install.",
        "primaryBtn": "Reserve Slot",
        "secondaryBtn": "Check Pincode",
        "resolved": false,
        "resolutionText": ""
      },
      "messages": [
        {
          "id": "m-501",
          "sender": "Mahesh Logistics",
          "role": "Dispatch Lead",
          "initials": "ML",
          "time": "10:02 AM",
          "isMe": false,
          "text": "LG 1.5T Dual Inverter stock (14 units) and Whirlpool 7kg Front-Load (9 units) ready for immediate dispatch from South Warehouse."
        }
      ]
    },
    "new-hire-onboarding": {
      "id": "new-hire-onboarding",
      "name": "#new-hire-onboarding",
      "category": "channel",
      "subtitle": "11 members · SOP Playbooks & Call Drills",
      "unread": 0,
      "pin": {
        "taskId": null,
        "title": "6-Step On-Ground Call SOP Playbook",
        "description": "1. Opening & Intent -> 2. Needs Discovery -> 3. Product Pitch -> 4. EMI / Financing -> 5. Warranty -> 6. Closing / Callback.",
        "primaryBtn": "Practise Now",
        "secondaryBtn": "Bookmark",
        "resolved": false,
        "resolutionText": ""
      },
      "messages": [
        {
          "id": "m-601",
          "sender": "AvaniBot",
          "role": "AI Coach",
          "initials": "AB",
          "time": "9:00 AM",
          "isMe": false,
          "text": "Tip of the day: Use 'Practise a call' in the Plan menu to rehearse objection handling with live SOP scoring before dialing hot leads!"
        }
      ]
    },
    "asm-leader": {
      "id": "asm-leader",
      "name": "#asm-leader",
      "category": "role-leader",
      "subtitle": "Role Agent Leadership · Area Sales Manager Intelligence",
      "unread": 0,
      "kpis": [
        { "label": "Region Conversion", "value": "31.4%", "delta": "+3.2% WoW" },
        { "label": "Walkout Recovery", "value": "₹4.8L", "delta": "19 leads saved" },
        { "label": "SLA Compliance", "value": "94%", "delta": "4 stores >95%" }
      ],
      "pin": {
        "taskId": null,
        "title": "ASM Priority Directive · Walkout Conversion",
        "description": "Focus call specialists on Sunday evening store walkouts with >85 ICP score (Mukunda, Ritu S., Faizan A.).",
        "primaryBtn": "Sync to My Planner",
        "secondaryBtn": "View Store Breakdown",
        "resolved": false,
        "resolutionText": ""
      },
      "messages": [
        {
          "id": "m-701",
          "sender": "ASM Leader Agent",
          "role": "Autonomous Role Leader",
          "initials": "AL",
          "time": "9:15 AM",
          "isMe": false,
          "structured": {
            "stakeholders": "Area Sales Manager, Store Leads (Indiranagar, Whitefield, Jayanagar, Koramangala)",
            "issue": "₹1.48L in high-intent walkout quotes from the last 48 hours are awaiting final EMI/exchange confirmation.",
            "resolution": "Prioritize Ritu S. (96), Mukunda (90), and Faizan A. (88) in the morning calling block."
          },
          "text": "I have ranked your top 5 outgoing calls by conversion probability and pre-loaded their store walk-in notes."
        }
      ]
    },
    "callcentre-leader": {
      "id": "callcentre-leader",
      "name": "#callcentre-leader",
      "category": "role-leader",
      "subtitle": "Role Agent Leadership · Queue & SLA Orchestrator",
      "unread": 0,
      "kpis": [
        { "label": "Hub OG Score", "value": "74.8", "delta": "#1 Hub in South" },
        { "label": "Missed Value at Stake", "value": "₹91,860", "delta": "5 callbacks queued" },
        { "label": "Avg Speed to Answer", "value": "24s", "delta": "-6s vs target" }
      ],
      "pin": {
        "taskId": null,
        "title": "Clear ₹71,100 in Top-2 Missed Calls",
        "description": "Faizan A. (₹24,900) and Kavitha R. (₹46,200) called in the last 30 minutes. Calling back within 30m triples conversion.",
        "primaryBtn": "Open Incoming Queue",
        "secondaryBtn": "Acknowledge",
        "resolved": false,
        "resolutionText": ""
      },
      "messages": [
        {
          "id": "m-702",
          "sender": "CallCentre Leader Agent",
          "role": "Queue Orchestrator",
          "initials": "CL",
          "time": "10:25 AM",
          "isMe": false,
          "text": "Queue alert: Priya Iyer (2m wait) and Suresh Nair (5m wait) are currently in the live callback queue."
        }
      ]
    },
    "callcentre-agent": {
      "id": "callcentre-agent",
      "name": "#callcentre-agent",
      "category": "role-agent",
      "subtitle": "Role Agent · Personal AI Copilot for Avani",
      "unread": 1,
      "kpis": [
        { "label": "Your OG Score", "value": "76", "delta": "3 pts to Rank #2" },
        { "label": "SOP Hit Rate", "value": "88%", "delta": "Warranty step needs focus" },
        { "label": "Projected Bonus", "value": "₹7,800", "delta": "+₹2,600 this week" }
      ],
      "pin": {
        "taskId": null,
        "title": "Pre-Call Brief Ready for Mukunda & Ritu S.",
        "description": "I have prepared live objection cards and EMI splits for your next 2 calls. Ready to dial?",
        "primaryBtn": "Dial Ritu S. (96)",
        "secondaryBtn": "Dial Mukunda (90)",
        "resolved": false,
        "resolutionText": ""
      },
      "messages": [
        {
          "id": "m-703",
          "sender": "CallCentre Role Agent",
          "role": "Your AI Copilot",
          "initials": "CA",
          "time": "10:30 AM",
          "isMe": false,
          "text": "Hi Avani! To overtake Raju (#2, score 79), make sure you explicitly mention both the No-Cost EMI monthly figure and the 10-year motor/compressor warranty on your next two calls."
        }
      ]
    },
    "asm-agent": {
      "id": "asm-agent",
      "name": "#asm-agent",
      "category": "role-agent",
      "subtitle": "Role Agent · Store Floor & Inventory Liaison",
      "unread": 0,
      "kpis": [
        { "label": "Exchange Approvals", "value": "100%", "delta": "Instant slab match" },
        { "label": "Same-Day Install", "value": "Available", "delta": "Whitefield & Indiranagar" },
        { "label": "Combo Attach", "value": "42%", "delta": "Stabilizer + Descaler" }
      ],
      "pin": {
        "taskId": null,
        "title": "Store Floor Inventory Locked",
        "description": "Reserved 1 unit of LG 1.5T 5-Star AC (Whitefield) and 1 unit of Whirlpool 7kg Front-Load (Indiranagar) against your active quotes.",
        "primaryBtn": "Confirm Hold",
        "secondaryBtn": "Release",
        "resolved": false,
        "resolutionText": ""
      },
      "messages": [
        {
          "id": "m-704",
          "sender": "ASM Store Agent",
          "role": "Floor Liaison Bot",
          "initials": "AA",
          "time": "10:00 AM",
          "isMe": false,
          "text": "Floor update: Indiranagar store manager approved the free IFB Descaler 6-pack add-on if Mukunda confirms his booking today."
        }
      ]
    },
    "lead-followup": {
      "id": "lead-followup",
      "name": "#lead-followup",
      "category": "task-agent",
      "subtitle": "Task Agent · Automated SLA & Quote Watcher",
      "unread": 0,
      "kpis": [
        { "label": "Hot Leads Watched", "value": "5", "delta": "2 opened quote <1h ago" },
        { "label": "PDF Quote Opens", "value": "4x", "delta": "Mukunda & Ritu S." },
        { "label": "SLA Risk", "value": "1 lead", "delta": "Ritu S. (2h left)" }
      ],
      "pin": {
        "taskId": null,
        "title": "Live Signal: Mukunda opened PDF quote twice at 9:40 AM",
        "description": "High buying intent detected — he spent 3 minutes on the Bajaj Finserv 9m EMI breakdown.",
        "primaryBtn": "Call Mukunda Now",
        "secondaryBtn": "Open Lead Card",
        "resolved": false,
        "resolutionText": ""
      },
      "messages": [
        {
          "id": "m-801",
          "sender": "Lead Follow-up Agent",
          "role": "Task Agent",
          "initials": "LF",
          "time": "9:42 AM",
          "isMe": false,
          "text": "Signal alert: Mukunda Rao (+91 98450 11223) just clicked the EMI calculator link inside his WhatsApp quote. Strike while intent is 91!"
        }
      ]
    },
    "emi-push": {
      "id": "emi-push",
      "name": "#emi-push",
      "category": "task-agent",
      "subtitle": "Task Agent · No-Cost EMI & Cashback Matcher",
      "unread": 0,
      "kpis": [
        { "label": "Pre-Approved Leads", "value": "4 of 5", "delta": "HDFC, Bajaj, ICICI" },
        { "label": "Max Cashback", "value": "₹2,500", "delta": "HDFC 6m/12m EMI" },
        { "label": "Avg Ticket Lift", "value": "+28%", "delta": "When EMI pitched <90s" }
      ],
      "pin": {
        "taskId": null,
        "title": "Ready-to-Read EMI Scripts for Today's Queue",
        "description": "Ritu S.: ₹6,490/mo (6m HDFC + ₹2,500 cashback) · Mukunda: ₹3,290/mo (9m Bajaj 0%) · Faizan: ₹4,150/mo (6m ICICI 0%).",
        "primaryBtn": "Copy Scripts",
        "secondaryBtn": "Test in Practice Call",
        "resolved": false,
        "resolutionText": ""
      },
      "messages": [
        {
          "id": "m-802",
          "sender": "EMI Push Agent",
          "role": "Task Agent",
          "initials": "EP",
          "time": "9:55 AM",
          "isMe": false,
          "text": "All 3 of your top leads qualify for zero down-payment no-cost EMI today. Mention the monthly figure instead of the lump sum to overcome price hesitation."
        }
      ]
    },
    "walkout-recovery": {
      "id": "walkout-recovery",
      "name": "#walkout-recovery",
      "category": "task-agent",
      "subtitle": "Task Agent · Store Walk-out Winback Engine",
      "unread": 0,
      "kpis": [
        { "label": "Walkouts Assigned", "value": "5", "delta": "₹1,48,140 pipeline" },
        { "label": "Winback Rate", "value": "40%", "delta": "+8% vs hub avg" },
        { "label": "Top Blocker", "value": "Exchange / Install", "delta": "Solved on 3 leads" }
      ],
      "pin": {
        "taskId": null,
        "title": "Walkout Blocker Resolved for Ritu S. & Mukunda",
        "description": "Next-day Whitefield AC installation and ₹3,500 old-washer exchange bonus are both pre-approved.",
        "primaryBtn": "Launch Recovery Calls",
        "secondaryBtn": "Mark Reviewed",
        "resolved": false,
        "resolutionText": ""
      },
      "messages": [
        {
          "id": "m-803",
          "sender": "Walkout Recovery Agent",
          "role": "Task Agent",
          "initials": "WR",
          "time": "10:05 AM",
          "isMe": false,
          "text": "I cross-checked store walk-out logs with warehouse slots: Ritu S. can get her LG AC installed tomorrow at 11 AM, and Mukunda gets ₹3,500 instant exchange."
        }
      ]
    },
    "pitch-coach": {
      "id": "pitch-coach",
      "name": "#pitch-coach",
      "category": "task-agent",
      "subtitle": "Task Agent · Live SOP & Objection Trainer",
      "unread": 0,
      "kpis": [
        { "label": "SOP Score Today", "value": "5.5 / 6", "delta": "+0.8 vs last week" },
        { "label": "Strongest Step", "value": "Needs Discovery", "delta": "100% pass rate" },
        { "label": "Focus Area", "value": "Warranty Mention", "delta": "Missed on 1 call" }
      ],
      "pin": {
        "taskId": null,
        "title": "30-Second Warmup Drill: Hard-Water Warranty Pitch",
        "description": "Before calling Mukunda, rehearse the 10-year motor warranty + IFB Descaler 6-pack pitch.",
        "primaryBtn": "Start Practice Call",
        "secondaryBtn": "View SOP Rubric",
        "resolved": false,
        "resolutionText": ""
      },
      "messages": [
        {
          "id": "m-804",
          "sender": "Pitch Coach Agent",
          "role": "Task Agent",
          "initials": "PC",
          "time": "10:12 AM",
          "isMe": false,
          "text": "On Mukunda's earlier call you hit 5/6 SOP steps — just add the 10-year motor warranty line and you'll score a perfect 6/6 (+25 XP SOP Pro badge)!"
        }
      ]
    },
    "dm-sunita": {
      "id": "dm-sunita",
      "name": "Sunita Rao",
      "category": "dm",
      "subtitle": "Team Lead · Online",
      "unread": 0,
      "pin": {
        "taskId": null,
        "title": "1:1 Huddle at 2:00 PM Today",
        "description": "Quick 15-minute review of your top-3 leaderboard push and monthly incentive tracker.",
        "primaryBtn": "Sounds good!",
        "secondaryBtn": "View Calendar",
        "resolved": false,
        "resolutionText": ""
      },
      "messages": [
        {
          "id": "m-901",
          "sender": "Sunita Rao",
          "role": "Team Lead",
          "initials": "SR",
          "time": "9:48 AM",
          "isMe": false,
          "text": "Hey Avani, loved how smoothly you handled Kavitha's Bosch dishwasher questions this morning. Keep that energy up!"
        }
      ]
    },
    "dm-priya": {
      "id": "dm-priya",
      "name": "Priya Krishnan",
      "category": "dm",
      "subtitle": "Call Specialist · Rank #1 · On a call",
      "unread": 0,
      "pin": null,
      "messages": [
        {
          "id": "m-902",
          "sender": "Priya Krishnan",
          "role": "Call Specialist",
          "initials": "PK",
          "time": "10:10 AM",
          "isMe": false,
          "text": "Watch out, you're only 8 points behind me on the OG Score leaderboard! 😄 Let's both hit 100% SOP today."
        }
      ]
    },
    "dm-raju": {
      "id": "dm-raju",
      "name": "Raju Kumar",
      "category": "dm",
      "subtitle": "Call Specialist · Rank #2 · Online",
      "unread": 0,
      "pin": null,
      "messages": [
        {
          "id": "m-903",
          "sender": "Raju Kumar",
          "role": "Call Specialist",
          "initials": "RK",
          "time": "9:55 AM",
          "isMe": false,
          "text": "Hey Avani, I just approved the ₹3,500 exchange top-up on Mukunda's Whirlpool washer in #quotation-tickets. Go close it!"
        }
      ]
    }
  },
  "customerDiscussions": [
    {
      "id": "cd-mukunda",
      "leadId": "lead-mukunda",
      "name": "Mukunda Rao",
      "phone": "+91 98450 11223",
      "product": "Whirlpool 7kg Front-Load Washer",
      "status": "Opened Quote · 9:40 AM",
      "messages": [
        { "sender": "customer", "time": "Yesterday · 11:25 AM", "text": "Hi, can you share the Whirlpool 7kg Front-Load quote with old machine exchange?" },
        { "sender": "agent", "time": "Yesterday · 11:28 AM", "text": "Shared PDF Quote #QT-409: Whirlpool 7kg Front-Load (₹29,610) — 9m Bajaj No-Cost EMI ₹3,290/mo." },
        { "sender": "customer", "time": "Today · 9:41 AM", "text": "If you can confirm ₹3,500 exchange for my old top-loader and hard-water warranty cover, I can book today." }
      ]
    },
    {
      "id": "cd-ritu",
      "leadId": "lead-ritu",
      "name": "Ritu Sharma",
      "phone": "+91 98450 44918",
      "product": "LG 1.5T 5-Star Dual Inverter AC",
      "status": "Waiting on Install Slot",
      "messages": [
        { "sender": "customer", "time": "Yesterday · 7:30 PM", "text": "Hi Avani, my parents arrive Friday. Can your Whitefield team guarantee installation by Thursday?" },
        { "sender": "agent", "time": "Today · 9:15 AM", "text": "Hi Ritu! Checking with our Whitefield installation lead Mahesh right now to lock a Thursday 11 AM slot." }
      ]
    },
    {
      "id": "cd-faizan",
      "leadId": "lead-faizan",
      "name": "Faizan Ahmed",
      "phone": "+91 98861 77812",
      "product": "Samsung 253L Frost-Free Fridge",
      "status": "Missed Call · 12m ago",
      "messages": [
        { "sender": "customer", "time": "Today · 10:18 AM", "text": "Tried calling the store line — what is the final net price on Samsung 253L after old 190L fridge exchange?" }
      ]
    }
  ],
  "kudosList": [
    {
      "id": "k-1",
      "from": "Sunita Rao (Team Lead)",
      "badge": "⭐ CSAT Champion",
      "time": "Today · 9:30 AM",
      "text": "94% CSAT across 17 calls with zero escalations! Customers love your calm explanation of EMI splits."
    },
    {
      "id": "k-2",
      "from": "Raju Kumar",
      "badge": "🤝 Team Player",
      "time": "Yesterday · 6:15 PM",
      "text": "Thanks for taking over the Whitefield AC callback queue while I was on the pricing desk!"
    },
    {
      "id": "k-3",
      "from": "Priya Krishnan",
      "badge": "🔥 SOP Pro",
      "time": "2 days ago",
      "text": "6/6 SOP score on Ritu's LG 1.5T AC conversion with stabilizer cross-sell attached!"
    }
  ],
  "notifications": [
    {
      "id": "n-1",
      "type": "missed",
      "title": "Missed Call · Faizan A. (+91 98861 77812)",
      "body": "High-value lead (Score 88 · Samsung 253L Fridge ₹24,900) called 12m ago.",
      "time": "12m ago",
      "unread": true,
      "action": "openIncoming"
    },
    {
      "id": "n-2",
      "type": "signal",
      "title": "Hot Signal · Mukunda opened PDF quote 2x",
      "body": "Clicked 9-month Bajaj Finserv EMI link (₹3,290/mo). Lead Intent Score jumped to 91.",
      "time": "35m ago",
      "unread": true,
      "action": "openLead:lead-mukunda"
    },
    {
      "id": "n-3",
      "type": "pulse",
      "title": "Sunita Rao tagged you in #callcentre-team",
      "body": "Needs your input: Confirm the 4:30pm callback with Kavitha R.",
      "time": "52m ago",
      "unread": true,
      "action": "openChannel:callcentre-team"
    },
    {
      "id": "n-4",
      "type": "kudos",
      "title": "New Kudos from Sunita Rao",
      "body": "Awarded ⭐ CSAT Champion badge for hitting 94% CSAT today!",
      "time": "1h ago",
      "unread": false,
      "action": "openKudos"
    }
  ]
};

const STORAGE_KEY = 'onground_cc_state_v2';

window.OGStore = {
  data: null,

  async init() {
    let baseData = null;
    try {
      const resp = await fetch('./data/mockData.json', { cache: 'no-store' });
      if (resp.ok) {
        baseData = await resp.json();
      }
    } catch (e) {
      // Fallback when opened directly via file://
    }
    if (!baseData) {
      baseData = JSON.parse(JSON.stringify(OG_FALLBACK_DATA));
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.agent && parsed.leads) {
          this.data = parsed;
          return this.data;
        }
      } catch (e) {
        console.warn('Could not parse saved state, using fresh mockData.json');
      }
    }

    this.data = baseData;
    this.save();
    return this.data;
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      // Ignore quota errors
    }
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = JSON.parse(JSON.stringify(OG_FALLBACK_DATA));
    this.save();
    return this.data;
  }
};
