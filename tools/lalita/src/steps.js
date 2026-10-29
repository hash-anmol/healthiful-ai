// Shri Lalita Sahasranama Malamantra Japavidhi (Shri Om Swami prerit)
// Source: the 27-page Hindi PDF. Instructions are in English; mantras are kept exactly as written (Devanagari + Roman).
// mode: "single" (read once), "count" (repeat N times), "lines" (one line at a time),
//       "sankalp" (filled from setup), "paath" (full stotram, N times)
// est: default seconds; the app replaces these with your own averages after a few days.

const SECTIONS = {
  "shuddhi": {
    "name": "Purification",
    "hi": "शुद्धि",
    "note": "Cleansing body and mind"
  },
  "aavahan": {
    "name": "Invocation",
    "hi": "आवाहन",
    "note": "Lamp, Ganesha, deities, guru and Earth"
  },
  "nyas": {
    "name": "Sankalpa & Nyasa",
    "hi": "संकल्प · न्यास",
    "note": "The vow, viniyoga, finger and body nyasa"
  },
  "pooja": {
    "name": "Panch Pooja",
    "hi": "पञ्चपूजा",
    "note": "Mental offering through the five elements"
  },
  "jap": {
    "name": "Malamantra Japa",
    "hi": "मालामन्त्र",
    "note": "Full Sahasranama recitation"
  },
  "samarpan": {
    "name": "Offering & Closing",
    "hi": "समर्पण",
    "note": "Dedicating the japa and asking forgiveness"
  }
};

const STEPS = [
  {
    "id": "snaan",
    "n": 1,
    "sec": "shuddhi",
    "t": "Bath",
    "th": "स्नान",
    "est": 600,
    "scene": "dawn",
    "do": "Take a bath. While bathing, recite the mantra below.",
    "bhaav": "Imagine the sacred rivers (Ganga, Yamuna, Godavari, Saraswati, Narmada, Sindhu and Kaveri) all present in the water you bathe with.",
    "m": [
      {
        "d": "गंगा च यमुने चैव गोदावरी सरस्वती ।\nनर्मदे सिन्धु कावेरी जलेऽस्मिन् संनिधिम् कुरु ॥",
        "r": "Gangā cha Yamune chaiva Godāvarī Sarasvatī |\nNarmade Sindhu Kāverī jale'smin sannidhim kuru ||"
      }
    ],
    "mode": "single"
  },
  {
    "id": "vastra",
    "n": 2,
    "sec": "shuddhi",
    "t": "Red clothes",
    "th": "लाल वस्त्र",
    "est": 180,
    "scene": "dawn",
    "do": "Put on red clothes.",
    "bhaav": "Red is the colour of Mother Lalita, radiant like a thousand rising suns. Feel yourself wrapped in her colour.",
    "m": [],
    "mode": "single"
  },
  {
    "id": "dwaar",
    "n": 3,
    "sec": "shuddhi",
    "t": "Opening the shrine",
    "th": "मन्दिर द्वार",
    "est": 60,
    "scene": "doors",
    "do": "As you open the doors of the shrine, recite this mantra three times. With each recitation, gently tap your right big toe on the floor (three taps in all).",
    "bhaav": "As the doors open, the light and fragrance of the shrine reach you.",
    "m": [
      {
        "d": "ह्रीं अस्त्राय फट् ।",
        "r": "Hrīṁ astrāya phaṭ |"
      }
    ],
    "mode": "count",
    "count": 3,
    "tap": "Tap after each recitation and toe tap"
  },
  {
    "id": "aasan",
    "n": 4,
    "sec": "shuddhi",
    "t": "Taking your seat",
    "th": "आसन",
    "est": 45,
    "scene": "aasan",
    "do": "Take your seat on the red asana. Keep your spine upright and your shoulders relaxed.",
    "bhaav": "You sit before the Mother in your own hut. Outside it is night; inside there is only the lamp's flame.",
    "m": [],
    "mode": "single"
  },
  {
    "id": "shuddhikaran",
    "n": 5,
    "sec": "shuddhi",
    "t": "Purification",
    "th": "शुद्धिकरण",
    "est": 90,
    "scene": "water",
    "do": "Take water in the palm of your right hand and recite this purification mantra. When you finish, sprinkle the water over your head and around you.",
    "bhaav": "Drops of water fall on you and around you. Inside and out, everything is being made pure.",
    "m": [
      {
        "d": "ॐ अपवित्रः पवित्रो वा सर्वावस्थां गतोऽपि वा ।\nयः स्मरेत् पुंडरीकाक्षं स बाह्याभ्यन्तरः शुचिः ॥",
        "r": "Om apavitraḥ pavitro vā sarvāvasthāṁ gato'pi vā |\nYaḥ smaret puṇḍarīkākṣaṁ sa bāhyābhyantaraḥ śuchiḥ ||"
      }
    ],
    "mode": "single"
  },
  {
    "id": "aachaman",
    "n": 6,
    "sec": "shuddhi",
    "t": "Aachamana (sipping water)",
    "th": "आचमन",
    "est": 120,
    "scene": "water",
    "do": "Take water in your right palm again and say the three mantras, then sip the water. Next, take water once more and say 'Om Shrimatre Namah'. Wash your hands with that water and wipe them with the napkin beside you.",
    "bhaav": "As the water goes in, Gayatri, Tripura and Savitri awaken within you.",
    "m": [
      {
        "d": "ऐं गायत्र्यै नमः ।\nह्रीं त्रिपुरायै नमः ।\nश्रीं सावित्र्यै नमः ।",
        "r": "Aiṁ Gāyatryai namaḥ |\nHrīṁ Tripurāyai namaḥ |\nŚrīṁ Sāvitryai namaḥ |",
        "note": "Then sip the water"
      },
      {
        "d": "ॐ श्रीमात्रे नमः ।",
        "r": "Om Śrīmātre namaḥ |",
        "note": "Wash your hands with this water and wipe them with the napkin"
      }
    ],
    "mode": "single"
  },
  {
    "id": "deep",
    "n": 7,
    "sec": "aavahan",
    "t": "Lighting the lamp",
    "th": "दीप प्रज्वलन",
    "est": 120,
    "scene": "lamp",
    "do": "Now it is time to light the lamp in the shrine. Light it while reciting this mantra.",
    "bhaav": "As the flame takes, the whole hut fills with golden light. This fire is the light, and this is the sun.",
    "m": [
      {
        "d": "ॐ अग्निर्ज्योतिर्ज्योतिरग्निः स्वाहा ।\nसूर्यो ज्योतिर्ज्योतिः सूर्यः स्वाहा ।\nअग्निर्वर्चो ज्योतिर्वर्चः स्वाहा ।\nसूर्यो वर्चो ज्योतिर्वर्चः स्वाहा ।\nज्योतिः सूर्यः सूर्यो ज्योतिः स्वाहा ॥",
        "r": "Om agnir jyotir jyotir agniḥ svāhā |\nSūryo jyotir jyotiḥ sūryaḥ svāhā |\nAgnir varcho jyotir varchaḥ svāhā |\nSūryo varcho jyotir varchaḥ svāhā |\nJyotiḥ sūryaḥ sūryo jyotiḥ svāhā ||"
      }
    ],
    "mode": "single"
  },
  {
    "id": "ganapati",
    "n": 8,
    "sec": "aavahan",
    "t": "Invoking Mahaganapati",
    "th": "महागणपति आवाहन",
    "est": 300,
    "scene": "ganesh",
    "do": "Now invoke Lord Mahaganapati: first the Vakratunda mantra, then the twelve names of Ganesha, then the Ganesha invocation. Finally, chant 'Shri Ganeshaya Namah' while performing the three mudras.",
    "bhaav": "Ganesha takes his place on the left of the shrine. All obstacles are being cleared.",
    "mode": "lines",
    "lines": [
      {
        "k": "Vakratunda",
        "d": "वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ ।\nनिर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा ॥",
        "r": "Vakratuṇḍa mahākāya sūryakoṭi samaprabha |\nNirvighnaṁ kuru me deva sarvakāryeṣu sarvadā ||"
      },
      {
        "k": "Twelve names of Ganesha",
        "d": "सुमुखश्च एकदन्तश्च कपिलो गजकर्णकः ।\nलम्बोदरश्च विकटो विघ्ननाशो विनायकः ॥\nधूम्रकेतुर्गणाध्यक्षो भालचन्द्रो गजाननः ।\nद्वादशैतानि नामानि यः पठेच्छृणुयादपि ॥\nविद्यारम्भे विवाहे च प्रवेशे निर्गमे तथा ।\nसंग्रामे संकटे चैव विघ्नस्तस्य न जायते ॥",
        "r": "Sumukhaścha ekadantaścha kapilo gajakarṇakaḥ |\nLambodaraścha vikaṭo vighnanāśo vināyakaḥ ||\nDhūmraketur gaṇādhyakṣo bhālachandro gajānanaḥ |\nDvādaśaitāni nāmāni yaḥ paṭhech chhṛṇuyād api ||\nVidyārambhe vivāhe cha praveśe nirgame tathā |\nSaṅgrāme saṅkaṭe chaiva vighnas tasya na jāyate ||"
      },
      {
        "k": "Ganesha invocation",
        "d": "ॐ गणानां त्वा गणपति(गुँ) हवामहे\nप्रियाणां त्वा प्रियपति(गुँ) हवामहे\nनिधीनां त्वा निधिपति(गुँ) हवामहे\nवसो मम आहमजानि गर्भधमात्वमजासि गर्भधम् ॥",
        "r": "Om gaṇānāṁ tvā gaṇapati(guṁ) havāmahe\nPriyāṇāṁ tvā priyapati(guṁ) havāmahe\nNidhīnāṁ tvā nidhipati(guṁ) havāmahe\nVaso mama āham ajāni garbhadham ā tvam ajāsi garbhadham ||"
      },
      {
        "k": "Three mudras and japa",
        "d": "श्री गणेशाय नमः",
        "r": "Śrī Gaṇeśāya namaḥ",
        "counter": true,
        "how": "Perform the three Ganesha mudras shown in the photo on page 3 of your PDF, one by one, chanting 'Shri Ganeshaya Namah' with each. Tap to count."
      }
    ]
  },
  {
    "id": "devta",
    "n": 9,
    "sec": "aavahan",
    "t": "Salutations to the deities",
    "th": "देवता नमन",
    "est": 120,
    "scene": "altar",
    "do": "Bow to the deities one by one. Fold your hands at each line.",
    "bhaav": "With each name, a deity arrives and takes a seat in your hut.",
    "mode": "lines",
    "lines": [
      {
        "d": "ॐ श्री सिद्धिबुद्धिसहिताय श्रीमन्महागणाधिपतये नमः ।",
        "r": "Om śrī siddhi-buddhi-sahitāya śrīman-mahāgaṇādhipataye namaḥ |"
      },
      {
        "d": "ॐ लक्ष्मीनारायणाभ्यां नमः ।",
        "r": "Om Lakṣmī-Nārāyaṇābhyāṁ namaḥ |"
      },
      {
        "d": "ॐ उमामहेश्वराभ्यां नमः ।",
        "r": "Om Umā-Maheśvarābhyāṁ namaḥ |"
      },
      {
        "d": "ॐ वाणीहिरण्यगर्भाभ्यां नमः ।",
        "r": "Om Vāṇī-Hiraṇyagarbhābhyāṁ namaḥ |"
      },
      {
        "d": "ॐ शचीपुरन्दराभ्यां नमः ।",
        "r": "Om Śachī-Purandarābhyāṁ namaḥ |"
      },
      {
        "d": "ॐ मातृपितृचरणकमलेभ्यो नमः ।",
        "r": "Om mātṛ-pitṛ-charaṇa-kamalebhyo namaḥ |"
      },
      {
        "d": "ॐ इष्टदेवताभ्यो नमः ।",
        "r": "Om iṣṭa-devatābhyo namaḥ |"
      },
      {
        "d": "ॐ कुलदेवताभ्यो नमः ।",
        "r": "Om kula-devatābhyo namaḥ |"
      },
      {
        "d": "ॐ ग्रामदेवताभ्यो नमः ।",
        "r": "Om grāma-devatābhyo namaḥ |"
      },
      {
        "d": "ॐ स्थानदेवताभ्यो नमः ।",
        "r": "Om sthāna-devatābhyo namaḥ |"
      },
      {
        "d": "ॐ वास्तुदेवताभ्यो नमः ।",
        "r": "Om vāstu-devatābhyo namaḥ |"
      },
      {
        "d": "ॐ सर्वेभ्यो देवेभ्यो नमः ।",
        "r": "Om sarvebhyo devebhyo namaḥ |"
      },
      {
        "d": "ॐ सर्वेभ्यो ब्राह्मणेभ्यो नमः ।",
        "r": "Om sarvebhyo brāhmaṇebhyo namaḥ |"
      },
      {
        "d": "ॐ सर्वेभ्यो तीर्थेभ्यो नमः ।",
        "r": "Om sarvebhyo tīrthebhyo namaḥ |"
      },
      {
        "d": "ॐ एतत् कर्म प्रधानदेवताभ्यो नमः ।",
        "r": "Om etat karma pradhāna-devatābhyo namaḥ |"
      }
    ]
  },
  {
    "id": "swasti",
    "n": 10,
    "sec": "aavahan",
    "t": "Swasti Vachana",
    "th": "स्वस्ति वाचन",
    "est": 90,
    "scene": "altar",
    "do": "Recite the Swasti Vachana for peace and wellbeing.",
    "bhaav": "May your ears hear only what is auspicious and your eyes see only what is auspicious. Blessings arrive from every direction.",
    "m": [
      {
        "d": "ॐ भद्रं कर्णेभिः शृणुयाम देवाः भद्रं पश्येमाक्षभिर्यजत्राः ।\nस्थिरैरङ्गैस्तुष्टुवाँसस्तनूभिः व्यशेम देवहितं यदायुः ॥\nस्वस्ति न इन्द्रो वृद्धश्रवाः स्वस्ति नः पूषा विश्ववेदाः ।\nस्वस्ति नस्तार्क्ष्यो अरिष्टनेमिः स्वस्ति नो बृहस्पतिर्दधातु ॥\nॐ शान्तिः शान्तिः शान्तिः ॥",
        "r": "Om bhadraṁ karṇebhiḥ śṛṇuyāma devāḥ bhadraṁ paśyemākṣabhir yajatrāḥ |\nSthirair aṅgais tuṣṭuvāṁsas tanūbhiḥ vyaśema devahitaṁ yad āyuḥ ||\nSvasti na Indro vṛddhaśravāḥ svasti naḥ Pūṣā viśvavedāḥ |\nSvasti nas Tārkṣyo ariṣṭanemiḥ svasti no Bṛhaspatir dadhātu ||\nOm śāntiḥ śāntiḥ śāntiḥ ||"
      }
    ],
    "mode": "single"
  },
  {
    "id": "guru",
    "n": 11,
    "sec": "aavahan",
    "t": "Remembering the guru",
    "th": "गुरु स्मरण",
    "est": 90,
    "scene": "altar",
    "do": "If you are initiated by a guru, remember them now. Otherwise establish Dakshinamurti as your guru in your mind and recite this mantra.",
    "bhaav": "The guru sits in your heart as a quiet light.",
    "m": [
      {
        "d": "गुरुर्ब्रह्मा गुरुर्विष्णुः गुरुर्देवो महेश्वरः ।\nगुरुः साक्षात् परब्रह्म तस्मै श्री गुरवे नमः ॥\nअखण्डमण्डलाकारं व्याप्तं येन चराचरम् ।\nतत्पदं दर्शितं येन तस्मै श्री गुरवे नमः ॥",
        "r": "Gurur Brahmā gurur Viṣṇuḥ gurur devo Maheśvaraḥ |\nGuruḥ sākṣāt parabrahma tasmai śrī gurave namaḥ ||\nAkhaṇḍa-maṇḍalākāraṁ vyāptaṁ yena charācharam |\nTatpadaṁ darśitaṁ yena tasmai śrī gurave namaḥ ||"
      }
    ],
    "mode": "single"
  },
  {
    "id": "siddh",
    "n": 12,
    "sec": "aavahan",
    "t": "Salutation to the siddhas",
    "th": "सिद्ध वंदन",
    "est": 40,
    "scene": "altar",
    "do": "Bow to the great realised souls (siddhas) of Bharatvarsh.",
    "bhaav": "Salutations to the divine, the siddha and the human lineages of teachers.",
    "m": [
      {
        "d": "ॐ दिव्यौघ नमः ।\nॐ सिद्धौघ नमः ।\nॐ मानवौघ नमः ।",
        "r": "Om divyaugha namaḥ |\nOm siddhaugha namaḥ |\nOm mānavaugha namaḥ |"
      }
    ],
    "mode": "single"
  },
  {
    "id": "prithvi",
    "n": 13,
    "sec": "aavahan",
    "t": "Worship of the Earth",
    "th": "पृथ्वी पूजा",
    "est": 90,
    "scene": "earth",
    "do": "First chant 'Hreem Aadhaarashaktyai Namah', then recite the Earth mantra below.",
    "bhaav": "Mother Earth holds your seat. You are steady and safe.",
    "mode": "lines",
    "lines": [
      {
        "k": "Foundation Shakti",
        "d": "ह्रीं आधारशक्त्यै नमः ।",
        "r": "Hrīṁ ādhāra-śaktyai namaḥ |",
        "counter": true,
        "how": "Tap to count the japa (the PDF gives no number)."
      },
      {
        "k": "Earth mantra",
        "d": "ॐ पृथ्वी त्वया धृता लोका देवी त्वम् विष्णुना धृता ।\nत्वम् च धारय मां देवी पवित्रं कुरु चासनम् ॥",
        "r": "Om pṛthvī tvayā dhṛtā lokā devī tvaṁ Viṣṇunā dhṛtā |\nTvaṁ cha dhāraya māṁ devī pavitraṁ kuru chāsanam ||"
      }
    ]
  },
  {
    "id": "sankalp",
    "n": 14,
    "sec": "nyas",
    "t": "Sankalpa (the vow)",
    "th": "संकल्प",
    "est": 180,
    "scene": "water",
    "day1": true,
    "do": "Take this vow only on the FIRST day of your sadhana. Take water in your right palm and recite the statement below in your own language. After the vow you may release the water into a panchpatra. It should later be poured at the root of a plant.",
    "bhaav": "Your vow ties itself like a golden thread to the Mother's feet.",
    "mode": "sankalp"
  },
  {
    "id": "viniyog",
    "n": 15,
    "sec": "nyas",
    "t": "Mantra viniyoga",
    "th": "मन्त्र विनियोग",
    "est": 90,
    "scene": "yantra",
    "do": "Take water in your right palm and recite the viniyoga below.",
    "bhaav": "Light flows from the centre (bindu) of the Sri Yantra into the water in your palm.",
    "m": [
      {
        "d": "ॐ अस्य श्रीललितासहस्रनामस्तोत्रमाला-महामन्त्रस्य\nवशिन्यादिवाग्देवता ऋषयः । अनुष्टुप्छन्दः ।\nश्रीललितापरमेश्वरी देवता ।\nश्रीमद्वाग्भवकूटेति बीजम् । मध्यकूटेति शक्तिः ।\nशक्तिकूटेति कीलकम् ।\nश्रीललितामहात्रिपुरसुन्दरी-प्रसादसिद्धिद्वारा\nचिन्तितफलावाप्त्यर्थे जपे विनियोगः ।",
        "r": "Om asya Śrī-Lalitā-sahasranāma-stotramālā-mahāmantrasya\nVaśinyādi-vāgdevatā ṛṣayaḥ | Anuṣṭup chhandaḥ |\nŚrī-Lalitā-parameśvarī devatā |\nŚrīmad-vāgbhava-kūṭeti bījam | Madhya-kūṭeti śaktiḥ |\nŚakti-kūṭeti kīlakam |\nŚrī-Lalitā-mahātripurasundarī-prasāda-siddhi-dvārā\nchintita-phalāvāptyarthe jape viniyogaḥ |"
      }
    ],
    "mode": "single"
  },
  {
    "id": "karnyas",
    "n": 16,
    "sec": "nyas",
    "t": "Kara nyasa (fingers)",
    "th": "कर न्यास",
    "est": 90,
    "scene": "yantra",
    "hand": true,
    "do": "Touch the finger named in each mantra. Feel the seed syllables (bija mantras) being placed in your fingers.",
    "bhaav": "A small golden lamp lights on each finger.",
    "mode": "lines",
    "lines": [
      {
        "d": "ॐ ऐं अङ्गुष्ठाभ्यां नमः ।",
        "r": "Om aiṁ aṅguṣṭhābhyāṁ namaḥ |",
        "f": 0,
        "how": "Touch both thumbs with both index fingers."
      },
      {
        "d": "ॐ क्लीं तर्जनीभ्यां नमः ।",
        "r": "Om klīṁ tarjanībhyāṁ namaḥ |",
        "f": 1,
        "how": "Touch the index finger with the thumb."
      },
      {
        "d": "ॐ सौः मध्यमाभ्यां नमः ।",
        "r": "Om sauḥ madhyamābhyāṁ namaḥ |",
        "f": 2,
        "how": "Touch the middle finger with the thumb."
      },
      {
        "d": "ॐ सौः अनामिकाभ्यां नमः ।",
        "r": "Om sauḥ anāmikābhyāṁ namaḥ |",
        "f": 3,
        "how": "Touch the ring finger with the thumb."
      },
      {
        "d": "ॐ क्लीं कनिष्ठिकाभ्यां नमः ।",
        "r": "Om klīṁ kaniṣṭhikābhyāṁ namaḥ |",
        "f": 4,
        "how": "Touch the little finger with the thumb."
      },
      {
        "d": "ॐ ऐं करतलकरपृष्ठाभ्यां नमः ।",
        "r": "Om aiṁ karatala-karapṛṣṭhābhyāṁ namaḥ |",
        "f": 5,
        "how": "Rub the palm and back of one hand with the other, then switch."
      }
    ]
  },
  {
    "id": "angnyas",
    "n": 17,
    "sec": "nyas",
    "t": "Anga nyasa (body)",
    "th": "अङ्ग न्यास",
    "est": 90,
    "scene": "yantra",
    "do": "With each mantra, touch the body part named, using your right hand.",
    "bhaav": "Your whole body becomes a temple: heart, head, crown, armour, eyes, each filled with the Mother's power.",
    "mode": "lines",
    "lines": [
      {
        "d": "ॐ ऐं हृदयाय नमः ।",
        "r": "Om aiṁ hṛdayāya namaḥ |",
        "how": "Touch the heart (centre of the chest) with your fingertips."
      },
      {
        "d": "ॐ क्लीं शिरसे स्वाहा ।",
        "r": "Om klīṁ śirase svāhā |",
        "how": "Touch the forehead and the top of the head."
      },
      {
        "d": "ॐ सौः शिखायै वषट् ।",
        "r": "Om sauḥ śikhāyai vaṣaṭ |",
        "how": "Touch the crown of the head at the back (shikha) with your thumb."
      },
      {
        "d": "ॐ सौः कवचाय हुम् ।",
        "r": "Om sauḥ kavachāya hum |",
        "how": "Cross your arms and touch both shoulders, as if putting on armour."
      },
      {
        "d": "ॐ क्लीं नेत्रत्रयाय वौषट् ।",
        "r": "Om klīṁ netratrayāya vauṣaṭ |",
        "how": "Touch both eyes and the space between the eyebrows with three fingers."
      },
      {
        "d": "ॐ ऐं अस्त्राय फट् ।",
        "r": "Om aiṁ astrāya phaṭ |",
        "how": "Circle your right hand over your head and clap lightly on your left palm."
      },
      {
        "d": "ॐ भूर्भुवस्सुवरोमिति दिग्बन्धः ।",
        "r": "Om bhūr bhuvas suvar om iti digbandhaḥ |",
        "how": "Snap your fingers and circle your hand around your head to seal the ten directions."
      }
    ],
    "note": "How to perform: written from the traditional method. The PDF gives only the mantras."
  },
  {
    "id": "panchpooja",
    "n": 18,
    "sec": "pooja",
    "t": "Panch Pooja (five offerings)",
    "th": "लमित्यादि पञ्चपूजा",
    "est": 240,
    "scene": "offer",
    "do": "Now offer worship to Mother Lalita through the five elements, mentally and physically if you can. Offer the item named on each line.",
    "bhaav": "See each offering in your mind: sandalwood fragrance, flowers at her feet, incense smoke, the lamp's flame, the sweetness of the food.",
    "mode": "lines",
    "lines": [
      {
        "k": "Gandha: sandalwood paste",
        "fx": "chandan",
        "d": "लं पृथ्वीतत्त्वात्मिकायै श्रीललितादेव्यै गन्धं परिकल्पयामि ।",
        "r": "Laṁ pṛthvī-tattvātmikāyai Śrī-Lalitā-devyai gandhaṁ parikalpayāmi |",
        "how": "Offer sandalwood paste."
      },
      {
        "k": "Pushpa: flowers at her feet",
        "fx": "petals",
        "d": "हं आकाशतत्त्वात्मिकायै श्रीललितादेव्यै पुष्पं परिकल्पयामि ।",
        "r": "Haṁ ākāśa-tattvātmikāyai Śrī-Lalitā-devyai puṣpaṁ parikalpayāmi |",
        "how": "Offer flowers at the Mother's feet."
      },
      {
        "k": "Dhupa: guggal incense",
        "fx": "smoke",
        "d": "यं वायुतत्त्वात्मिकायै श्रीललितादेव्यै धूपं परिकल्पयामि ।",
        "r": "Yaṁ vāyu-tattvātmikāyai Śrī-Lalitā-devyai dhūpaṁ parikalpayāmi |",
        "how": "Show guggal incense."
      },
      {
        "k": "Deepa: the lit lamp",
        "fx": "lamp",
        "d": "रं वह्नितत्त्वात्मिकायै श्रीललितादेव्यै दीपं परिकल्पयामि ।",
        "r": "Raṁ vahni-tattvātmikāyai Śrī-Lalitā-devyai dīpaṁ parikalpayāmi |",
        "how": "Show the lit lamp."
      },
      {
        "k": "Naivedya: food offering",
        "fx": "bhog",
        "d": "वं अमृततत्त्वात्मिकायै श्रीललितादेव्यै अमृतनैवेद्यं परिकल्पयामि ।",
        "r": "Vaṁ amṛta-tattvātmikāyai Śrī-Lalitā-devyai amṛta-naivedyaṁ parikalpayāmi |",
        "how": "Offer the food (bhog)."
      },
      {
        "k": "Sarvopachara: betel leaf and all offerings",
        "fx": "all",
        "d": "सं सर्वतत्त्वात्मिकायै श्रीललितादेव्यै ताम्बूलादि सर्वोपचारान् परिकल्पयामि ।",
        "r": "Saṁ sarva-tattvātmikāyai Śrī-Lalitā-devyai tāmbūlādi sarvopachārān parikalpayāmi |",
        "how": "Offer betel leaf and all other offerings."
      }
    ]
  },
  {
    "id": "paath",
    "n": 19,
    "sec": "jap",
    "t": "Malamantra japa",
    "th": "मूल मन्त्रजप · मालामन्त्र",
    "est": 1320,
    "scene": "paath",
    "do": "Recite the complete Shri Lalita Sahasranama Stotram: at least five (5) times, or as per your sankalpa.",
    "bhaav": "With every name a flower falls at her feet. A thousand names, a thousand flowers.",
    "m": [
      {
        "d": "॥ अथ श्रीललितासहस्रनामस्तोत्रम् ॥",
        "r": "|| Atha Śrī-Lalitā-sahasranāma-stotram ||"
      }
    ],
    "end": {
      "d": "श्रीशिवा शिवशक्त्यैक्यरूपिणी ललिताम्बिका ।\nएवं श्रीललितादेव्या नाम्नां साहस्रकं जगुः ॥\n॥ इति श्रीब्रह्माण्डपुराणे उत्तरखण्डे श्रीहयग्रीवागस्त्यसंवादे\nश्रीललितासहस्रनामस्तोत्रकथनं सम्पूर्णम् ॥",
      "r": "Śrī-śivā śiva-śaktyaikya-rūpiṇī Lalitāmbikā |\nEvaṁ Śrī-Lalitā-devyā nāmnāṁ sāhasrakaṁ jaguḥ ||"
    },
    "mode": "paath"
  },
  {
    "id": "samarpan",
    "n": 20,
    "sec": "samarpan",
    "t": "Dedicating the japa",
    "th": "जप समर्पण",
    "est": 45,
    "scene": "offer-all",
    "do": "Dedicate all of your japa to the Mother.",
    "bhaav": "Everything you chanted becomes a golden lotus placed in her hands.",
    "m": [
      {
        "d": "अभीष्टसिद्धिं मे देहि शरणागतवत्सले ।\nभक्त्या समर्पये तुभ्यं जपमेवार्चनम् ॥",
        "r": "Abhīṣṭa-siddhiṁ me dehi śaraṇāgata-vatsale |\nBhaktyā samarpaye tubhyaṁ japam evārchanam ||"
      }
    ],
    "mode": "single"
  },
  {
    "id": "kshama",
    "n": 21,
    "sec": "samarpan",
    "t": "Asking forgiveness",
    "th": "अपराधक्षमापन",
    "est": 90,
    "scene": "offer-all",
    "do": "Ask forgiveness for any mistakes in the worship, then say the closing offering lines.",
    "bhaav": "The Mother smiles and accepts everything. Whatever was lacking is made complete.",
    "m": [
      {
        "d": "अपराधसहस्राणि क्रियन्तेऽहर्निशं मया ।\nदासोऽयमिति मां मत्वा क्षमस्व परमेश्वर ॥\nआवाहनं न जानामि न जानामि विसर्जनम् ।\nपूजां चैव न जानामि क्षम्यतां परमेश्वर ॥\nमन्त्रहीनं क्रियाहीनं भक्तिहीनं सुरेश्वर ।\nयत्पूजितं मया देव परिपूर्णं तदस्तु मे ॥",
        "r": "Aparādha-sahasrāṇi kriyante'harniśaṁ mayā |\nDāso'yam iti māṁ matvā kṣamasva parameśvara ||\nĀvāhanaṁ na jānāmi na jānāmi visarjanam |\nPūjāṁ chaiva na jānāmi kṣamyatāṁ parameśvara ||\nMantrahīnaṁ kriyāhīnaṁ bhaktihīnaṁ sureśvara |\nYat pūjitaṁ mayā deva paripūrṇaṁ tad astu me ||"
      },
      {
        "d": "श्री जगदम्बा अर्पणमस्तु ।\nमहागुरु श्री ओम स्वामी अर्पणमस्तु ॥",
        "r": "Śrī Jagadambā arpaṇam astu |\nMahāguru Śrī Om Swāmī arpaṇam astu ||"
      }
    ],
    "mode": "single"
  }
];

const SAMAGRI = [
  [
    "Red clothes",
    "To wear"
  ],
  [
    "Red asana",
    "To sit on"
  ],
  [
    "Panchpatra and spoon",
    "For the water"
  ],
  [
    "Napkin",
    "To wipe your hands"
  ],
  [
    "Lamp, ghee or oil",
    "With wick and matches"
  ],
  [
    "Guggal incense",
    "Or incense sticks"
  ],
  [
    "Sandalwood paste",
    "For the offering"
  ],
  [
    "Flowers",
    "Red ones preferred"
  ],
  [
    "Naivedya (food offering)",
    "Mishri, fruit or sweets"
  ],
  [
    "Betel leaf (tambula)",
    "Paan and supari"
  ],
  [
    "Sahasranama book",
    "Or use the in-app reading mode"
  ],
  [
    "Phone on silent",
    "No interruptions"
  ]
];

const SANKALP = {
  d: (s) => `मैं ${s.name || "(आपका नाम)"}… ${s.gotra ? s.gotra + " गोत्र" : "(गोत्र का उच्चारण)"}… ${s.dob || "(जन्मतारीख)"}… आज से ${s.days || "५० अथवा ३१"} दिनों तक श्रीललितासहस्रनामस्तोत्र की साधना करने का संकल्प लेता/लेती हूँ। मेरी प्रार्थना है कि मुझे आत्मविद्या महाविद्या श्रीविद्या - जगदम्बा माँ ललिता महात्रिपुरसुन्दरी की अपार कृपा प्राप्त हो एवं ${s.wish || "(आपकी विशिष्ट इच्छा/लक्ष्य)"} सभी प्राणियों के कल्याण हेतु पूर्ण हो। श्रीमाता ललिता परमेश्वरी एवं नित्यादेवी, योगिनी, यक्षिणी सहित उनकी सभी संगिनी-शक्तियाँ मेरे इस संकल्प को पूर्ण करने में सहायक हों।`,
  r: (s) => `I, ${s.name || "(your name)"}, of ${s.gotra ? s.gotra + " gotra" : "(your gotra)"}, born on ${s.dob || "(your date of birth)"}, take the vow from today to perform the Shri Lalita Sahasranama Stotra sadhana for ${s.days || "31 or 50"} days. It is my prayer that I receive the boundless grace of the Mother, Atmavidya, Mahavidya, Shrividya, Jagadamba Lalita Mahatripurasundari, and that ${s.wish || "(your specific wish or goal)"}, for the wellbeing of all beings, be fulfilled. May Shrimata Lalita Parameshwari, together with the Nityadevis, Yoginis, Yakshinis and all her accompanying shaktis, help me complete this vow.`
};

if (typeof module !== "undefined") module.exports = { SECTIONS, STEPS, SAMAGRI, SANKALP };
