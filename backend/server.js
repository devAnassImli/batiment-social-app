const express = require("express");
const cors = require("cors");
require("dotenv").config();
const sql = require("mssql");
const ldap = require("ldapjs");
const dbSqlite = require("./db-sqlite");
const app = express();
const jwt = require("jsonwebtoken");
app.use(cors());
app.use(express.json());

// Configuration de connexion à la base "employés" (lecture seule)
const configEmployes = {
  server: process.env.DB_SERVER.split("\\")[0],
  port: 1433,
  database: process.env.DB_EMPLOYEES_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    instanceName: process.env.DB_SERVER.split("\\")[1],
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Route de test simple, pour vérifier que le serveur tourne
app.get("/api/test", (req, res) => {
  res.json({ message: "Le backend fonctionne !" });
});

// Route pour tester la connexion à SQL Server
app.get("/api/test-db", async (req, res) => {
  try {
    await sql.connect(configEmployes);
    res.json({ connexion: "OK", base: process.env.DB_EMPLOYEES_DATABASE });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});
// Vérifie un matricule via la procédure stockée SQL
app.get("/api/employe/:matricule", async (req, res) => {
  const matriculeBrut = req.params.matricule;
  const matricule = matriculeBrut.padStart(5, "0").slice(0, 5);

  console.log(
    "Matricule brut recu :",
    matriculeBrut,
    "-> envoye a SQL :",
    `"${matricule}"`,
    "(longueur:",
    matricule.length,
    ")",
  );

  try {
    const pool = await sql.connect(configEmployes);
    const resultat = await pool
      .request()
      .input("Matricola", sql.NChar(5), matricule)
      .execute(process.env.DB_EMPLOYEES_SP);

    if (resultat.recordset.length === 0) {
      return res
        .status(404)
        .json({ trouve: false, message: "Matricule inconnu" });
    }

    res.json({ trouve: true, employe: resultat.recordset[0] });
  } catch (err) {
    console.error("Erreur SQL :", err.message);
    res.status(500).json({ erreur: err.message });
  }
});
app.get("/api/test-sqlite", (req, res) => {
  const zones = dbSqlite.prepare("SELECT * FROM T_BS_ZONES").all();
  res.json(zones);
});
app.post("/api/signalements", (req, res) => {
  const { matricule, nomDemandeur, zone, categorie, urgence, description } =
    req.body;

  if (!matricule || !zone || !categorie || !urgence || !description) {
    return res.status(400).json({ erreur: "Champs manquants" });
  }

  try {
    const idZone = dbSqlite
      .prepare("SELECT IdZone FROM T_BS_ZONES WHERE Nom = ?")
      .get(zone)?.IdZone;
    const idCategorie = dbSqlite
      .prepare("SELECT IdCategorie FROM T_BS_CATEGORIES WHERE Nom = ?")
      .get(categorie)?.IdCategorie;
    const idAvancementInitial = dbSqlite
      .prepare("SELECT IdAvancement FROM T_BS_AVANCEMENT WHERE Position = 1")
      .get()?.IdAvancement;

    if (!idZone || !idCategorie) {
      return res.status(400).json({ erreur: "Zone ou catégorie invalide" });
    }

    const resultat = dbSqlite
      .prepare(
        `
      INSERT INTO T_BS_SIGNALEMENTS
        (MatriculeDemandeur, NomDemandeur, IdZone, IdCategorie, Urgence, Description, Statut, IdAvancement)
      VALUES (?, ?, ?, ?, ?, ?, 'A_VALIDER', ?)
    `,
      )
      .run(
        matricule,
        nomDemandeur,
        idZone,
        idCategorie,
        urgence,
        description,
        idAvancementInitial,
      );

    dbSqlite
      .prepare(
        `
      INSERT INTO T_BS_HISTORIQUE (IdSignalement, Auteur, Action, Commentaire)
      VALUES (?, ?, 'Création', 'Signalement créé depuis le totem')
    `,
      )
      .run(resultat.lastInsertRowid, nomDemandeur);

    res.json({ succes: true, idSignalement: resultat.lastInsertRowid });
  } catch (err) {
    console.error("Erreur sauvegarde signalement :", err.message);
    res.status(500).json({ erreur: err.message });
  }
});

app.get("/api/signalements", verifierToken, (req, res) => {
  const signalements = dbSqlite
    .prepare(
      `
    SELECT s.*, z.Nom AS ZoneNom, c.Nom AS CategorieNom
    FROM T_BS_SIGNALEMENTS s
    LEFT JOIN T_BS_ZONES z ON z.IdZone = s.IdZone
    LEFT JOIN T_BS_CATEGORIES c ON c.IdCategorie = s.IdCategorie
    ORDER BY s.IdSignalement DESC
  `,
    )
    .all();
  res.json(signalements);
});

// ══════════════════════════════════════════════════════════
//  AUTHENTIFICATION LDAP (back-office) — Active Directory SAM Montereau
// ══════════════════════════════════════════════════════════
const LDAP_URL = "ldap://mt.rivagroup.local";
const LDAP_BASE_DN = "DC=mt,DC=rivagroup,DC=local";

function tryLdapBind(bindDN, password) {
  return new Promise((resolve) => {
    const client = ldap.createClient({
      url: LDAP_URL,
      timeout: 5000,
      connectTimeout: 5000,
    });

    client.on("error", () => resolve(null));

    client.bind(bindDN, password, (err) => {
      if (err) {
        console.log("LDAP bind echoue pour", bindDN, ":", err.message);
        client.destroy();
        resolve(null);
        return;
      }

      const username = bindDN.includes("\\")
        ? bindDN.split("\\")[1]
        : bindDN.split("@")[0];
      const searchOptions = {
        filter: `(sAMAccountName=${username})`,
        scope: "sub",
        attributes: ["cn", "mail", "sAMAccountName"],
      };

      client.search(LDAP_BASE_DN, searchOptions, (err, res) => {
        if (err) {
          client.destroy();
          resolve(null);
          return;
        }

        let userInfo = null;
        res.on("searchEntry", (entry) => {
          let cn = username,
            email = "";
          if (entry.object) {
            cn = entry.object.cn || entry.object.CN || username;
            email = entry.object.mail || entry.object.Mail || "";
          } else if (entry.attributes) {
            entry.attributes.forEach((attr) => {
              if ((attr.type || "").toLowerCase() === "cn")
                cn = attr.values ? attr.values[0] : "";
              if ((attr.type || "").toLowerCase() === "mail")
                email = attr.values ? attr.values[0] : "";
            });
          }
          userInfo = { nomComplet: cn, email, username };
        });

        res.on("end", () => {
          client.destroy();
          resolve(userInfo);
        });

        res.on("error", () => {
          client.destroy();
          resolve(null);
        });
      });
    });
  });
}

async function authentifierLdap(username, password) {
  const formatsBindPossibles = [
    `${username}@mt.rivagroup.local`,
    `MT\\${username}`,
    username,
  ];

  for (const bindDN of formatsBindPossibles) {
    const resultat = await tryLdapBind(bindDN, password);
    if (resultat) return resultat;
  }
  return null;
}

app.post("/api/admin/connexion", async (req, res) => {
  const { identifiant, motDePasse } = req.body;

  if (!identifiant || !motDePasse) {
    return res
      .status(400)
      .json({ succes: false, message: "Identifiant et mot de passe requis" });
  }

  try {
    const utilisateurLdap = await authentifierLdap(identifiant, motDePasse);
    if (!utilisateurLdap) {
      return res
        .status(401)
        .json({ succes: false, message: "Identifiants incorrects" });
    }

    const token = jwt.sign(
      {
        username: utilisateurLdap.username,
        nomComplet: utilisateurLdap.nomComplet,
        email: utilisateurLdap.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res.json({ succes: true, token, utilisateur: utilisateurLdap });
  } catch (err) {
    console.error("Erreur LDAP :", err.message);
    res.status(500).json({ succes: false, message: "Erreur serveur" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend demarre sur http://localhost:${PORT}`);
});

function verifierToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ erreur: "Token manquant" });
  }
  const token = authHeader.split(" ")[1];
  try {
    req.utilisateur = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ erreur: "Token invalide ou expiré" });
  }
}
