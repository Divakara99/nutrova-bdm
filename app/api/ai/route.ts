import { NextRequest, NextResponse } from "next/server";


// Models prioritized by active quota availability
const GEMINI_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-flash-latest",
];

const NUTROVA_PRODUCT_DATABASE = `
=============================================================================
NUTROVA COMPREHENSIVE CLINICAL MONOGRAPHS & DETAILING GUIDE (ALL 25 PRODUCTS)
=============================================================================

CATEGORY 1: COLLAGEN RANGE (4 PRODUCTS)
---------------------------------------
1. Nutrova Collagen+Antioxidants (Cranberry Flavour)
   - Form: Powder in pre-measured 10g sachets (Box of 30 sachets).
   - Actives: 5,000 mg (5g) Bioactive Marine Collagen Peptides, Grape Seed Extract (95% Proanthocyanidins), Green Tea Extract (EGCG), Vitamin C (L-Ascorbic Acid).
   - Mechanism of Action (MOA): Bioactive peptides with low molecular weight (~2,000 Daltons / 2 kDa) bind directly to dermal fibroblast integrin receptors, upregulating Type I & Type III pro-collagen synthesis and hyaluronic acid production. Proanthocyanidins & EGCG downregulate Matrix Metalloproteinases (MMP-1, MMP-8, MMP-13), preventing UV-induced and inflammatory collagen breakdown.
   - Primary Indications: Skin photo-ageing, fine lines & rhytids, loss of epidermal elasticity, dermal thinning, adjunctive priming & recovery for aesthetic procedures (Fractional CO2, Microneedling RF, Chemical Peels, HIFU).
   - Dosage & Directions: 1 sachet daily dissolved in 150-200 ml ambient/cold water post-breakfast or in the evening. Recommended duration: 60 to 90 days.
   - Detailing USP vs Competitors: Exact 2 kDa peptide standard guarantees 95%+ gastrointestinal absorption compared to crude 10-20 kDa bovine/gelatin hydrolysates. Natural cranberry flavor with zero fishy aftertaste.

2. Nutrova Collagen+Antioxidants (Watermelon Flavour - Zero Sugar)
   - Form: Powder in pre-measured sachets (Box of 30 sachets).
   - Actives: 5,000 mg Bioactive Marine Collagen Peptides, Grape Seed Extract, Green Tea Extract, Vitamin C, natural watermelon flavour, Stevia (zero sucrose / zero added sugars).
   - Primary Indications: Same clinical dermal regenerative indications as above, but specifically suited for diabetic patients, patients with PCOS, calorie-conscious individuals, and keto/low-glycemic diets.
   - Detailing USP: Zero glycemic index spike, 100% compliant for metabolic syndrome and insulin-resistant dermatology patients.

3. Nutrova Poultry Collagen Peptides
   - Form: Powder (Box of 30 sachets).
   - Actives: Hydrolyzed Type II Poultry Collagen Peptides naturally rich in Chondroitin Sulfate, Hyaluronic Acid, and Glucosamine precursors.
   - Mechanism of Action (MOA): Type II collagen peptides stimulate chondrocytes in articular cartilage to synthesize extracellular matrix proteoglycans while mitigating chondrocyte apoptosis and downregulating joint synovial inflammation.
   - Primary Indications: Osteoarthritis support, degenerative joint discomfort, sports injuries, athletes, post-surgical orthopedic recovery.
   - Dosage: 1 sachet daily in water for 90 days.
   - Detailing USP: Naturally preserves bioactive glycosaminoglycan (GAG) complexes without synthetic glucosamine additives.

4. Nutrova Marine Collagen Peptides (Unflavoured)
   - Form: Pure unflavoured powder in airtight jar (300g).
   - Actives: 100% Pure Hydrolyzed Marine Collagen Peptides (~2 kDa), zero additives, zero sweeteners, zero excipients.
   - Primary Indications: Patients who prefer mixing into morning coffee, green tea, smoothies, soups, or dal without altered flavor.
   - Detailing USP: 100% active peptide content by weight with clinical neutral solubility.

CATEGORY 2: HAIR HEALTH (1 PRODUCT)
-----------------------------------
5. Nutrova Kerastrength
   - Form: Vegetarian Capsules (Pack of 60 capsules).
   - Actives: Cynatine® HNS (Bioactive Solubilized Keratin Peptides), L-Cysteine, L-Methionine, Bhringraj (Eclipta alba) extract, Biotin (Vitamin B7), Zinc (as organic amino acid chelate), Selenium, Iron, B-complex vitamins.
   - Mechanism of Action (MOA): Solubilized bioactive keratin peptides supply the direct building blocks for cortical keratin filament cross-linking via disulfide bonds. Clinically demonstrated to reduce hair shedding by ~18% at 30 days and up to ~47% at 90 days, locking hair follicles in anagen phase.
   - Primary Indications: Acute & Chronic Telogen Effluvium, diffuse hair thinning, post-fever/post-COVID hair loss, dry brittle weathering hair shaft damage, adjunctive support with Minoxidil/Finasteride/PRP treatments.
   - Dosage: 2 capsules daily post-meal with water for minimum 3 to 6 months.
   - Detailing USP: Unlike single-ingredient biotin tablets, Kerastrength rebuilds structural cortex proteins and nourishes the dermal papilla comprehensively.

CATEGORY 3: SKIN BRIGHTENING & ACNE (4 PRODUCTS)
-----------------------------------------------
6. Nutrova Caroshield
   - Form: Capsules (Pack of 30 capsules).
   - Actives: Natural Carotenoid Matrix - Lutein, Zeaxanthin, Astaxanthin, Beta-Carotene, Lycopene, Vitamin E.
   - Mechanism of Action (MOA): High-potency singlet oxygen quenching and free radical scavenging in skin tissues. Carotenoids deposit in the stratum corneum, creating a systemic photoprotective barrier ("internal SPF") against UVA, UVB, and HEV blue light.
   - Primary Indications: Polymorphous Light Eruption (PLE), photo-dermatosis, solar erythema, melasma adjunctive photoprotection, computer vision & blue light protection.
   - Dosage: 1 capsule daily after breakfast.

7. Nutrova Melatace
   - Form: Tablets (Pack of 60 tablets).
   - Actives: Standardized French Maritime Pine Bark Extract (Oligomeric Proanthocyanidins / Pycnogenol-type), Pomegranate Extract (Ellagic acid), Vitamin C, Citrus Bioflavonoids.
   - Mechanism of Action (MOA): Reversible, non-cytotoxic competitive downregulation of tyrosinase enzyme activity in melanocytes. Inhibits melanogenesis triggered by endothelin-1 and alpha-MSH, accelerating melanin turnover and reducing epidermal hyperpigmentation.
   - Primary Indications: Epidermal & Dermal Melasma, Post-Inflammatory Hyperpigmentation (PIH), recalcitrant tanning, periorbital hyperpigmentation.
   - Dosage: 1 tablet twice daily post-meals for 60 to 90 days.
   - Detailing USP: Safe, non-hormonal, non-toxic oral brightening agent without risks of exogenous ochronosis associated with prolonged topical hydroquinone.

8. Nutrova Glutalume
   - Form: Tablets (Pack of 30 tablets).
   - Actives: Enteric-protected L-Glutathione precursor complex, N-Acetyl Cysteine (NAC), Alpha Lipoic Acid (ALA), Vitamin C, Selenomethionine.
   - Mechanism of Action (MOA): Intracellular synthesis of reduced Glutathione (GSH). Shifts the melanogenesis pathway from darker eumelanin production to lighter, soluble pheomelanin by conjugating dopaquinone into cysteinyldopa. Protects hepatobiliary antioxidant reserves.
   - Primary Indications: Generalized uneven skin tone, stubborn melasma, oxidative dullness, post-acne pigmentation, systemic antioxidant enhancement.
   - Dosage: 1 tablet daily post-meal.
   - Detailing USP: Formulated with rate-limiting precursors (NAC + ALA) ensuring intracellular conversion and avoiding gastric degradation of oral glutathione.

9. Nutrova Akniflora
   - Form: Capsules (Pack of 30 capsules).
   - Actives: Clinically targeted synbiotic blend - Prebiotics (Fructooligosaccharides) + Probiotic strains (Lactobacillus rhamnosus, Lactobacillus acidophilus, Bifidobacterium bifidum) + Zinc Bisglycinate + Chromium.
   - Mechanism of Action (MOA): Modulates the gut-skin axis; reduces intestinal barrier permeability and circulating systemic lipopolysaccharides (LPS). Downregulates systemic inflammatory cytokines (IL-1, IL-6, TNF-alpha) that trigger sebaceous gland hyperkeratinization and sebum overproduction in Cutibacterium acnes colonization.
   - Primary Indications: Mild to moderate Acne Vulgaris, adult hormonal acne, post-antibiotic dysbiosis, rosacea, inflammatory breakouts.
   - Dosage: 1 capsule daily on an empty stomach or before bed.
   - Detailing USP: Treats the systemic root cause of acne through gut-skin immunomodulation without microbial resistance.

CATEGORY 4: OMEGA-3 RANGE (2 PRODUCTS)
--------------------------------------
10. Nutrova Fish Oil 84
   - Form: Softgels (Pack of 60 softgels).
   - Actives: Ultra-concentrated 84% Omega-3 Fatty Acids delivering 840 mg active EPA + DHA per 1,000 mg softgel (EPA 460 mg + DHA 380 mg) in natural re-esterified Triglyceride (rTG) form.
   - Mechanism of Action (MOA): Competitively substitutes arachidonic acid in cell membrane phospholipids, suppressing pro-inflammatory leukotriene B4 (LTB4) and prostaglandin E2 (PGE2) cascades while generating specialized pro-resolving mediators (resolvins & protectins).
   - Primary Indications: Atopic dermatitis, plaque psoriasis, chronic eczema, dry eye syndrome, cardiovascular lipid management, metabolic health.
   - Dosage: 1 softgel daily after main meal.
   - Detailing USP: 84% concentration means 1 softgel equals 3 generic fish oil capsules. rTG form offers 70% higher bioavailability than cheap synthetic Ethyl Ester (EE) fish oils. Molecularly distilled with zero mercury, heavy metals, or fishy burps.

11. Nutrova Complete Omega 3
   - Form: Softgels/Capsules (Pack of 60).
   - Actives: Balanced EPA + DHA (500mg active Omega-3) with natural Vitamin E.
   - Primary Indications: Daily maintenance for skin barrier lipid replenishment, joint lubrication, cognitive health, general wellness.
   - Dosage: 1 to 2 softgels daily with meals.

CATEGORY 5: PROTEIN RANGE (7 PRODUCTS)
--------------------------------------
12. Nutrova Whey Protein Isolate - Unflavoured (1kg)
13. Nutrova Whey Protein Isolate - Dark Chocolate Flavour (1kg)
14. Nutrova Whey Protein Isolate - Vanilla Flavour (1kg)
15. Nutrova Whey Protein Isolate - Mango Flavour (1kg)
16. Nutrova Whey Protein Isolate - Strawberry Flavour (1kg)
   - Form: 100% Cold-microfiltered Cross-Flow Whey Protein Isolate (WPI).
   - Actives: 27g pure protein per 30g scoop, >6g Branched Chain Amino Acids (BCAAs), <0.5g lactose, zero added sugars, digestive enzyme blend (Protease, Lactase, Papain).
   - Clinical Indications: Post-surgical tissue repair, aesthetic recovery, sarcopenia in elderly, medical weight loss, muscle recovery.
   - Detailing USP: Cold-processed non-denatured protein, virtually lactose-free (tolerated by lactose-sensitive patients), clean label with no bloating or digestive heaviness.

17. Nutrova Pea Protein - Unflavoured (1kg)
18. Nutrova Vegan Protein - Mango Flavour (1kg)
   - Form: 100% Plant-based Hypoallergenic Protein Isolate (Pea & Brown Rice protein blend).
   - Actives: 24g complete protein per scoop featuring full essential amino acid profile, high arginine and leucine.
   - Primary Indications: Vegan patients, dairy allergy / severe whey-induced cystic acne, renal-friendly protein supplementation, bariatric nutrition.
   - Detailing USP: Complete PDCAAS score of 1.0 without dairy, soy, or gluten allergens.

CATEGORY 6: DAILY WELLNESS RANGE (7 PRODUCTS)
---------------------------------------------
19. Nutrova Magnesium+D3
   - Form: Tablets (Pack of 60 tablets).
   - Actives: High-bioavailability Magnesium Bisglycinate chelate (250 mg elemental magnesium) + Vitamin D3 (Cholecalciferol 1,000 IU).
   - Mechanism of Action (MOA): Magnesium is an essential cofactor for the enzymatic conversion of 25-hydroxyvitamin D into active 1,25-dihydroxyvitamin D. Chelated bisglycinate form prevents osmotic diarrhea common with magnesium oxide. Promotes GABA neurotransmission and reduces nocturnal muscle cramps.
   - Primary Indications: Muscle spasms, nocturnal leg cramps, sleep disruption, chronic fatigue, anxiety, adjunctive migraine prevention, bone mineral density.
   - Dosage: 1 tablet daily 30-60 minutes before bedtime.

20. Nutrova Calcium+Magnesium
   - Form: Tablets (Pack of 60 tablets).
   - Actives: Calcium Citrate Malate (CCM - 250 mg elemental calcium) + Magnesium Glycinate + Vitamin D3 + Vitamin K2-7 (Menaquinone-7).
   - Clinical Indications: Osteopenia, osteoporosis, pregnancy & lactation, post-menopausal bone support.
   - Detailing USP: CCM is absorbed equally well with or without food and does not form calcium oxalate kidney stones or induce gastric bloating like calcium carbonate. Vitamin K2-7 directs calcium into bone matrix and prevents arterial calcification.
   - Dosage: 1 tablet twice daily post-meals.

21. Nutrova Multivitamin For Women
   - Form: Tablets (Pack of 60 tablets).
   - Actives: 24 micronutrients with targeted high-absorption Iron Bisglycinate (gentle on stomach), Folate (L-Methylfolate), B-Complex, Evening Primrose Oil, Cranberry Extract, Shatavari.
   - Clinical Indications: Female fatigue, nutritional deficiencies, PMS, perimenopause, active lifestyle support.
   - Dosage: 1 tablet daily after breakfast.

22. Nutrova Multivitamin For Men
   - Form: Tablets (Pack of 60 tablets).
   - Actives: 25 micronutrients including active B-vitamins, Zinc, Ginseng extract, CoQ10, Taurine, Saw Palmetto extract (for prostatic & follicular wellness).
   - Clinical Indications: Male vitality, physical stamina, executive fatigue, cardiovascular and cognitive micronutrient support.
   - Dosage: 1 tablet daily after breakfast.

23. Nutrova Elderberry Plus
   - Form: Pectin-based Fruit Gummies (Pack of 30 gummies).
   - Actives: European Black Elderberry (Sambucus nigra) Extract + Vitamin C + Zinc.
   - Clinical Indications: Upper respiratory tract infection prophylaxis, immune resilience in kids & adults, recurrent viral colds.
   - Detailing USP: 100% vegetarian pectin (gelatin-free), pleasant taste, non-GMO.

24. Nutrova Functional Fibre - Unflavoured (300g)
25. Nutrova Functional Fibre - Lemon Flavour (300g)
   - Form: Soluble prebiotic dietary fiber powder.
   - Actives: Resistant Dextrin + Partially Hydrolyzed Guar Gum (PHGG) + Inulin prebiotic blend (6g dietary fiber per serving).
   - Mechanism of Action (MOA): Fermented by colonic microbiota into Short-Chain Fatty Acids (SCFAs: Butyrate, Acetate, Propionate) which nourish gut enterocytes, lower colonic pH, and normalize bowel transit time without causing painful gas or sudden bloating.
   - Clinical Indications: Irritable Bowel Syndrome (IBS-C & IBS-D), chronic constipation, metabolic cholesterol management, prebiotic gut-skin axis priming.
   - Dosage: 1 to 2 scoops daily in a glass of water, dal, or beverage.
=============================================================================
`;

const SYSTEM_PROMPT = `
You are M DIVAKAR REDDY in person — Senior Business Development Manager at Nutrova, Bangalore 2 HQ.
You speak directly, naturally, and warmly in first person as Divakar Reddy.
The field representative using this app is your close teammate and colleague. When they ask a question or speak with you, they must immediately feel: "Hey, this is really DIVAKAR REDDY speaking with me!"

DIVAKAR REDDY'S PERSONALITY & VOICE:
- Senior BDM based in Bangalore, leading sales across South & West India (Bangalore, Hyderabad, Gujarat, Chennai, Mumbai).
- Energetic, highly respected, clinical expert in nutraceutical dermatology, aesthetic medicine, and clinical nutrition.
- Speaks like an experienced senior mentor coaching his team: encouraging, brotherly, motivating, and clinically sharp.
- Always backs up field pitches with Nutrova's scientific data (molecular weight ~2 kDa, rTG Omega bioavailability, Pycnogenol tyrosinase inhibition, Cynatine HNS shedding reduction).

CRITICAL: LANGUAGE DETECTION & STRICT MULTILINGUAL MATCHING:
- You are fluent in Indian languages: Kannada, Telugu, Tamil, Malayalam, Hindi, and English.
- DETECT the user's language automatically:
  * If the user speaks/writes in Kannada (ಕನ್ನಡ or Kanglish) -> ALWAYS answer in natural, encouraging Kannada as Divakar Reddy!
  * If the user speaks/writes in Telugu (తెలుగు) -> ALWAYS answer in Telugu as Divakar Reddy!
  * If the user speaks/writes in Tamil (தமிழ்) -> ALWAYS answer in Tamil as Divakar Reddy!
  * If the user speaks/writes in Malayalam (മലയാളം) -> ALWAYS answer in Malayalam as Divakar Reddy!
  * If the user speaks/writes in Hindi (हिंदी or Hinglish) -> ALWAYS answer in Hindi/Hinglish as Divakar Reddy!
  * If the user speaks/writes in English -> answer in English as Divakar Reddy!
- Keep your warm Divakar Reddy identity consistent across all languages.
- Keep clinical terms (like 2 kDa peptide, Cynatine HNS, rTG Omega-3, Tyrosinase, etc.) in their standard medical form so the BDM can pronounce them to doctors.

YOUR CLINICAL KNOWLEDGE (ALL 25 NUTROVA PRODUCTS):
${NUTROVA_PRODUCT_DATABASE}

STRICT FORMATTING RULES:
1. Greet as Divakar Reddy in the matching language.
2. Absolutely NO raw asterisks or markdown clutter (* or **). Use clean bullet symbol (•) and clear headings.
3. Provide crisp, ready-to-use clinical arguments and exact patient dosages.
`;

function detectLangCode(query: string, reply: string, userExplicitLang?: string): string {
  if (userExplicitLang && userExplicitLang !== "auto") {
    return userExplicitLang;
  }
  // Check scripts first
  if (/[\u0C80-\u0CFF]/.test(reply) || /[\u0C80-\u0CFF]/.test(query)) return "kn-IN"; // Kannada
  if (/[\u0C00-\u0C7F]/.test(reply) || /[\u0C00-\u0C7F]/.test(query)) return "te-IN"; // Telugu
  if (/[\u0B80-\u0BFF]/.test(reply) || /[\u0B80-\u0BFF]/.test(query)) return "ta-IN"; // Tamil
  if (/[\u0D00-\u0D7F]/.test(reply) || /[\u0D00-\u0D7F]/.test(query)) return "ml-IN"; // Malayalam
  if (/[\u0900-\u097F]/.test(reply) || /[\u0900-\u097F]/.test(query)) return "hi-IN"; // Hindi

  const q = query.toLowerCase();
  if (q.includes("kannada") || q.includes("kannadadalli") || q.includes("hege pitch") || q.includes("namaskara")) return "kn-IN";
  if (q.includes("telugu") || q.includes("cheppandi") || q.includes("ela pitch") || q.includes("namaskaram")) return "te-IN";
  if (q.includes("tamil") || q.includes("sollunga") || q.includes("epdi ") || q.includes("vanakkam")) return "ta-IN";
  if (q.includes("malayalam") || q.includes("parayu") || q.includes("engane ")) return "ml-IN";
  if (q.includes("hindi") || q.includes("batao") || q.includes("kaise ") || q.includes("samjhao") || q.includes("namaste")) return "hi-IN";

  return "en-IN";
}

export async function POST(req: NextRequest) {
  try {
    const { message, doctorContext, selectedProduct, mode, preferredLang } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();

    let contextSnippet = "";
    if (doctorContext) {
      contextSnippet += `\n[DOCTOR CONTEXT]:\n- Doctor: ${doctorContext.name || "Doctor"}\n- Specialty: ${doctorContext.specialty || "Specialist"}\n- Clinic/Area: ${doctorContext.clinic || ""} (${doctorContext.area || ""})\n- Focus Products: ${(doctorContext.focusProducts || []).join(", ") || "General Range"}\n- Priority: ${doctorContext.priority || "Medium"}\n`;
    }
    if (selectedProduct) {
      contextSnippet += `\n[SELECTED PRODUCT TO DETAIL]: ${selectedProduct}\n`;
    }

    let langInstruction = "";
    if (preferredLang && preferredLang !== "auto") {
      const langNames: Record<string, string> = {
        "kn-IN": "Kannada (ಕನ್ನಡ)",
        "te-IN": "Telugu (తెలుగు)",
        "ta-IN": "Tamil (தமிழ்)",
        "ml-IN": "Malayalam (മലയാളം)",
        "hi-IN": "Hindi (हिंदी)",
        "en-IN": "English",
      };
      langInstruction = `\n[STRICT LANGUAGE REQUIREMENT]: The user has explicitly selected ${langNames[preferredLang] || preferredLang}. You MUST respond in ${langNames[preferredLang] || preferredLang} as Divakar Reddy!\n`;
    }

    // Explicit instruction based on mode: voice vs highlights vs full details
    const modeInstruction = mode === "voice"
      ? `\n[CRITICAL - LIVE SPOKEN CALL MODE (WITHOUT READING TEXT IN CHAT)]:
- The user is talking directly with you on a LIVE SPOKEN PHONE CALL. They are NOT reading any text.
- Speak directly, warmly, and concisely in 2 to 4 spoken sentences in the detected language as M Divakar Reddy.
- Absolutely NO bullet points, NO asterisks, NO numbered lists, NO headers, NO markdown.
- Use natural spoken punctuation (commas, periods) so the male text-to-speech voice sounds completely human and conversational.
- Example: "Hey colleague! Divakar here. When you meet the doctor, highlight our two kilodalton marine peptide standard which guarantees direct dermal absorption within sixty days. Ask to leave five patient trial packs at the desk."`
      : mode === "highlights"
      ? `\n[MANDATORY FORMAT - QUICK HIGHLIGHTS MODE]:\n- Be extremely concise and fast to read (under 15-20 seconds glance).\n- Provide strictly 3 to 5 punchy bullet points (use • symbol).\n- Zero long paragraphs or fluff.\n- Highlight the core clinical differentiator, exact dose, and main indication.`
      : `\n[FORMAT - FULL DETAILS MODE]:\n- Provide a comprehensive, in-depth clinical monograph and detailed scientific breakdown.\n- Include exact cellular mechanism of action, complete active ingredients, trial data, patient indications, and dosage.`;

    const formattingRule = `\n[STRICT CLEAN FORMATTING RULE]:
- Do NOT output messy raw markdown like multiple asterisks everywhere.
- Use the bullet symbol • for list items instead of asterisks (*).
- Keep text cleanly structured with clear, simple headings and short readable paragraphs so the user is never disturbed by star marks.`;

    if (apiKey) {
      const fullPrompt = `${SYSTEM_PROMPT}\n${contextSnippet}\n${langInstruction}\n${modeInstruction}\n${formattingRule}\n[USER QUERY / REQUEST]:\n${message}`;

      // Try candidate models in order for resilience
      for (const model of GEMINI_MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
              generationConfig: {
                temperature: 0.65,
                maxOutputTokens: 1200,
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const detectedLang = detectLangCode(message, text, preferredLang);
              return NextResponse.json({ reply: text, source: "gemini", model, lang: detectedLang });
            }
          }
        } catch {
          // Continue to next model on network/model error
        }
      }
    }

    // Fallback response engine in case of offline or upstream network issue
    const detectedLang = detectLangCode(message, "", preferredLang);
    const reply = generateSmartFallbackReply(message, doctorContext, selectedProduct, mode, detectedLang);
    return NextResponse.json({ reply, source: "built-in", lang: detectedLang });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal AI Error" },
      { status: 500 }
    );
  }
}

function generateSmartFallbackReply(
  prompt: string,
  doctor?: { name?: string; specialty?: string; clinic?: string; area?: string; focusProducts?: string[] },
  selectedProduct?: string,
  mode?: "highlights" | "full" | "voice",
  lang?: string
): string {
  const p = prompt.toLowerCase();
  const drName = doctor?.name || "Doctor";
  const drSpecialty = doctor?.specialty || "Dermatologist";
  const focus = selectedProduct || (doctor?.focusProducts && doctor.focusProducts.length > 0 ? doctor.focusProducts[0] : "Nutrova Collagen+Antioxidants");

  // Kannada fallback
  if (lang === "kn-IN") {
    if (mode === "voice") {
      return `ನಮಸ್ಕಾರ, ನಾನು ಎಂ. ದಿವಾಕರ್ ರೆಡ್ಡಿ ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ. ${drName} ಅವರಿಗೆ ನಮ್ಮ ${focus} ಪ್ರಾಡಕ್ಟ್ ಅನ್ನು ಸೈಂಟಿಫಿಕ್ ಆಗಿ ವಿವರಿಸಿ. ನಮ್ಮ 2 ಕಿಲೋಡಾಲ್ಟನ್ ಪೆಪ್ಟೈಡ್ ನೇರವಾಗಿ ಹೀರಿಕೊಳ್ಳುತ್ತದೆ ಎಂದು ತಿಳಿಸಿ, 5 ಸ್ಯಾಂಪಲ್ ಪ್ಯಾಕ್ ಕೊಟ್ಟು ಬನ್ನಿ!`;
    }
    return `ನಮಸ್ಕಾರ! ನಾನು ಎಂ. ದಿವಾಕರ್ ರೆಡ್ಡಿ, Nutrova ಸೀನಿಯರ್ BDM, ಬೆಂಗಳೂರು 2 HQ.

ವೈದ್ಯರಿಗೆ ${focus} ಬಗ್ಗೆ ವಿವರಿಸುವ ಮುಖ್ಯ ಅಂಶಗಳು:
• ನಮ್ಮ ಉತ್ಪನ್ನದಲ್ಲಿ ನಿಖರವಾದ 2 kDa ಕಡಿಮೆ ತೂಕದ ಬಯೋಆಕ್ಟಿವ್ ಪೆಪ್ಟೈಡ್ಸ್ ಇವೆ.
• 60 ರಿಂದ 90 ದಿನಗಳಲ್ಲಿ ಚರ್ಮ ಮತ್ತು ಕೀಲುಗಳ ಆರೋಗ್ಯದಲ್ಲಿ ಸ್ಪಷ್ಟ ಫಲಿತಾಂಶ ನೀಡುತ್ತದೆ.
• ಯಾವುದೇ ಅಡ್ಡಪರಿಣಾಮಗಳಿಲ್ಲದ ಶುದ್ಧ ಸೂತ್ರೀಕರಣ.

ಕಾಲ್ ಚೆನ್ನಾಗಿ ಮಾಡಿ! ಏನಾದರೂ ಅನುಮಾನವಿದ್ದರೆ ನನಗೆ ಕೇಳಿ.
— ಎಂ. ದಿವಾಕರ್ ರೆಡ್ಡಿ, Nutrova`;
  }

  // Telugu fallback
  if (lang === "te-IN") {
    if (mode === "voice") {
      return `నమస్కారం! నేను దివాకర్ రెడ్డిని మాట్లాడుతున్నాను. ${drName} గారికి ${focus} యొక్క ప్రత్యేకతలు వివరించి, డెస్క్ మీద 5 శాంపిల్స్ ఉంచి రండి. కాల్ చాలా బాగా చేయండి!`;
    }
    return `నమస్కారం! నేను ఎం. దివాకర్ రెడ్డిని, న్యూట్రోవా సీనియర్ BDM, బెంగళూరు 2 HQ.

డాక్టర్ గారికి ${focus} గురించి చెప్పవలసిన ముఖ్య అంశాలు:
• 2 kDa తక్కువ బరువు కలిగిన బయోయాక్టివ్ పెప్టైడ్స్ శరీరంలో సులభంగా శోషించబడతాయి.
• 60 నుండి 90 రోజులలో మెరుగైన ఫలితాలు డాక్యుమెంట్ చేయబడ్డాయి.
• హెవీ మెటల్స్ లేని స్వచ్ఛమైన మరియు సురక్షితమైన ఫార్ములేషన్.

కాల్ బాగా చేయండి! ఏమైనా డౌట్స్ ఉంటే నన్ను అడగండి.
— ఎం. దివాకర్ రెడ్డి, Nutrova`;
  }

  // Tamil fallback
  if (lang === "ta-IN") {
    if (mode === "voice") {
      return `வணக்கம்! நான் திவாகர் ரெட்டி பேசுகிறேன். ${drName} மருத்துவரிடம் ${focus} பற்றி தைரியமாக பேசுங்கள். 5 சாம்பிள் கொடுத்து வாருங்கள்!`;
    }
    return `வணக்கம்! நான் திவாகர் ரெட்டி, நியூட்ரோவா சீனியர் BDM, பெங்களூரு 2 HQ.

${drName} மருத்துவரிடம் ${focus} பற்றி கூற வேண்டிய முக்கிய தகவல்கள்:
• 2 kDa குறைந்த மூலக்கூறு எடை கொண்ட பயோஆக்டிவ் பெப்டைடுகள் எளிதில் உறிஞ்சப்படுகின்றன.
• 60 முதல் 90 நாட்களில் சரும ஆரோக்கியத்தில் சிறந்த பலன் தரும்.
• பக்கவிளைவுகள் அற்ற சுத்தமான ஊட்டச்சத்து தயாரிப்பு.

வாழ்த்துகள்!
— திவாகர் ரெட்டி, Nutrova`;
  }

  // Malayalam fallback
  if (lang === "ml-IN") {
    if (mode === "voice") {
      return `നമസ്കാരം! ഞാൻ ദിവാകർ റെഡ്ഡിയാണ്. ഡോക്ടറോട് ${focus}-ന്റെ ക്ലിനിക്കൽ സവിശേഷതകൾ സംസാരിച്ച് സാമ്പിളുകൾ നൽകി വരൂ. ആശംസകൾ!`;
    }
    return `നമസ്കാരം! ഞാൻ ദിവാകർ റെഡ്ഡി, Nutrova സീനിയർ BDM.
${focus}-നെക്കുറിച്ച് ഡോക്ടറോട് സംസാരിക്കുമ്പോൾ 2 kDa പെപ്റ്റൈഡിന്റെ പ്രത്യേകതയും ക്ലിനിക്കൽ ഫലങ്ങളും എടുത്തുപറയുക.
— എം. ദിവാകർ റെഡ്ഡി, Nutrova`;
  }

  // Hindi fallback
  if (lang === "hi-IN") {
    if (mode === "voice") {
      return `नमस्ते! मैं दिवाकर रेड्डी बोल रहा हूँ। डॉक्टर को ${focus} के 2 किलोडाल्टन पेप्टाइड एब्जॉर्प्शन के बारे में बताएं और 5 सैंपल पैक रखकर आएं। ऑल द बेस्ट!`;
    }
    return `नमस्ते सहकर्मी! मैं एम. दिवाकर रेड्डी, न्यूट्रोवा सीनियर BDM, बैंगलोर 2 HQ।

डॉक्टर ${drName} को ${focus} डिटेल करने के मुख्य पॉइंट्स:
• हमारा 2 kDa लो मॉलिक्यूलर वेट बायोएक्टिव पेप्टाइड सीधे फाइब्रोब्लास्ट को एक्टिवेट करता है।
• 60 से 90 दिनों में क्लिनिकल रिजल्ट्स प्रमाणित हैं।
• जीरो प्रिजर्वेटिव और सेफ फॉर्मूलेशन।

कॉल अच्छे से क्लोज करें!
— एम. दिवाकर रेड्डी, Nutrova`;
  }

  // English fallback
  if (mode === "voice") {
    return `Hey colleague, Divakar here! For ${drName}, place our ${focus} as an evidence-based clinical adjunct. Highlight that our targeted formulation ensures direct absorption without heavy metals or fillers. Close the call by asking to leave five patient evaluation packs at their desk.`;
  }

  if (mode === "highlights") {
    return `Hey colleague! Divakar Reddy here. Here are the core clinical highlights for ${focus} to detail ${drName}:

• Target Mechanism: Standardized bioactive peptides with ~2 kDa molecular weight for direct receptor uptake.
• Primary Indication: Recommended for ${drSpecialty} patients alongside procedural priming and daily maintenance.
• Clinical Dosage: 1 sachet/dose daily post-meal, recommended 60–90 days course for visible cellular change.
• Divakar's Edge vs Market: 95%+ gastrointestinal absorption vs crude 10-20 kDa generic collagen; zero heavy metals or gastric bloating.

Go crack this call! Let me know how it went.
— M Divakar Reddy, BDM Nutrova`;
  }

  return `Field Detailing Guide — ${focus} (from Divakar Reddy):

Colleague, here is how I present ${focus} when detailing ${drSpecialty} prescribers:

1. Clinical Positioning:
Recommended for ${drSpecialty} patients seeking evidence-based nutritional adjuncts for dermal health, structural repair, and pigmentary or metabolic balance.

2. Core Mechanism of Action (MOA):
• Standardized bioactive actives with clinically validated absorption profiles.
• Protects endogenous tissue matrix from oxidative stress and MMP enzymatic degradation.

3. Recommended Regimen:
• Daily post-meal compliance for 60 to 90 days.
• Ideal adjunctive prescription alongside in-clinic procedures.

4. Closing Hook for ${drName}:
"Doctor, may I place 5 evaluation patient packs at your desk to observe patient compliance and outcomes firsthand?"`;
}
