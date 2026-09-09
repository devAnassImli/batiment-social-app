const express = require("express");
const cors = require("cors");
require("dotenv").config();
const sql = require("mssql");
const ldap = require("ldapjs");
const jwt = require("jsonwebtoken");
const dbSql = require("./db-sqlserver");
const PDFDocument = require("pdfkit");
const MATRICULES_ADMIN = ["05102", "04227", "03933", "04575"]; // Anass, Adrien, Sebastien — ajoute le tuteur et le directeur ici plus tard
const cron = require("node-cron");
const app = express();
app.use(cors());
app.use(express.json());

// ══════════════════════════════════════════════════════════
//  CONFIG SQL SERVER (base employes, lecture seule)
// ══════════════════════════════════════════════════════════
const configEmployes = {
  server: process.env.DB_EMPLOYEES_SERVER.split("\\")[0],
  port: 1433,
  database: process.env.DB_EMPLOYEES_DATABASE,
  user: process.env.DB_EMPLOYEES_USER,
  password: process.env.DB_EMPLOYEES_PASSWORD,
  options: {
    instanceName: process.env.DB_EMPLOYEES_SERVER.split("\\")[1],
    encrypt: false,
    trustServerCertificate: true,
  },
};
let poolEmployesPromise = null;
function getPoolEmployes() {
  if (!poolEmployesPromise) {
    const pool = new sql.ConnectionPool(configEmployes);
    poolEmployesPromise = pool.connect();
  }
  return poolEmployesPromise;
}
app.get("/api/test", (req, res) => {
  res.json({ message: "Le backend fonctionne !" });
});

app.get("/api/test-db", async (req, res) => {
  try {
    await getPoolEmployes();
    res.json({ connexion: "OK", base: process.env.DB_EMPLOYEES_DATABASE });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

app.get("/api/employe/:matricule", async (req, res) => {
  const matriculeBrut = req.params.matricule;
  const matricule = matriculeBrut.padStart(5, "0").slice(0, 5);
  try {
    const pool = await getPoolEmployes();
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

// ══════════════════════════════════════════════════════════
//  SIGNALEMENTS (SQLite local, en attendant SQL Server dedie)
// ══════════════════════════════════════════════════════════
app.get("/api/test-sqlite", (req, res) => {
  const zones = dbSqlite.prepare("SELECT * FROM T_BS_ZONES").all();
  res.json(zones);
});

app.post("/api/signalements", async (req, res) => {
  const { matricule, nomDemandeur, zone, categorie, urgence, description } =
    req.body;
  if (!matricule || !zone || !categorie || !urgence) {
    return res.status(400).json({ erreur: "Champs manquants" });
  }
  try {
    const resultat = await dbSql.creerDemande({
      nomDemandeur,
      matriculeDemandeur: matricule,
      zone,
      categorie,
      urgence,
      description,
    });
    res.json({
      succes: true,
      idSignalement: resultat.idDomanda,
      numero: `${resultat.numero}/${resultat.annee}`,
    });
  } catch (err) {
    console.error("Erreur creation demande SQL Server :", err.message);
    res.status(500).json({ erreur: err.message });
  }
});

const path = require("path");

app.get("/api/signalements/:id/pdf", verifierToken, (req, res) => {
  const { id } = req.params;

  const signalement = dbSqlite
    .prepare(
      `
    SELECT s.*, z.Nom AS ZoneNom, c.Nom AS CategorieNom, p.NomComplet AS PiloteNom, a.Nom AS AvancementNom
    FROM T_BS_SIGNALEMENTS s
    LEFT JOIN T_BS_ZONES z ON z.IdZone = s.IdZone
    LEFT JOIN T_BS_CATEGORIES c ON c.IdCategorie = s.IdCategorie
    LEFT JOIN T_BS_PILOTES p ON p.IdPilote = s.IdPilote
    LEFT JOIN T_BS_AVANCEMENT a ON a.IdAvancement = s.IdAvancement
    WHERE s.IdSignalement = ?
  `,
    )
    .get(id);

  if (!signalement)
    return res.status(404).json({ erreur: "Signalement introuvable" });

  const historique = dbSqlite
    .prepare(
      `
    SELECT * FROM T_BS_HISTORIQUE WHERE IdSignalement = ? ORDER BY DateAction ASC
  `,
    )
    .all(id);

  const validation = historique.find((h) => h.Action === "Validé");

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=signalement-${id}.pdf`,
  );
  doc.pipe(res);

  const logoRivaPath = path.join(__dirname, "assets", "logo-riva.png");
  const logoSamPath = path.join(__dirname, "assets", "logo-sam.png");
  try {
    doc.image(logoRivaPath, 50, 40, { height: 40 });
  } catch {}
  try {
    doc.image(logoSamPath, 480, 40, { height: 40 });
  } catch {}

  doc.moveDown(3);
  doc
    .fontSize(18)
    .fillColor("#0d7377")
    .text("SAM MONTEREAU — BÂTIMENT SOCIAL", { align: "center" });
  doc
    .fontSize(12)
    .fillColor("#666")
    .text("Fiche de signalement", { align: "center" });
  doc.moveDown(0.5);
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor("#b8a888")
    .lineWidth(2)
    .stroke();
  doc.moveDown(1);

  doc
    .fontSize(14)
    .fillColor("#000")
    .text(`Signalement n° ${signalement.IdSignalement}`, { underline: true });
  doc.moveDown(0.5);

  const ligne = (label, valeur) => {
    doc.fontSize(10).fillColor("#666").text(label, { continued: true });
    doc
      .fontSize(11)
      .fillColor("#000")
      .text(`  ${valeur || "—"}`);
    doc.moveDown(0.3);
  };

  ligne(
    "Date de création :",
    new Date(signalement.DateCreation).toLocaleString("fr-FR"),
  );
  ligne(
    "Demandeur :",
    `${signalement.NomDemandeur} (matricule ${signalement.MatriculeDemandeur})`,
  );
  ligne("Zone :", signalement.ZoneNom);
  ligne("Catégorie :", signalement.CategorieNom);
  ligne("Urgence :", signalement.Urgence);
  ligne("Statut :", signalement.Statut);
  ligne("Validé par :", validation ? validation.Auteur : "—");
  ligne(
    "Date de validation :",
    signalement.DateValidation
      ? new Date(signalement.DateValidation).toLocaleString("fr-FR")
      : "—",
  );
  ligne("Pilote assigné :", signalement.PiloteNom);
  ligne("Avancement :", signalement.AvancementNom);

  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#666").text("Description :");
  doc
    .fontSize(11)
    .fillColor("#000")
    .text(signalement.Description, { width: 480 });

  doc.moveDown(1.5);
  doc.fontSize(12).fillColor("#0d7377").text("Historique", { underline: true });
  doc.moveDown(0.5);

  historique.forEach((h) => {
    doc
      .fontSize(9)
      .fillColor("#666")
      .text(`${new Date(h.DateAction).toLocaleString("fr-FR")} — ${h.Auteur}`);
    doc
      .fontSize(10)
      .fillColor("#000")
      .text(h.Action + (h.Commentaire ? ` : ${h.Commentaire}` : ""));
    doc.moveDown(0.4);
  });

  doc.moveDown(2);
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor("#dde3e3")
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.5);
  doc
    .fontSize(8)
    .fillColor("#999")
    .text(
      `Document généré le ${new Date().toLocaleString("fr-FR")} — SAM Montereau, Groupe RIVA`,
      { align: "center" },
    );

  doc.end();
});
app.delete("/api/mes-signalements/:id", async (req, res) => {
  const { id } = req.params;
  const { matricule } = req.body;
  const matriculeFormate = (matricule || "").padStart(5, "0").slice(0, 5);
  const estAdmin = MATRICULES_ADMIN.includes(matriculeFormate);

  try {
    await dbSql.supprimerDemande(Number(id), matriculeFormate, estAdmin);
    res.json({ succes: true });
  } catch (err) {
    res.status(403).json({ succes: false, message: err.message });
  }
});

app.put('/api/mes-signalements/:id', async (req, res) => {
  const { id } = req.params;
  const { matricule, description } = req.body;
  const matriculeFormate = (matricule || '').padStart(5, '0').slice(0, 5);
  const estAdmin = MATRICULES_ADMIN.includes(matriculeFormate);

  try {
    await dbSql.modifierDemande(Number(id), matriculeFormate, estAdmin, { description });
    res.json({ succes: true });
  } catch (err) {
    res.status(403).json({ succes: false, message: err.message });
  }
});

app.post('/api/mes-signalements/:id/valider', async (req, res) => {
  const { id } = req.params;
  const { matricule } = req.body;
  const matriculeFormate = (matricule || '').padStart(5, '0').slice(0, 5);

  if (!MATRICULES_ADMIN.includes(matriculeFormate)) {
    return res.status(403).json({ succes: false, message: 'Seuls les administrateurs peuvent valider' });
  }

  try {
    await dbSql.validerDemande(Number(id), matriculeFormate);
    res.json({ succes: true });
  } catch (err) {
    res.status(500).json({ succes: false, message: err.message });
  }
});
// ══════════════════════════════════════════════════════════
//  AUTHENTIFICATION LDAP + JWT (back-office)
// ══════════════════════════════════════════════════════════
const LDAP_URL = "ldap://mt.rivagroup.local";
const LDAP_BASE_DN = "DC=mt,DC=rivagroup,DC=local";

function tryLdapBind(bindDN, password) {
  return new Promise((resolve) => {
    const client = ldap.createClient({
      url: LDAP_URL,
      timeout: 5001,
      connectTimeout: 5001,
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

// ══════════════════════════════════════════════════════════
//  ROUTES ADMIN (protegees par JWT)
// ══════════════════════════════════════════════════════════
app.get("/api/signalements", verifierToken, (req, res) => {
  const signalements = dbSqlite
    .prepare(
      `
    SELECT s.*, z.Nom AS ZoneNom, c.Nom AS CategorieNom
    FROM T_BS_SIGNALEMENTS s
    LEFT JOIN T_BS_ZONES z ON z.IdZone = s.IdZone
    LEFT JOIN T_BS_CATEGORIES c ON c.IdCategorie = s.IdCategorie
    WHERE s.Supprime = 0
    ORDER BY s.IdSignalement DESC
  `,
    )
    .all();
  res.json(signalements);
});

app.get("/api/signalements/:id", verifierToken, (req, res) => {
  const { id } = req.params;
  const signalement = dbSqlite
    .prepare(
      `
    SELECT s.*, z.Nom AS ZoneNom, c.Nom AS CategorieNom, p.NomComplet AS PiloteNom, a.Nom AS AvancementNom
    FROM T_BS_SIGNALEMENTS s
    LEFT JOIN T_BS_ZONES z ON z.IdZone = s.IdZone
    LEFT JOIN T_BS_CATEGORIES c ON c.IdCategorie = s.IdCategorie
    LEFT JOIN T_BS_PILOTES p ON p.IdPilote = s.IdPilote
    LEFT JOIN T_BS_AVANCEMENT a ON a.IdAvancement = s.IdAvancement
    WHERE s.IdSignalement = ?
  `,
    )
    .get(id);

  if (!signalement)
    return res.status(404).json({ erreur: "Signalement introuvable" });

  const historique = dbSqlite
    .prepare(
      `
    SELECT * FROM T_BS_HISTORIQUE WHERE IdSignalement = ? ORDER BY DateAction DESC
  `,
    )
    .all(id);

  res.json({ signalement, historique });
});

app.post("/api/signalements/:id/valider", verifierToken, (req, res) => {
  const { id } = req.params;
  dbSqlite
    .prepare(
      `UPDATE T_BS_SIGNALEMENTS SET Statut = 'VALIDE', DateValidation = CURRENT_TIMESTAMP WHERE IdSignalement = ?`,
    )
    .run(id);
  dbSqlite
    .prepare(
      `INSERT INTO T_BS_HISTORIQUE (IdSignalement, Auteur, Action) VALUES (?, ?, 'Validé')`,
    )
    .run(id, req.utilisateur.nomComplet);
  res.json({ succes: true });
});

app.post("/api/signalements/:id/refuser", verifierToken, (req, res) => {
  const { id } = req.params;
  const { motif } = req.body;
  dbSqlite
    .prepare(
      `UPDATE T_BS_SIGNALEMENTS SET Statut = 'REFUSE' WHERE IdSignalement = ?`,
    )
    .run(id);
  dbSqlite
    .prepare(
      `INSERT INTO T_BS_HISTORIQUE (IdSignalement, Auteur, Action, Commentaire) VALUES (?, ?, 'Refusé', ?)`,
    )
    .run(id, req.utilisateur.nomComplet, motif || "");
  res.json({ succes: true });
});

app.post("/api/signalements/:id/annuler", verifierToken, (req, res) => {
  const { id } = req.params;
  dbSqlite
    .prepare(
      `UPDATE T_BS_SIGNALEMENTS SET Statut = 'ANNULE' WHERE IdSignalement = ?`,
    )
    .run(id);
  dbSqlite
    .prepare(
      `INSERT INTO T_BS_HISTORIQUE (IdSignalement, Auteur, Action) VALUES (?, ?, 'Annulé')`,
    )
    .run(id, req.utilisateur.nomComplet);
  res.json({ succes: true });
});

app.delete("/api/signalements/:id", verifierToken, (req, res) => {
  const { id } = req.params;
  dbSqlite
    .prepare(
      `UPDATE T_BS_SIGNALEMENTS SET Supprime = 1 WHERE IdSignalement = ?`,
    )
    .run(id);
  dbSqlite
    .prepare(
      `INSERT INTO T_BS_HISTORIQUE (IdSignalement, Auteur, Action) VALUES (?, ?, 'Supprimé')`,
    )
    .run(id, req.utilisateur.nomComplet);
  res.json({ succes: true });
});

app.post("/api/signalements/:id/avancement", verifierToken, (req, res) => {
  const { id } = req.params;
  const { idAvancement } = req.body;
  const avancement = dbSqlite
    .prepare("SELECT Nom FROM T_BS_AVANCEMENT WHERE IdAvancement = ?")
    .get(idAvancement);
  if (!avancement)
    return res.status(400).json({ erreur: "Avancement invalide" });

  dbSqlite
    .prepare(
      `UPDATE T_BS_SIGNALEMENTS SET IdAvancement = ? WHERE IdSignalement = ?`,
    )
    .run(idAvancement, id);
  dbSqlite
    .prepare(
      `INSERT INTO T_BS_HISTORIQUE (IdSignalement, Auteur, Action) VALUES (?, ?, ?)`,
    )
    .run(
      id,
      req.utilisateur.nomComplet,
      `Avancement changé : ${avancement.Nom}`,
    );
  res.json({ succes: true });
});

app.post("/api/signalements/:id/pilote", verifierToken, (req, res) => {
  const { id } = req.params;
  const { idPilote } = req.body;
  const pilote = dbSqlite
    .prepare("SELECT NomComplet FROM T_BS_PILOTES WHERE IdPilote = ?")
    .get(idPilote);
  if (!pilote) return res.status(400).json({ erreur: "Pilote invalide" });

  dbSqlite
    .prepare(
      `UPDATE T_BS_SIGNALEMENTS SET IdPilote = ? WHERE IdSignalement = ?`,
    )
    .run(idPilote, id);
  dbSqlite
    .prepare(
      `INSERT INTO T_BS_HISTORIQUE (IdSignalement, Auteur, Action) VALUES (?, ?, ?)`,
    )
    .run(id, req.utilisateur.nomComplet, `Assigné à ${pilote.NomComplet}`);
  res.json({ succes: true });
});

app.get("/api/reference/avancement", verifierToken, (req, res) => {
  res.json(
    dbSqlite
      .prepare(
        "SELECT * FROM T_BS_AVANCEMENT WHERE Actif = 1 ORDER BY Position",
      )
      .all(),
  );
});

app.get("/api/reference/pilotes", verifierToken, (req, res) => {
  res.json(
    dbSqlite.prepare("SELECT * FROM T_BS_PILOTES WHERE Actif = 1").all(),
  );
});

app.get("/api/admin/statistiques", verifierToken, (req, res) => {
  const total = dbSqlite
    .prepare("SELECT COUNT(*) AS n FROM T_BS_SIGNALEMENTS WHERE Supprime = 0")
    .get().n;

  const parStatut = dbSqlite
    .prepare(
      `
    SELECT Statut, COUNT(*) AS n FROM T_BS_SIGNALEMENTS WHERE Supprime = 0 GROUP BY Statut
  `,
    )
    .all();

  const parZone = dbSqlite
    .prepare(
      `
    SELECT z.Nom AS zone, COUNT(*) AS n
    FROM T_BS_SIGNALEMENTS s
    JOIN T_BS_ZONES z ON z.IdZone = s.IdZone
    WHERE s.Supprime = 0
    GROUP BY z.Nom ORDER BY n DESC
  `,
    )
    .all();

  const parCategorie = dbSqlite
    .prepare(
      `
    SELECT c.Nom AS categorie, COUNT(*) AS n
    FROM T_BS_SIGNALEMENTS s
    JOIN T_BS_CATEGORIES c ON c.IdCategorie = s.IdCategorie
    WHERE s.Supprime = 0
    GROUP BY c.Nom ORDER BY n DESC
  `,
    )
    .all();

  const urgents = dbSqlite
    .prepare(
      `
    SELECT COUNT(*) AS n FROM T_BS_SIGNALEMENTS WHERE Supprime = 0 AND Urgence = 'Urgent'
  `,
    )
    .get().n;

  const enAttente = dbSqlite
    .prepare(
      `
    SELECT COUNT(*) AS n FROM T_BS_SIGNALEMENTS WHERE Supprime = 0 AND Statut = 'A_VALIDER'
  `,
    )
    .get().n;

  const dernieres = dbSqlite
    .prepare(
      `
    SELECT s.IdSignalement, s.DateCreation, s.NomDemandeur, z.Nom AS ZoneNom, s.Statut
    FROM T_BS_SIGNALEMENTS s
    LEFT JOIN T_BS_ZONES z ON z.IdZone = s.IdZone
    WHERE s.Supprime = 0
    ORDER BY s.IdSignalement DESC
    LIMIT 5
  `,
    )
    .all();

  res.json({
    total,
    urgents,
    enAttente,
    parStatut,
    parZone,
    parCategorie,
    dernieres,
  });
});
app.get("/api/mes-signalements/:matricule", async (req, res) => {
  const matricule = req.params.matricule.padStart(5, "0").slice(0, 5);
  const estAdmin = MATRICULES_ADMIN.includes(matricule);
  const { dateDebut, dateFin } = req.query;

  try {
    const signalements = await dbSql.listerDemandes({
      matricule,
      tousLesUtilisateurs: estAdmin,
      dateDebut,
      dateFin,
    });
    res.json({
      estAdmin,
      signalements: signalements.map((s) => ({
        IdSignalement: s.IdDomanda,
        DateCreation: s.DataDomanda,
        NomDemandeur: s.Richiedente,
        Description: s.Oggetto,
        DescriptionComplete: s.Descrittivo,
        Statut: s.Validata ? "VALIDE" : "A_VALIDER",
        AvancementNom: s.AvanzamentoNome,
        ZoneNom: (s.Oggetto || "").split(" — ")[0],
      })),
    });
  } catch (err) {
    console.error("Erreur liste demandes :", err.message);
    res.status(500).json({ erreur: err.message });
  }
});

// ══════════════════════════════════════════════════════════
//  CRUD REFERENTIELS (Zones, Categories, Pilotes)
// ══════════════════════════════════════════════════════════

// --- ZONES ---
app.get("/api/admin/zones", verifierToken, (req, res) => {
  res.json(dbSqlite.prepare("SELECT * FROM T_BS_ZONES ORDER BY Nom").all());
});
app.post("/api/admin/zones", verifierToken, (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ erreur: "Nom requis" });
  const r = dbSqlite
    .prepare("INSERT INTO T_BS_ZONES (Nom) VALUES (?)")
    .run(nom);
  res.json({ succes: true, id: r.lastInsertRowid });
});
app.put("/api/admin/zones/:id", verifierToken, (req, res) => {
  const { nom, actif } = req.body;
  dbSqlite
    .prepare("UPDATE T_BS_ZONES SET Nom = ?, Actif = ? WHERE IdZone = ?")
    .run(nom, actif ? 1 : 0, req.params.id);
  res.json({ succes: true });
});
app.delete("/api/admin/zones/:id", verifierToken, (req, res) => {
  dbSqlite
    .prepare("UPDATE T_BS_ZONES SET Actif = 0 WHERE IdZone = ?")
    .run(req.params.id);
  res.json({ succes: true });
});

// --- CATEGORIES ---
app.get("/api/admin/categories", verifierToken, (req, res) => {
  res.json(
    dbSqlite.prepare("SELECT * FROM T_BS_CATEGORIES ORDER BY Nom").all(),
  );
});
app.post("/api/admin/categories", verifierToken, (req, res) => {
  const { nom } = req.body;
  if (!nom) return res.status(400).json({ erreur: "Nom requis" });
  const r = dbSqlite
    .prepare("INSERT INTO T_BS_CATEGORIES (Nom) VALUES (?)")
    .run(nom);
  res.json({ succes: true, id: r.lastInsertRowid });
});
app.put("/api/admin/categories/:id", verifierToken, (req, res) => {
  const { nom, actif } = req.body;
  dbSqlite
    .prepare(
      "UPDATE T_BS_CATEGORIES SET Nom = ?, Actif = ? WHERE IdCategorie = ?",
    )
    .run(nom, actif ? 1 : 0, req.params.id);
  res.json({ succes: true });
});
app.delete("/api/admin/categories/:id", verifierToken, (req, res) => {
  dbSqlite
    .prepare("UPDATE T_BS_CATEGORIES SET Actif = 0 WHERE IdCategorie = ?")
    .run(req.params.id);
  res.json({ succes: true });
});

// --- PILOTES (intervenants) ---
app.get("/api/admin/pilotes", verifierToken, (req, res) => {
  res.json(
    dbSqlite.prepare("SELECT * FROM T_BS_PILOTES ORDER BY NomComplet").all(),
  );
});
app.post("/api/admin/pilotes", verifierToken, (req, res) => {
  const { nomComplet, type } = req.body;
  if (!nomComplet || !type)
    return res.status(400).json({ erreur: "Nom et type requis" });
  const r = dbSqlite
    .prepare("INSERT INTO T_BS_PILOTES (NomComplet, Type) VALUES (?, ?)")
    .run(nomComplet, type);
  res.json({ succes: true, id: r.lastInsertRowid });
});
app.put("/api/admin/pilotes/:id", verifierToken, (req, res) => {
  const { nomComplet, type, actif } = req.body;
  dbSqlite
    .prepare(
      "UPDATE T_BS_PILOTES SET NomComplet = ?, Type = ?, Actif = ? WHERE IdPilote = ?",
    )
    .run(nomComplet, type, actif ? 1 : 0, req.params.id);
  res.json({ succes: true });
});
app.delete("/api/admin/pilotes/:id", verifierToken, (req, res) => {
  dbSqlite
    .prepare("UPDATE T_BS_PILOTES SET Actif = 0 WHERE IdPilote = ?")
    .run(req.params.id);
  res.json({ succes: true });
});
const PORT = process.env.PORT || 5001;

// Nettoyage automatique tous les jours a 3h du matin
cron.schedule("0 3 * * *", () => {
  dbSql
    .nettoyerAncienneDemandes()
    .catch((err) => console.error("Erreur nettoyage auto :", err.message));
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend demarre sur http://localhost:${PORT}`);
});