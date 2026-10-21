// Extracted from the user-provided L’adjectif sheet (page 64).
const ADJECTIVES = [
  {
    "id": "grand",
    "n": 1,
    "forms": {
      "ms": [
        "grand"
      ],
      "fs": [
        "grande"
      ],
      "mp": [
        "grands"
      ],
      "fp": [
        "grandes"
      ]
    },
    "de": [
      "gross",
      "groß",
      "gross gewachsen",
      "groß gewachsen"
    ],
    "dePrompt": "gross",
    "group": "Lernwörter und Beispiele",
    "note": "Steigerung wie im Blatt: plus grand, moins grand, aussi grand; le plus grand / le moins grand."
  },
  {
    "id": "jeune",
    "n": 2,
    "forms": {
      "ms": [
        "jeune"
      ],
      "fs": [
        "jeune"
      ],
      "mp": [
        "jeunes"
      ],
      "fp": [
        "jeunes"
      ]
    },
    "de": [
      "jung"
    ],
    "dePrompt": "jung",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "rouge",
    "n": 3,
    "forms": {
      "ms": [
        "rouge"
      ],
      "fs": [
        "rouge"
      ],
      "mp": [
        "rouges"
      ],
      "fp": [
        "rouges"
      ]
    },
    "de": [
      "rot"
    ],
    "dePrompt": "rot",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "sportif",
    "n": 4,
    "forms": {
      "ms": [
        "sportif"
      ],
      "fs": [
        "sportive"
      ],
      "mp": [
        "sportifs"
      ],
      "fp": [
        "sportives"
      ]
    },
    "de": [
      "sportlich"
    ],
    "dePrompt": "sportlich",
    "group": "Lernwörter und Beispiele",
    "note": "Superlativ wie im Blatt: les plus sportifs."
  },
  {
    "id": "neuf",
    "n": 5,
    "forms": {
      "ms": [
        "neuf"
      ],
      "fs": [
        "neuve"
      ],
      "mp": [
        "neufs"
      ],
      "fp": [
        "neuves"
      ]
    },
    "de": [
      "neu",
      "fabrikneu",
      "nagelneu"
    ],
    "dePrompt": "fabrikneu",
    "group": "Lernwörter und Beispiele",
    "note": "Fabrikneu, noch unbenutzt; nouveau kann auch ein anderes Exemplar meinen."
  },
  {
    "id": "curieux",
    "n": 6,
    "forms": {
      "ms": [
        "curieux"
      ],
      "fs": [
        "curieuse"
      ],
      "mp": [
        "curieux"
      ],
      "fp": [
        "curieuses"
      ]
    },
    "de": [
      "neugierig",
      "merkwürdig",
      "seltsam"
    ],
    "dePrompt": "neugierig",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "sérieux",
    "n": 7,
    "forms": {
      "ms": [
        "sérieux"
      ],
      "fs": [
        "sérieuse"
      ],
      "mp": [
        "sérieux"
      ],
      "fp": [
        "sérieuses"
      ]
    },
    "de": [
      "ernst",
      "ernsthaft",
      "seriös"
    ],
    "dePrompt": "ernsthaft",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "premier",
    "n": 8,
    "forms": {
      "ms": [
        "premier"
      ],
      "fs": [
        "première"
      ],
      "mp": [
        "premiers"
      ],
      "fp": [
        "premières"
      ]
    },
    "de": [
      "erste",
      "erster",
      "erstes",
      "erst"
    ],
    "dePrompt": "erste / erster",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "étranger",
    "n": 9,
    "forms": {
      "ms": [
        "étranger"
      ],
      "fs": [
        "étrangère"
      ],
      "mp": [
        "étrangers"
      ],
      "fp": [
        "étrangères"
      ]
    },
    "de": [
      "fremd",
      "ausländisch"
    ],
    "dePrompt": "fremd / ausländisch",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "italien",
    "n": 10,
    "forms": {
      "ms": [
        "italien"
      ],
      "fs": [
        "italienne"
      ],
      "mp": [
        "italiens"
      ],
      "fp": [
        "italiennes"
      ]
    },
    "de": [
      "italienisch"
    ],
    "dePrompt": "italienisch",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "ancien",
    "n": 11,
    "forms": {
      "ms": [
        "ancien"
      ],
      "fs": [
        "ancienne"
      ],
      "mp": [
        "anciens"
      ],
      "fp": [
        "anciennes"
      ]
    },
    "de": [
      "ehemalig",
      "antik",
      "alt",
      "früher"
    ],
    "dePrompt": "ehemalig / antik",
    "group": "Lernwörter und Beispiele",
    "note": "Vor dem Nomen: ehemalig. Nach dem Nomen: alt, antik."
  },
  {
    "id": "naturel",
    "n": 12,
    "forms": {
      "ms": [
        "naturel"
      ],
      "fs": [
        "naturelle"
      ],
      "mp": [
        "naturels"
      ],
      "fp": [
        "naturelles"
      ]
    },
    "de": [
      "natürlich"
    ],
    "dePrompt": "natürlich",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "ponctuel",
    "n": 13,
    "forms": {
      "ms": [
        "ponctuel"
      ],
      "fs": [
        "ponctuelle"
      ],
      "mp": [
        "ponctuels"
      ],
      "fp": [
        "ponctuelles"
      ]
    },
    "de": [
      "pünktlich"
    ],
    "dePrompt": "pünktlich",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "bas",
    "n": 14,
    "forms": {
      "ms": [
        "bas"
      ],
      "fs": [
        "basse"
      ],
      "mp": [
        "bas"
      ],
      "fp": [
        "basses"
      ]
    },
    "de": [
      "niedrig",
      "tief"
    ],
    "dePrompt": "niedrig / tief",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "gros",
    "n": 15,
    "forms": {
      "ms": [
        "gros"
      ],
      "fs": [
        "grosse"
      ],
      "mp": [
        "gros"
      ],
      "fp": [
        "grosses"
      ]
    },
    "de": [
      "dick",
      "gross",
      "groß",
      "umfangreich"
    ],
    "dePrompt": "dick / umfangreich",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "fou",
    "n": 16,
    "forms": {
      "ms": [
        "fou"
      ],
      "fs": [
        "folle"
      ],
      "mp": [
        "fous"
      ],
      "fp": [
        "folles"
      ]
    },
    "de": [
      "verrückt",
      "wahnsinnig"
    ],
    "dePrompt": "verrückt",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "beau",
    "n": 17,
    "forms": {
      "ms": [
        "beau"
      ],
      "fs": [
        "belle"
      ],
      "mp": [
        "beaux"
      ],
      "fp": [
        "belles"
      ]
    },
    "de": [
      "schön"
    ],
    "dePrompt": "schön",
    "group": "Lernwörter und Beispiele",
    "note": "Vor Vokal oder stummem h im maskulinen Singular: bel (bel ami, bel homme).",
    "beforeVowel": "bel"
  },
  {
    "id": "nouveau",
    "n": 18,
    "forms": {
      "ms": [
        "nouveau"
      ],
      "fs": [
        "nouvelle"
      ],
      "mp": [
        "nouveaux"
      ],
      "fp": [
        "nouvelles"
      ]
    },
    "de": [
      "neu",
      "neuartig"
    ],
    "dePrompt": "neu (ein anderes / weiteres Exemplar)",
    "group": "Lernwörter und Beispiele",
    "note": "Vor Vokal oder stummem h im maskulinen Singular: nouvel. Nouveau bedeutet neu/anders; neuf betont fabrikneu.",
    "beforeVowel": "nouvel"
  },
  {
    "id": "faux",
    "n": 19,
    "forms": {
      "ms": [
        "faux"
      ],
      "fs": [
        "fausse"
      ],
      "mp": [
        "faux"
      ],
      "fp": [
        "fausses"
      ]
    },
    "de": [
      "falsch",
      "unecht"
    ],
    "dePrompt": "falsch",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "doux",
    "n": 20,
    "forms": {
      "ms": [
        "doux"
      ],
      "fs": [
        "douce"
      ],
      "mp": [
        "doux"
      ],
      "fp": [
        "douces"
      ]
    },
    "de": [
      "sanft",
      "weich",
      "mild",
      "süss",
      "süß"
    ],
    "dePrompt": "sanft / weich",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "sec",
    "n": 21,
    "forms": {
      "ms": [
        "sec"
      ],
      "fs": [
        "sèche"
      ],
      "mp": [
        "secs"
      ],
      "fp": [
        "sèches"
      ]
    },
    "de": [
      "trocken"
    ],
    "dePrompt": "trocken",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "long",
    "n": 22,
    "forms": {
      "ms": [
        "long"
      ],
      "fs": [
        "longue"
      ],
      "mp": [
        "longs"
      ],
      "fp": [
        "longues"
      ]
    },
    "de": [
      "lang"
    ],
    "dePrompt": "lang",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "vieux",
    "n": 23,
    "forms": {
      "ms": [
        "vieux"
      ],
      "fs": [
        "vieille"
      ],
      "mp": [
        "vieux"
      ],
      "fp": [
        "vieilles"
      ]
    },
    "de": [
      "alt",
      "langjährig"
    ],
    "dePrompt": "alt (Lebensalter) / langjährig",
    "group": "Lernwörter und Beispiele",
    "note": "Vor dem Nomen auch langjährig; nach dem Nomen das Lebensalter. Vor Vokal oder stummem h im maskulinen Singular: vieil.",
    "beforeVowel": "vieil"
  },
  {
    "id": "blanc",
    "n": 24,
    "forms": {
      "ms": [
        "blanc"
      ],
      "fs": [
        "blanche"
      ],
      "mp": [
        "blancs"
      ],
      "fp": [
        "blanches"
      ]
    },
    "de": [
      "weiss",
      "weiß"
    ],
    "dePrompt": "weiss",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "public",
    "n": 25,
    "forms": {
      "ms": [
        "public"
      ],
      "fs": [
        "publique"
      ],
      "mp": [
        "publics"
      ],
      "fp": [
        "publiques"
      ]
    },
    "de": [
      "öffentlich"
    ],
    "dePrompt": "öffentlich",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "frais",
    "n": 26,
    "forms": {
      "ms": [
        "frais"
      ],
      "fs": [
        "fraîche",
        "fraiche"
      ],
      "mp": [
        "frais"
      ],
      "fp": [
        "fraîches",
        "fraiches"
      ]
    },
    "de": [
      "frisch",
      "kühl"
    ],
    "dePrompt": "frisch / kühl",
    "group": "Lernwörter und Beispiele",
    "note": "Traditionell fraîche / fraîches; fraiche / fraiches ist nach der Rechtschreibreform ebenfalls korrekt."
  },
  {
    "id": "original",
    "n": 27,
    "forms": {
      "ms": [
        "original"
      ],
      "fs": [
        "originale"
      ],
      "mp": [
        "originaux"
      ],
      "fp": [
        "originales"
      ]
    },
    "de": [
      "originell",
      "ursprünglich",
      "original"
    ],
    "dePrompt": "originell",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "amical",
    "n": 28,
    "forms": {
      "ms": [
        "amical"
      ],
      "fs": [
        "amicale"
      ],
      "mp": [
        "amicaux"
      ],
      "fp": [
        "amicales"
      ]
    },
    "de": [
      "freundschaftlich",
      "freundlich"
    ],
    "dePrompt": "freundschaftlich",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "banal",
    "n": 29,
    "forms": {
      "ms": [
        "banal"
      ],
      "fs": [
        "banale"
      ],
      "mp": [
        "banals"
      ],
      "fp": [
        "banales"
      ]
    },
    "de": [
      "banal",
      "alltäglich",
      "gewöhnlich"
    ],
    "dePrompt": "banal / alltäglich",
    "group": "Lernwörter und Beispiele",
    "note": "Im heutigen Sinn „alltäglich“ lautet der maskuline Plural banals."
  },
  {
    "id": "fatal",
    "n": 30,
    "forms": {
      "ms": [
        "fatal"
      ],
      "fs": [
        "fatale"
      ],
      "mp": [
        "fatals"
      ],
      "fp": [
        "fatales"
      ]
    },
    "de": [
      "verhängnisvoll",
      "fatal",
      "tödlich"
    ],
    "dePrompt": "verhängnisvoll",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "final",
    "n": 31,
    "forms": {
      "ms": [
        "final"
      ],
      "fs": [
        "finale"
      ],
      "mp": [
        "finals",
        "finaux"
      ],
      "fp": [
        "finales"
      ]
    },
    "de": [
      "abschliessend",
      "abschließend",
      "endgültig",
      "final"
    ],
    "dePrompt": "abschliessend",
    "group": "Lernwörter und Beispiele",
    "note": "Das Blatt nennt finals. Auch finaux ist korrekt; beide werden akzeptiert."
  },
  {
    "id": "naval",
    "n": 32,
    "forms": {
      "ms": [
        "naval"
      ],
      "fs": [
        "navale"
      ],
      "mp": [
        "navals"
      ],
      "fp": [
        "navales"
      ]
    },
    "de": [
      "die marine betreffend",
      "zur marine gehörend",
      "marinebezogen",
      "maritim",
      "schiffsbezogen"
    ],
    "dePrompt": "die Marine betreffend",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "drôle",
    "n": 33,
    "forms": {
      "ms": [
        "drôle"
      ],
      "fs": [
        "drôle"
      ],
      "mp": [
        "drôles"
      ],
      "fp": [
        "drôles"
      ]
    },
    "de": [
      "lustig",
      "komisch",
      "seltsam"
    ],
    "dePrompt": "lustig / komisch",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "fidèle",
    "n": 34,
    "forms": {
      "ms": [
        "fidèle"
      ],
      "fs": [
        "fidèle"
      ],
      "mp": [
        "fidèles"
      ],
      "fp": [
        "fidèles"
      ]
    },
    "de": [
      "treu",
      "zuverlässig"
    ],
    "dePrompt": "treu",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "petit",
    "n": 35,
    "forms": {
      "ms": [
        "petit"
      ],
      "fs": [
        "petite"
      ],
      "mp": [
        "petits"
      ],
      "fp": [
        "petites"
      ]
    },
    "de": [
      "klein"
    ],
    "dePrompt": "klein",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "bon",
    "n": 36,
    "forms": {
      "ms": [
        "bon"
      ],
      "fs": [
        "bonne"
      ],
      "mp": [
        "bons"
      ],
      "fp": [
        "bonnes"
      ]
    },
    "de": [
      "gut"
    ],
    "dePrompt": "gut",
    "group": "Lernwörter und Beispiele",
    "note": "Steigerung: meilleur; Superlativ: le meilleur / la meilleure / les meilleurs / les meilleures."
  },
  {
    "id": "mauvais",
    "n": 37,
    "forms": {
      "ms": [
        "mauvais"
      ],
      "fs": [
        "mauvaise"
      ],
      "mp": [
        "mauvais"
      ],
      "fp": [
        "mauvaises"
      ]
    },
    "de": [
      "schlecht",
      "schlimm"
    ],
    "dePrompt": "schlecht",
    "group": "Lernwörter und Beispiele",
    "note": "Steigerung: plus mauvais oder pire; Superlativ: le plus mauvais oder le pire (entsprechend anpassen)."
  },
  {
    "id": "dernier",
    "n": 38,
    "forms": {
      "ms": [
        "dernier"
      ],
      "fs": [
        "dernière"
      ],
      "mp": [
        "derniers"
      ],
      "fp": [
        "dernières"
      ]
    },
    "de": [
      "letzte",
      "letzter",
      "letztes",
      "letzt"
    ],
    "dePrompt": "letzte / letzter",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "joli",
    "n": 39,
    "forms": {
      "ms": [
        "joli"
      ],
      "fs": [
        "jolie"
      ],
      "mp": [
        "jolis"
      ],
      "fp": [
        "jolies"
      ]
    },
    "de": [
      "hübsch",
      "schön"
    ],
    "dePrompt": "hübsch",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "haut",
    "n": 40,
    "forms": {
      "ms": [
        "haut"
      ],
      "fs": [
        "haute"
      ],
      "mp": [
        "hauts"
      ],
      "fp": [
        "hautes"
      ]
    },
    "de": [
      "hoch"
    ],
    "dePrompt": "hoch",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "pauvre",
    "n": 41,
    "forms": {
      "ms": [
        "pauvre"
      ],
      "fs": [
        "pauvre"
      ],
      "mp": [
        "pauvres"
      ],
      "fp": [
        "pauvres"
      ]
    },
    "de": [
      "arm",
      "bedauernswert"
    ],
    "dePrompt": "arm / bedauernswert",
    "group": "Lernwörter und Beispiele",
    "note": "Vor dem Nomen: bedauernswert. Nach dem Nomen: arm (ohne Geld)."
  },
  {
    "id": "cher",
    "n": 42,
    "forms": {
      "ms": [
        "cher"
      ],
      "fs": [
        "chère"
      ],
      "mp": [
        "chers"
      ],
      "fp": [
        "chères"
      ]
    },
    "de": [
      "lieb",
      "teuer"
    ],
    "dePrompt": "lieb / teuer",
    "group": "Lernwörter und Beispiele",
    "note": "Vor dem Nomen: lieb. Nach dem Nomen: teuer."
  },
  {
    "id": "sale",
    "n": 43,
    "forms": {
      "ms": [
        "sale"
      ],
      "fs": [
        "sale"
      ],
      "mp": [
        "sales"
      ],
      "fp": [
        "sales"
      ]
    },
    "de": [
      "schmutzig",
      "dreckig",
      "mies"
    ],
    "dePrompt": "schmutzig / mies",
    "group": "Lernwörter und Beispiele",
    "note": "Vor dem Nomen auch mies; nach dem Nomen schmutzig."
  },
  {
    "id": "propre",
    "n": 44,
    "forms": {
      "ms": [
        "propre"
      ],
      "fs": [
        "propre"
      ],
      "mp": [
        "propres"
      ],
      "fp": [
        "propres"
      ]
    },
    "de": [
      "sauber",
      "eigen"
    ],
    "dePrompt": "sauber / eigen",
    "group": "Lernwörter und Beispiele",
    "note": "Vor dem Nomen: eigen. Nach dem Nomen: sauber."
  },
  {
    "id": "vert",
    "n": 45,
    "forms": {
      "ms": [
        "vert"
      ],
      "fs": [
        "verte"
      ],
      "mp": [
        "verts"
      ],
      "fp": [
        "vertes"
      ]
    },
    "de": [
      "grün"
    ],
    "dePrompt": "grün",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "ennuyeux",
    "n": 46,
    "forms": {
      "ms": [
        "ennuyeux"
      ],
      "fs": [
        "ennuyeuse"
      ],
      "mp": [
        "ennuyeux"
      ],
      "fp": [
        "ennuyeuses"
      ]
    },
    "de": [
      "langweilig",
      "lästig"
    ],
    "dePrompt": "langweilig",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "préféré",
    "n": 47,
    "forms": {
      "ms": [
        "préféré"
      ],
      "fs": [
        "préférée"
      ],
      "mp": [
        "préférés"
      ],
      "fp": [
        "préférées"
      ]
    },
    "de": [
      "bevorzugt",
      "lieblings",
      "liebst",
      "am liebsten"
    ],
    "dePrompt": "bevorzugt / Lieblings-",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "court",
    "n": 48,
    "forms": {
      "ms": [
        "court"
      ],
      "fs": [
        "courte"
      ],
      "mp": [
        "courts"
      ],
      "fp": [
        "courtes"
      ]
    },
    "de": [
      "kurz"
    ],
    "dePrompt": "kurz",
    "group": "Lernwörter und Beispiele",
    "note": ""
  },
  {
    "id": "rapide",
    "n": 49,
    "forms": {
      "ms": [
        "rapide"
      ],
      "fs": [
        "rapide"
      ],
      "mp": [
        "rapides"
      ],
      "fp": [
        "rapides"
      ]
    },
    "de": [
      "schnell",
      "rasch"
    ],
    "dePrompt": "schnell",
    "group": "Lernwörter und Beispiele",
    "note": "Steigerung wie im Blatt: plus rapide, moins rapide, aussi rapide."
  },
  {
    "id": "meilleur",
    "n": 50,
    "forms": {
      "ms": [
        "meilleur"
      ],
      "fs": [
        "meilleure"
      ],
      "mp": [
        "meilleurs"
      ],
      "fp": [
        "meilleures"
      ]
    },
    "de": [
      "besser"
    ],
    "dePrompt": "besser",
    "group": "Lernwörter und Beispiele",
    "note": "Komparativ von bon. Mit bestimmtem Artikel: der/die/das Beste."
  },
  {
    "id": "pire",
    "n": 51,
    "forms": {
      "ms": [
        "pire"
      ],
      "fs": [
        "pire"
      ],
      "mp": [
        "pires"
      ],
      "fp": [
        "pires"
      ]
    },
    "de": [
      "schlechter",
      "schlimmer"
    ],
    "dePrompt": "schlechter / schlimmer",
    "group": "Lernwörter und Beispiele",
    "note": "Komparativ von mauvais. Mit bestimmtem Artikel: der/die/das Schlechteste."
  },
  {
    "id": "régulier",
    "n": 52,
    "forms": {
      "ms": [
        "régulier"
      ],
      "fs": [
        "régulière"
      ],
      "mp": [
        "réguliers"
      ],
      "fp": [
        "régulières"
      ]
    },
    "de": [
      "regelmässig",
      "regelmäßig"
    ],
    "dePrompt": "regelmässig",
    "group": "Erklärungen und Überschriften",
    "note": ""
  },
  {
    "id": "masculin",
    "n": 53,
    "forms": {
      "ms": [
        "masculin"
      ],
      "fs": [
        "masculine"
      ],
      "mp": [
        "masculins"
      ],
      "fp": [
        "masculines"
      ]
    },
    "de": [
      "männlich",
      "maskulin"
    ],
    "dePrompt": "männlich",
    "group": "Erklärungen und Überschriften",
    "note": ""
  },
  {
    "id": "féminin",
    "n": 54,
    "forms": {
      "ms": [
        "féminin"
      ],
      "fs": [
        "féminine"
      ],
      "mp": [
        "féminins"
      ],
      "fp": [
        "féminines"
      ]
    },
    "de": [
      "weiblich",
      "feminin"
    ],
    "dePrompt": "weiblich",
    "group": "Erklärungen und Überschriften",
    "note": ""
  },
  {
    "id": "particulier",
    "n": 55,
    "forms": {
      "ms": [
        "particulier"
      ],
      "fs": [
        "particulière"
      ],
      "mp": [
        "particuliers"
      ],
      "fp": [
        "particulières"
      ]
    },
    "de": [
      "besonders",
      "besonder",
      "speziell",
      "eigentümlich"
    ],
    "dePrompt": "besonders / speziell",
    "group": "Erklärungen und Überschriften",
    "note": ""
  },
  {
    "id": "certain",
    "n": 56,
    "forms": {
      "ms": [
        "certain"
      ],
      "fs": [
        "certaine"
      ],
      "mp": [
        "certains"
      ],
      "fp": [
        "certaines"
      ]
    },
    "de": [
      "gewiss",
      "bestimmt",
      "sicher"
    ],
    "dePrompt": "gewiss / bestimmt",
    "group": "Erklärungen und Überschriften",
    "note": ""
  },
  {
    "id": "différent",
    "n": 57,
    "forms": {
      "ms": [
        "différent"
      ],
      "fs": [
        "différente"
      ],
      "mp": [
        "différents"
      ],
      "fp": [
        "différentes"
      ]
    },
    "de": [
      "verschieden",
      "unterschiedlich",
      "anders"
    ],
    "dePrompt": "verschieden",
    "group": "Erklärungen und Überschriften",
    "note": ""
  },
  {
    "id": "autre",
    "n": 58,
    "forms": {
      "ms": [
        "autre"
      ],
      "fs": [
        "autre"
      ],
      "mp": [
        "autres"
      ],
      "fp": [
        "autres"
      ]
    },
    "de": [
      "ander",
      "andere",
      "anderer",
      "anderes",
      "anders"
    ],
    "dePrompt": "andere / anderer",
    "group": "Erklärungen und Überschriften",
    "note": ""
  },
  {
    "id": "singulier",
    "n": 59,
    "forms": {
      "ms": [
        "singulier"
      ],
      "fs": [
        "singulière"
      ],
      "mp": [
        "singuliers"
      ],
      "fp": [
        "singulières"
      ]
    },
    "de": [
      "einzeln",
      "einzigartig",
      "eigenartig",
      "singularisch",
      "in der einzahl"
    ],
    "dePrompt": "einzeln / in der Einzahl",
    "group": "Erklärungen und Überschriften",
    "note": ""
  },
  {
    "id": "pluriel",
    "n": 60,
    "forms": {
      "ms": [
        "pluriel"
      ],
      "fs": [
        "plurielle"
      ],
      "mp": [
        "pluriels"
      ],
      "fp": [
        "plurielles"
      ]
    },
    "de": [
      "mehrzahlig",
      "pluralisch",
      "in der mehrzahl",
      "vielfältig"
    ],
    "dePrompt": "in der Mehrzahl",
    "group": "Erklärungen und Überschriften",
    "note": ""
  },
  {
    "id": "comparatif",
    "n": 61,
    "forms": {
      "ms": [
        "comparatif"
      ],
      "fs": [
        "comparative"
      ],
      "mp": [
        "comparatifs"
      ],
      "fp": [
        "comparatives"
      ]
    },
    "de": [
      "vergleichend",
      "komparativ"
    ],
    "dePrompt": "vergleichend",
    "group": "Erklärungen und Überschriften",
    "note": ""
  },
  {
    "id": "superlatif",
    "n": 62,
    "forms": {
      "ms": [
        "superlatif"
      ],
      "fs": [
        "superlative"
      ],
      "mp": [
        "superlatifs"
      ],
      "fp": [
        "superlatives"
      ]
    },
    "de": [
      "höchst",
      "höchste",
      "höchster",
      "höchstes",
      "superlativisch"
    ],
    "dePrompt": "höchste / superlativisch",
    "group": "Erklärungen und Überschriften",
    "note": ""
  }
];
