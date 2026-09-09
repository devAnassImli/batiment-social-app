const sql = require("mssql");

const config = {
  server: process.env.DB_TRAVAUX_SERVER.split("\\")[0],
  database: process.env.DB_TRAVAUX_DATABASE,
  user: process.env.DB_TRAVAUX_USER,
  password: process.env.DB_TRAVAUX_PASSWORD,
  options: {
    instanceName: process.env.DB_TRAVAUX_SERVER.split("\\")[1],
    encrypt: false,
    trustServerCertificate: true,
  },
};

console.log("Config SQL Travaux utilisee :", config);

let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(config);
    poolPromise = pool.connect();
  }
  return poolPromise;
}

async function diagnosticConnexion() {
  const pool = await getPool();

  const r = await pool.request().query(`
    SELECT
      DB_NAME() AS baseActuelle,
      @@SERVERNAME AS serveur,
      SERVERPROPERTY('InstanceName') AS instance,
      SERVERPROPERTY('ServerName') AS nomComplet
  `);

  console.log("DIAGNOSTIC CONNEXION SQL :", r.recordset[0]);
}

diagnosticConnexion().catch((e) =>
  console.log("Erreur diagnostic :", e.message),
);

// ID du service BATIMENT SOCIAL
async function getOuCreerServiceBatimentSocial() {
  const pool = await getPool();

  const existe = await pool
    .request()
    .query(
      `SELECT IdService FROM T_BT_SERVICES WHERE Service = 'BATIMENT SOCIAL'`,
    );

  if (existe.recordset.length > 0) {
    return existe.recordset[0].IdService;
  }

  const cree = await pool.request().query(`
    INSERT INTO T_BT_SERVICES (Service)
    OUTPUT INSERTED.IdService
    VALUES ('BATIMENT SOCIAL')
  `);

  return cree.recordset[0].IdService;
}

// Recherche une catégorie par son nom
async function getIdCategorie(nomCategorie) {
  const pool = await getPool();

  const r = await pool.request().input("nom", sql.NVarChar, nomCategorie)
    .query(`
      SELECT TOP 1 IdCategoria
      FROM T_BT_CATEGORIE
      WHERE Categoria = @nom
    `);

  return r.recordset[0]?.IdCategoria || null;
}

// Prochain numéro de demande
async function getProchainNumero(annee) {
  const pool = await getPool();

  const r = await pool.request().input("annee", sql.Int, annee).query(`
      SELECT ISNULL(MAX(NumDomanda), 0) + 1 AS prochain
      FROM T_BT_DEMANDES
      WHERE AnnoDomanda = @annee
    `);

  return r.recordset[0].prochain;
}

// Création d'une demande
async function creerDemande({
  nomDemandeur,
  matriculeDemandeur,
  zone,
  categorie,
  urgence,
  description,
}) {
  const pool = await getPool();

  const idService = await getOuCreerServiceBatimentSocial();

  const annee = new Date().getFullYear();
  const numero = await getProchainNumero(annee);

  const guid = Math.random().toString(16).slice(2, 10);

  const oggetto = `${zone || "Non precise"} - ${urgence || "Normal"}`;

  const descrittivo = `[Matricule: ${matriculeDemandeur || ""}] ${
    description || "Aucune description"
  }`;

  console.log("Valeurs a inserer :", {
    numero,
    annee,
    guid,
    idService,
    nomDemandeur,
    oggetto,
    descrittivo,
  });

  let idDomanda;

  try {
    const resultat = await pool
      .request()
      .input("NumDomanda", sql.Int, numero)
      .input("AnnoDomanda", sql.Int, annee)
      .input("GuidDomanda", sql.NVarChar(16), guid)
      .input("IdService", sql.Int, idService)
      .input("Richiedente", sql.NVarChar(400), nomDemandeur)
      .input("Oggetto", sql.NVarChar(sql.MAX), oggetto)
      .input("Descrittivo", sql.NVarChar(sql.MAX), descrittivo).query(`
        INSERT INTO T_BT_DEMANDES
          (
            NumDomanda,
            AnnoDomanda,
            GuidDomanda,
            DataDomanda,
            IdService,
            Richiedente,
            Oggetto,
            Descrittivo,
            InsertData,
            Validata
          )
        OUTPUT INSERTED.IdDomanda
        VALUES
          (
            @NumDomanda,
            @AnnoDomanda,
            @GuidDomanda,
            GETDATE(),
            @IdService,
            @Richiedente,
            @Oggetto,
            @Descrittivo,
            GETDATE(),
            0
          )
      `);

    idDomanda = resultat.recordset[0].IdDomanda;

    console.log("INSERT T_BT_DEMANDES reussi, IdDomanda =", idDomanda);
  } catch (err) {
    console.error("ECHEC sur INSERT T_BT_DEMANDES :", err.message);
    throw err;
  }

  try {
    const idCategorie = await getIdCategorie(categorie);

    console.log("idCategorie trouve :", idCategorie);

    if (idCategorie) {
      await pool
        .request()
        .input("guid", sql.NVarChar(16), guid)
        .input("idCategorie", sql.Int, idCategorie).query(`
          INSERT INTO T_BT_GUID_CATEGORIE
            (GuidDomanda, IdCategoria)
          VALUES
            (@guid, @idCategorie)
        `);

      console.log("INSERT T_BT_GUID_CATEGORIE reussi");
    }
  } catch (err) {
    console.error("ECHEC sur INSERT T_BT_GUID_CATEGORIE :", err.message);

    // Ne bloque pas le signalement
  }

  return {
    idDomanda,
    numero,
    annee,
    guid,
  };
}

// Liste des demandes
async function listerDemandes({ matricule, tousLesUtilisateurs, dateDebut, dateFin }) {
  const pool = await getPool();
  const idService = await getOuCreerServiceBatimentSocial();

  let requete = `
    SELECT d.IdDomanda, d.NumDomanda, d.AnnoDomanda, d.DataDomanda, d.Richiedente,
           d.Oggetto, d.Descrittivo, d.Validata, d.IdAvanzamento, d.DataUltimoAggiornamento,
           a.Avanzamento AS AvanzamentoNome
    FROM T_BT_DEMANDES d
    LEFT JOIN T_BT_AVANZAMENTO a ON a.IdAvanzamento = d.IdAvanzamento
    WHERE d.IdService = @idService
  `;
  const request = pool.request().input('idService', sql.Int, idService);

  if (!tousLesUtilisateurs) {
    requete += ` AND d.Descrittivo LIKE @matricule`;
    request.input('matricule', sql.NVarChar, `%[Matricule: ${matricule}]%`);
  }
  if (dateDebut) {
    requete += ` AND d.DataDomanda >= @dateDebut`;
    request.input('dateDebut', sql.DateTime, new Date(dateDebut));
  }
  if (dateFin) {
    requete += ` AND d.DataDomanda <= @dateFin`;
    request.input('dateFin', sql.DateTime, new Date(dateFin + 'T23:59:59'));
  }

  requete += ` ORDER BY d.IdDomanda DESC`;
  const r = await request.query(requete);
  return r.recordset;
}
async function supprimerDemande(idDomanda, matricule, estAdmin) {
  const pool = await getPool();
  const idService = await getOuCreerServiceBatimentSocial();

  // Verifie que la demande appartient bien a notre service ET (est admin OU c'est sa propre demande)
  const demande = await pool.request()
    .input('id', sql.Int, idDomanda)
    .input('idService', sql.Int, idService)
    .query(`SELECT GuidDomanda, Descrittivo FROM T_BT_DEMANDES WHERE IdDomanda = @id AND IdService = @idService`);

  if (demande.recordset.length === 0) {
    throw new Error('Demande introuvable ou hors service Batiment Social');
  }

  const { GuidDomanda, Descrittivo } = demande.recordset[0];
  const estProprietaire = (Descrittivo || '').includes(`[Matricule: ${matricule}]`);

  if (!estAdmin && !estProprietaire) {
    throw new Error('Non autorise a supprimer cette demande');
  }

  // Supprime d'abord les liaisons (categorie, pilote) pour eviter les orphelins
  await pool.request().input('guid', sql.NVarChar, GuidDomanda)
    .query(`DELETE FROM T_BT_GUID_CATEGORIE WHERE GuidDomanda = @guid`);
  await pool.request().input('id', sql.Int, idDomanda)
    .query(`DELETE FROM T_BT_DEMANDES_PILOTI WHERE IdDomanda = @id`);

  // Puis la demande elle-meme, toujours filtree sur notre service par securite
  await pool.request()
    .input('id', sql.Int, idDomanda)
    .input('idService', sql.Int, idService)
    .query(`DELETE FROM T_BT_DEMANDES WHERE IdDomanda = @id AND IdService = @idService`);
}


async function modifierDemande(idDomanda, matricule, estAdmin, { description }) {
  const pool = await getPool();
  const idService = await getOuCreerServiceBatimentSocial();

  const demande = await pool.request()
    .input('id', sql.Int, idDomanda)
    .input('idService', sql.Int, idService)
    .query(`SELECT Descrittivo FROM T_BT_DEMANDES WHERE IdDomanda = @id AND IdService = @idService`);

  if (demande.recordset.length === 0) {
    throw new Error('Demande introuvable ou hors service Batiment Social');
  }

  const descrittivoActuel = demande.recordset[0].Descrittivo || '';
  const estProprietaire = descrittivoActuel.includes(`[Matricule: ${matricule}]`);

  if (!estAdmin && !estProprietaire) {
    throw new Error('Non autorise a modifier cette demande');
  }

  // On garde le prefixe [Matricule: ...] et on remplace juste le texte apres
  const prefixeMatch = descrittivoActuel.match(/^\[Matricule: \d+\]\s*/);
  const prefixe = prefixeMatch ? prefixeMatch[0] : '';
  const nouveauDescrittivo = prefixe + description;

  await pool.request()
    .input('id', sql.Int, idDomanda)
    .input('descrittivo', sql.NVarChar(sql.MAX), nouveauDescrittivo)
    .query(`UPDATE T_BT_DEMANDES SET Descrittivo = @descrittivo, DataUltimoAggiornamento = GETDATE() WHERE IdDomanda = @id`);
}

async function validerDemande(idDomanda, matriculeValideur) {
  const pool = await getPool();
  const idService = await getOuCreerServiceBatimentSocial();

  const demande = await pool.request()
    .input('id', sql.Int, idDomanda)
    .input('idService', sql.Int, idService)
    .query(`SELECT IdDomanda FROM T_BT_DEMANDES WHERE IdDomanda = @id AND IdService = @idService`);

  if (demande.recordset.length === 0) {
    throw new Error('Demande introuvable ou hors service Batiment Social');
  }

  await pool.request()
    .input('id', sql.Int, idDomanda)
    .input('valideur', sql.NVarChar, matriculeValideur)
    .query(`
      UPDATE T_BT_DEMANDES
      SET Validata = 1, PersonaValidazione = @valideur, DataValidazione = GETDATE()
      WHERE IdDomanda = @id
    `);
}
async function getDemande(idDomanda) {
  const pool = await getPool();

  const r = await pool.request().input("id", sql.Int, idDomanda).query(`
      SELECT d.*, a.Avanzamento AS AvanzamentoNome
      FROM T_BT_DEMANDES d
      LEFT JOIN T_BT_AVANZAMENTO a
        ON a.IdAvanzamento = d.IdAvanzamento
      WHERE d.IdDomanda = @id
    `);

  return r.recordset[0] || null;
}


async function nettoyerAncienneDemandes() {
  const pool = await getPool();
  const idService = await getOuCreerServiceBatimentSocial();

  const anciennes = await pool.request()
    .input('idService', sql.Int, idService)
    .query(`
      SELECT IdDomanda, GuidDomanda FROM T_BT_DEMANDES
      WHERE IdService = @idService AND DataDomanda < DATEADD(MONTH, -1, GETDATE())
    `);

  for (const d of anciennes.recordset) {
    await pool.request().input('guid', sql.NVarChar, d.GuidDomanda)
      .query(`DELETE FROM T_BT_GUID_CATEGORIE WHERE GuidDomanda = @guid`);
    await pool.request().input('id', sql.Int, d.IdDomanda)
      .query(`DELETE FROM T_BT_DEMANDES_PILOTI WHERE IdDomanda = @id`);
    await pool.request().input('id', sql.Int, d.IdDomanda)
      .query(`DELETE FROM T_BT_DEMANDES WHERE IdDomanda = @id`);
  }

  if (anciennes.recordset.length > 0) {
    console.log(`Nettoyage automatique : ${anciennes.recordset.length} demande(s) de plus d'1 mois supprimee(s)`);
  }
}

module.exports = { ...module.exports, nettoyerAncienneDemandes };

module.exports = {
  getPool,
  creerDemande,
  listerDemandes,
  getDemande,
  supprimerDemande,
  modifierDemande,
  validerDemande,
  nettoyerAncienneDemandes,
  getOuCreerServiceBatimentSocial,
};