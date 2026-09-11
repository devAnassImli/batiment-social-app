const sql = require('mssql');

const configSms = {
  server: process.env.DB_SMS_SERVER,
  port: 1433,
  database: process.env.DB_SMS_DATABASE,
  user: process.env.DB_SMS_USER,
  password: process.env.DB_SMS_PASSWORD,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let poolSmsPromise = null;
function getPoolSms() {
  if (!poolSmsPromise) {
    const pool = new sql.ConnectionPool(configSms);
    poolSmsPromise = pool.connect();
  }
  return poolSmsPromise;
}

// Enleve les accents et caracteres speciaux non supportes par le SMS
function nettoyerMessage(texte) {
  return texte
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, '')
    .slice(0, 160);
}

async function envoyerSmsAuxAdmins(message, destinataires) {
  const pool = await getPoolSms();
  const numeros = (process.env.SMS_ADMIN_NUMEROS || '').split(',').map((n) => n.trim()).filter(Boolean);
  const messagePropre = nettoyerMessage(message);

  for (let i = 0; i < numeros.length; i++) {
    const numero = numeros[i];
    const nomDestinataire = destinataires[i] || 'Administrateur';
    try {
      await pool.request()
        .input('RifApp', sql.NChar(10), 'TOTEM-BS')
        .input('Message', sql.NVarChar(160), messagePropre)
        .input('PhoneNumber', sql.NVarChar(40), numero)
        .input('RecipientPerson', sql.NVarChar(40), nomDestinataire)
        .input('Priority', sql.Int, 1)
        .execute('UP_send_sms_priorita');
      console.log('SMS envoye a', numero);
    } catch (err) {
      console.error('Erreur envoi SMS a', numero, ':', err.message);
    }
  }
}

module.exports = { envoyerSmsAuxAdmins };