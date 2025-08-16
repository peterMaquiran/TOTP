import express from 'express';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

const app = express();
app.use(express.json());


app.get('/gen', async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: 'MyVPN 2FA' });
    const qr = await qrcode.toDataURL(secret.otpauth_url);
    res.send(`
      <html>
        <head>
          <title>2FA Setup</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding-top: 50px; }
            img { margin-top: 20px; }
            code { background: #f4f4f4; padding: 4px 8px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>Scan the QR Code</h1>
          <p>Use your authenticator app (like Aegis or Google Authenticator)</p>
          <img src="${qr}" alt="QR Code" />
          <p>Or manually enter this code:</p>
          <code>${secret.base32}</code>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// GET /generate - Create a new secret and QR code
app.get('/generate', async (req, res) => {
  const secret = speakeasy.generateSecret({ name: 'MyVPN 2FA' });
  const qr = await qrcode.toDataURL(secret.otpauth_url);

  res.json({
    secret: secret.base32,
    qr,
  });
});

// POST /verify - Verify user code against stored secret
app.post('/verify', (req, res) => {
  const { token, secret } = req.body;

  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });

  res.json({ verified });
});


app.post('/login', (req, res) => {
  const { username, password, token } = req.body;
  const user = users[username];
  if (!user) return res.status(401).send('Unauthorized');

  const passOk = bcrypt.compareSync(password, user.passwordHash);
  if (!passOk) return res.status(401).send('Unauthorized');

  const tokenOk = speakeasy.totp.verify({ secret: user.totpSecret, encoding: 'base32', token });
  if (!tokenOk) return res.status(401).send('Unauthorized');

  // Send WireGuard config file content or URL
  const config = fs.readFileSync(user.wgConfigPath, 'utf8');
  res.json({ config });
});

app.listen(3100, () => {
  console.log('2FA server running at http://localhost:3100');
});
