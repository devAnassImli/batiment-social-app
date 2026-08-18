const express = require("express");
const cors = require("cors");
require("dotenv").config();
const sql = require("mssql");
const dbSqlite = require('./db-sqlite');
const app = express();
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
app.get('/api/test-sqlite', (req, res) => {
  const zones = dbSqlite.prepare('SELECT * FROM T_BS_ZONES').all();
  res.json(zones);
});
app.post('/api/signalements', (req, res) => {
  const { matricule, nomDemandeur, zone, categorie, urgence, description } = req.body;

  if (!matricule || !zone || !categorie || !urgence || !description) {
    return res.status(400).json({ erreur: 'Champs manquants' });
  }

  try {
    const idZone = dbSqlite.prepare('SELECT IdZone FROM T_BS_ZONES WHERE Nom = ?').get(zone)?.IdZone;
    const idCategorie = dbSqlite.prepare('SELECT IdCategorie FROM T_BS_CATEGORIES WHERE Nom = ?').get(categorie)?.IdCategorie;
    const idAvancementInitial = dbSqlite.prepare('SELECT IdAvancement FROM T_BS_AVANCEMENT WHERE Position = 1').get()?.IdAvancement;

    if (!idZone || !idCategorie) {
      return res.status(400).json({ erreur: 'Zone ou catégorie invalide' });
    }

    const resultat = dbSqlite.prepare(`
      INSERT INTO T_BS_SIGNALEMENTS
        (MatriculeDemandeur, NomDemandeur, IdZone, IdCategorie, Urgence, Description, Statut, IdAvancement)
      VALUES (?, ?, ?, ?, ?, ?, 'A_VALIDER', ?)
    `).run(matricule, nomDemandeur, idZone, idCategorie, urgence, description, idAvancementInitial);

    dbSqlite.prepare(`
      INSERT INTO T_BS_HISTORIQUE (IdSignalement, Auteur, Action, Commentaire)
      VALUES (?, ?, 'Création', 'Signalement créé depuis le totem')
    `).run(resultat.lastInsertRowid, nomDemandeur);

    res.json({ succes: true, idSignalement: resultat.lastInsertRowid });
  } catch (err) {
    console.error('Erreur sauvegarde signalement :', err.message);
    res.status(500).json({ erreur: err.message });
  }
});
app.get('/api/signalements', (req, res) => {
  const signalements = dbSqlite.prepare(`
    SELECT s.*, z.Nom AS ZoneNom, c.Nom AS CategorieNom
    FROM T_BS_SIGNALEMENTS s
    LEFT JOIN T_BS_ZONES z ON z.IdZone = s.IdZone
    LEFT JOIN T_BS_CATEGORIES c ON c.IdCategorie = s.IdCategorie
    ORDER BY s.IdSignalement DESC
  `).all();
  res.json(signalements);
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend demarre sur http://localhost:${PORT}`);
});
