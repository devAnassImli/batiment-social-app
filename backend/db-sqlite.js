const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'batiment-social.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS T_BS_ZONES (
    IdZone INTEGER PRIMARY KEY AUTOINCREMENT,
    Nom TEXT NOT NULL,
    Actif INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS T_BS_CATEGORIES (
    IdCategorie INTEGER PRIMARY KEY AUTOINCREMENT,
    Nom TEXT NOT NULL,
    Actif INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS T_BS_AVANCEMENT (
    IdAvancement INTEGER PRIMARY KEY AUTOINCREMENT,
    Nom TEXT NOT NULL,
    Position INTEGER NOT NULL,
    Actif INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS T_BS_PILOTES (
    IdPilote INTEGER PRIMARY KEY AUTOINCREMENT,
    NomComplet TEXT NOT NULL,
    Type TEXT CHECK (Type IN ('INT','EXT')),
    Actif INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS T_BS_SIGNALEMENTS (
    IdSignalement INTEGER PRIMARY KEY AUTOINCREMENT,
    DateCreation TEXT DEFAULT CURRENT_TIMESTAMP,
    MatriculeDemandeur TEXT NOT NULL,
    NomDemandeur TEXT,
    IdZone INTEGER REFERENCES T_BS_ZONES(IdZone),
    IdCategorie INTEGER REFERENCES T_BS_CATEGORIES(IdCategorie),
    Urgence TEXT CHECK (Urgence IN ('Normal','Urgent')),
    Description TEXT,
    Statut TEXT DEFAULT 'A_VALIDER',
    IdAvancement INTEGER REFERENCES T_BS_AVANCEMENT(IdAvancement),
    IdPilote INTEGER REFERENCES T_BS_PILOTES(IdPilote),
    DateValidation TEXT,
    Supprime INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS T_BS_HISTORIQUE (
    IdHistorique INTEGER PRIMARY KEY AUTOINCREMENT,
    IdSignalement INTEGER REFERENCES T_BS_SIGNALEMENTS(IdSignalement),
    DateAction TEXT DEFAULT CURRENT_TIMESTAMP,
    Auteur TEXT,
    Action TEXT,
    Commentaire TEXT
  );
    CREATE TABLE IF NOT EXISTS T_BS_ADMINS_TOTEM (
    Matricule TEXT PRIMARY KEY
  );
`);

const zoneExiste = db.prepare('SELECT COUNT(*) AS n FROM T_BS_ZONES').get();
if (zoneExiste.n === 0) {
    db.prepare('INSERT OR IGNORE INTO T_BS_ADMINS_TOTEM (Matricule) VALUES (?)').run('05102');
  const insererZone = db.prepare('INSERT INTO T_BS_ZONES (Nom) VALUES (?)');
  ['Infirmerie', 'Casiers', 'Douches', 'Poste de garde', 'Bascule CSE'].forEach(z => insererZone.run(z));

  const insererCategorie = db.prepare('INSERT INTO T_BS_CATEGORIES (Nom) VALUES (?)');
  ['Plomberie', 'Électricité', 'Serrurerie', 'Propreté', 'Autre'].forEach(c => insererCategorie.run(c));

  const insererAvancement = db.prepare('INSERT INTO T_BS_AVANCEMENT (Nom, Position) VALUES (?, ?)');
  [
    ['En attente de validation', 1],
    ['Validé - à traiter', 2],
    ['Pris en charge', 3],
    ['Travail en cours', 4],
    ['Terminé', 5],
  ].forEach(([nom, pos]) => insererAvancement.run(nom, pos));

  const insererPilote = db.prepare('INSERT INTO T_BS_PILOTES (NomComplet, Type) VALUES (?, ?)');
  [['Manlio COPPOLA', 'INT'], ['Daniel CARDOSO', 'INT'], ['Entreprise BOPLAN', 'EXT']].forEach(([nom, type]) => insererPilote.run(nom, type));

  console.log('Base SQLite initialisee avec les donnees de reference.');
}

module.exports = db;