const express = require("express");
const cors = require("cors");
require("dotenv").config();
const sql = require("mssql");
const ldap = require("ldapjs");
const jwt = require("jsonwebtoken");
const dbSqlite = require('./db-sqlite');

const app = express();
app.use(cors());
app.use(express.json());

// ══════════════════════════════════════════════════════════
//  CONFIG SQL SERVER (base employes, lecture seule)
// ══════════════════════════════════════════════════════════
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

app.get("/api/test", (req, res) => {
  res.json({ message: "Le backend fonctionne !" });
});

app.get("/api/test-db", async (req, res) => {
  try {
    await sql.connect(configEmployes);
    res.json({ connexion: "OK", base: process.env.DB_EMPLOYEES_DATABASE });
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

app.get("/api/employe/:matricule", async (req, res) => {
  const matriculeBrut = req.params.matricule;
  const matricule = matriculeBrut.padStart(5, "0").slice(0, 5);
  try {
    const pool = await sql.connect(configEmployes);
    const resultat = await pool
      .request()
      .input("Matricola", sql.NChar(5), matricule)
      .execute(process.env.DB_EMPLOYEES_SP);

    if (resultat.recordset.length === 0) {
      return res.status(404).json({ trouve: false, message: "Matricule inconnu" });
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

// ══════════════════════════════════════════════════════════
//  AUTHENTIFICATION LDAP + JWT (back-office)
// ══════════════════════════════════════════════════════════
const LDAP_URL = 'ldap://mt.rivagroup.local';
const LDAP_BASE_DN = 'DC=mt,DC=rivagroup,DC=local';

function tryLdapBind(bindDN, password) {
  return new Promise((resolve) => {
    const client = ldap.createClient({ url: LDAP_URL, timeout: 5000, connectTimeout: 5000 });
    client.on('error', () => resolve(null));

    client.bind(bindDN, password, (err) => {
      if (err) {
        console.log('LDAP bind echoue pour', bindDN, ':', err.message);
        client.destroy();
        resolve(null);
        return;
      }
      const username = bindDN.includes('\\') ? bindDN.split('\\')[1] : bindDN.split('@')[0];
      const searchOptions = {
        filter: `(sAMAccountName=${username})`,
        scope: 'sub',
        attributes: ['cn', 'mail', 'sAMAccountName'],
      };
      client.search(LDAP_BASE_DN, searchOptions, (err, res) => {
        if (err) { client.destroy(); resolve(null); return; }
        let userInfo = null;
        res.on('searchEntry', (entry) => {
          let cn = username, email = '';
          if (entry.object) {
            cn = entry.object.cn || entry.object.CN || username;
            email = entry.object.mail || entry.object.Mail || '';
          } else if (entry.attributes) {
            entry.attributes.forEach((attr) => {
              if ((attr.type || '').toLowerCase() === 'cn') cn = attr.values ? attr.values[0] : '';
              if ((attr.type || '').toLowerCase() === 'mail') email = attr.values ? attr.values[0] : '';
            });
          }
          userInfo = { nomComplet: cn, email, username };
        });
        res.on('end', () => { client.destroy(); resolve(userInfo); });
        res.on('error', () => { client.destroy(); resolve(null); });
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

app.post('/api/admin/connexion', async (req, res) => {
  const { identifiant, motDePasse } = req.body;
  if (!identifiant || !motDePasse) {
    return res.status(400).json({ succes: false, message: 'Identifiant et mot de passe requis' });
  }
  try {
    const utilisateurLdap = await authentifierLdap(identifiant, motDePasse);
    if (!utilisateurLdap) {
      return res.status(401).json({ succes: false, message: 'Identifiants incorrects' });
    }
    const token = jwt.sign(
      { username: utilisateurLdap.username, nomComplet: utilisateurLdap.nomComplet, email: utilisateurLdap.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ succes: true, token, utilisateur: utilisateurLdap });
  } catch (err) {
    console.error('Erreur LDAP :', err.message);
    res.status(500).json({ succes: false, message: 'Erreur serveur' });
  }
});

function verifierToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erreur: 'Token manquant' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.utilisateur = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ erreur: 'Token invalide ou expiré' });
  }
}

// ══════════════════════════════════════════════════════════
//  ROUTES ADMIN (protegees par JWT)
// ══════════════════════════════════════════════════════════
app.get('/api/signalements', verifierToken, (req, res) => {
  const signalements = dbSqlite.prepare(`
    SELECT s.*, z.Nom AS ZoneNom, c.Nom AS CategorieNom
    FROM T_BS_SIGNALEMENTS s
    LEFT JOIN T_BS_ZONES z ON z.IdZone = s.IdZone
    LEFT JOIN T_BS_CATEGORIES c ON c.IdCategorie = s.IdCategorie
    WHERE s.Supprime = 0
    ORDER BY s.IdSignalement DESC
  `).all();
  res.json(signalements);
});

app.get('/api/signalements/:id', verifierToken, (req, res) => {
  const { id } = req.params;
  const signalement = dbSqlite.prepare(`
    SELECT s.*, z.Nom AS ZoneNom, c.Nom AS CategorieNom, p.NomComplet AS PiloteNom, a.Nom AS AvancementNom
    FROM T_BS_SIGNALEMENTS s
    LEFT JOIN T_BS_ZONES z ON z.IdZone = s.IdZone
    LEFT JOIN T_BS_CATEGORIES c ON c.IdCategorie = s.IdCategorie
    LEFT JOIN T_BS_PILOTES p ON p.IdPilote = s.IdPilote
    LEFT JOIN T_BS_AVANCEMENT a ON a.IdAvancement = s.IdAvancement
    WHERE s.IdSignalement = ?
  `).get(id);

  if (!signalement) return res.status(404).json({ erreur: 'Signalement introuvable' });

  const historique = dbSqlite.prepare(`
    SELECT * FROM T_BS_HISTORIQUE WHERE IdSignalement = ? ORDER BY DateAction DESC
  `).all(id);

  res.json({ signalement, historique });
});

app.post('/api/signalements/:id/valider', verifierToken, (req, res) => {
  const { id } = req.params;
  dbSqlite.prepare(`UPDATE T_BS_SIGNALEMENTS SET Statut = 'VALIDE', DateValidation = CURRENT_TIMESTAMP WHERE IdSignalement = ?`).run(id);
  dbSqlite.prepare(`INSERT INTO T_BS_HISTORIQUE (IdSignalement, Auteur, Action) VALUES (?, ?, 'Validé')`).run(id, req.utilisateur.nomComplet);
  res.json({ succes: true });
});

app.post('/api/signalements/:id/refuser', verifierToken, (req, res) => {
  const { id } = req.params;
  const { motif } = req.body;
  dbSqlite.prepare(`UPDATE T_BS_SIGNALEMENTS SET Statut = 'REFUSE' WHERE IdSignalement = ?`).run(id);
  dbSqlite.prepare(`INSERT INTO T_BS_HISTORIQUE (IdSignalement, Auteur, Action, Commentaire) VALUES (?, ?, 'Refusé', ?)`).run(id, req.utilisateur.nomComplet, motif || '');
  res.json({ succes: true });
});

app.post('/api/signalements/:id/annuler', verifierToken, (req, res) => {
  const { id } = req.params;
  dbSqlite.prepare(`UPDATE T_BS_SIGNALEMENTS SET Statut = 'ANNULE' WHERE IdSignalement = ?`).run(id);
  dbSqlite.prepare(`INSERT INTO T_BS_HISTORIQUE (IdSignalement, Auteur, Action) VALUES (?, ?, 'Annulé')`).run(id, req.utilisateur.nomComplet);
  res.json({ succes: true });
});

app.delete('/api/signalements/:id', verifierToken, (req, res) => {
  const { id } = req.params;
  dbSqlite.prepare(`UPDATE T_BS_SIGNALEMENTS SET Supprime = 1 WHERE IdSignalement = ?`).run(id);
  dbSqlite.prepare(`INSERT INTO T_BS_HISTORIQUE (IdSignalement, Auteur, Action) VALUES (?, ?, 'Supprimé')`).run(id, req.utilisateur.nomComplet);
  res.json({ succes: true });
});

app.post('/api/signalements/:id/avancement', verifierToken, (req, res) => {
  const { id } = req.params;
  const { idAvancement } = req.body;
  const avancement = dbSqlite.prepare('SELECT Nom FROM T_BS_AVANCEMENT WHERE IdAvancement = ?').get(idAvancement);
  if (!avancement) return res.status(400).json({ erreur: 'Avancement invalide' });

  dbSqlite.prepare(`UPDATE T_BS_SIGNALEMENTS SET IdAvancement = ? WHERE IdSignalement = ?`).run(idAvancement, id);
  dbSqlite.prepare(`INSERT INTO T_BS_HISTORIQUE (IdSignalement, Auteur, Action) VALUES (?, ?, ?)`)
    .run(id, req.utilisateur.nomComplet, `Avancement changé : ${avancement.Nom}`);
  res.json({ succes: true });
});

app.post('/api/signalements/:id/pilote', verifierToken, (req, res) => {
  const { id } = req.params;
  const { idPilote } = req.body;
  const pilote = dbSqlite.prepare('SELECT NomComplet FROM T_BS_PILOTES WHERE IdPilote = ?').get(idPilote);
  if (!pilote) return res.status(400).json({ erreur: 'Pilote invalide' });

  dbSqlite.prepare(`UPDATE T_BS_SIGNALEMENTS SET IdPilote = ? WHERE IdSignalement = ?`).run(idPilote, id);
  dbSqlite.prepare(`INSERT INTO T_BS_HISTORIQUE (IdSignalement, Auteur, Action) VALUES (?, ?, ?)`)
    .run(id, req.utilisateur.nomComplet, `Assigné à ${pilote.NomComplet}`);
  res.json({ succes: true });
});

app.get('/api/reference/avancement', verifierToken, (req, res) => {
  res.json(dbSqlite.prepare('SELECT * FROM T_BS_AVANCEMENT WHERE Actif = 1 ORDER BY Position').all());
});

app.get('/api/reference/pilotes', verifierToken, (req, res) => {
  res.json(dbSqlite.prepare('SELECT * FROM T_BS_PILOTES WHERE Actif = 1').all());
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend demarre sur http://localhost:${PORT}`);
});