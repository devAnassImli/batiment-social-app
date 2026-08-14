const express = require("express");
const cors = require("cors");
require("dotenv").config();
const sql = require("mssql");

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
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend demarre sur http://localhost:${PORT}`);
});
