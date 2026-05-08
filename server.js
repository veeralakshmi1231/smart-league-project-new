const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const admin = require('firebase-admin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dns = require('dns');

// Force IPv4 globally to prevent ENETUNREACH errors on Render
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const secretPath = '/etc/secrets/.env';
if (fs.existsSync(secretPath)) {
  require('dotenv').config({ path: secretPath, override: true });
  console.log("Loaded configuration from Render Secret File (FORCED) ✅");
} else {
  require('dotenv').config();
}

console.log("Environment Variables found:", Object.keys(process.env).filter(k => !k.startsWith('npm_') && !k.startsWith('NODE_')));
console.log("Email Credentials Found:", { 
  USER: !!process.env.EMAIL_USER, 
  PASS: !!process.env.EMAIL_PASS 
});

// Firebase Admin Initialization
let serviceAccount;
try {
  const envVal = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envVal) {
    if (envVal.trim().startsWith('{')) {
      // It's a normal JSON string
      serviceAccount = JSON.parse(envVal);
    } else {
      // It's a Base64 encoded string
      const decoded = Buffer.from(envVal, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decoded);
    }
    console.log("Firebase Admin initialized via Environment Variable ✅");
  } else {
    throw new Error("No environment variable found");
  }
} catch (e) {
  // Fallback to local file (Development)
  try {
    serviceAccount = require('./serviceAccountKey.json');
    console.log("Firebase Admin initialized via local serviceAccountKey.json ✅");
  } catch (err) {
    console.error("WARNING: Could not find Firebase Service Account Key. Firebase operations will fail. ❌");
  }
}

if (serviceAccount) {
  try {
    // Safety fix for private key newlines in Environment Variables
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin successfully initialized! 🚀");
  } catch (initErr) {
    console.error("Firebase initialization failed:", initErr.message);
    serviceAccount = null; // Mark as failed so we don't try to use it
  }
}

const db = serviceAccount ? admin.firestore() : null;
const auth = serviceAccount ? admin.auth() : null;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer for local storage
const storageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('uploads/')) {
      fs.mkdirSync('uploads/');
    }
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storageConfig });

// Gmail transporter - FIXED FOR RENDER (Port 587)
console.log("SERVER VERSION: 2.0.0 (Anti-Hang Mode)");

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 5000, // FAST FAIL - 5 seconds
  socketTimeout: 5000,
});

async function verifyEmail() {
  console.log("Nodemailer: Starting manual connection verification...");
  try {
    await transporter.verify();
    console.log("Server is ready to send emails ✅");
    
    // Test email
    console.log("Sending Startup Test Email...");
    await transporter.sendMail({
      from: `"Smart League System" <${process.env.EMAIL_USER}>`,
      to: "esthersilviya900@gmail.com",
      subject: "🚀 Server Startup Test (Manual Mode)",
      text: "If you see this, the manual connection fix worked! ✅"
    });
    console.log("Startup Test Email SENT successfully! 📬");
  } catch (error) {
    console.error("Nodemailer verification error ❌:", error.message);
    if (error.code === 'ETIMEDOUT') {
      console.error("The connection timed out. Render might be blocking Port 465.");
    }
  }
}

verifyEmail();

// Create Staff User Endpoint
app.post('/create-staff', async (req, res) => {
  if (!auth || !db) return res.status(500).json({ error: 'Firebase not initialized on server' });
  const { email, name, institution, invitedBy, role } = req.body;

  if (!email || !name || !institution) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const generatedPassword = Math.random().toString(36).slice(-8);
  const assignedRole = role || 'editor';

  try {
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email,
        password: generatedPassword,
        displayName: name,
      });
    } catch (authError) {
      if (authError.code === 'auth/email-already-exists') {
        userRecord = await auth.getUserByEmail(email);
        await auth.updateUser(userRecord.uid, { password: generatedPassword });
      } else {
        throw authError;
      }
    }

    const profileData = {
      displayName: name,
      email: email,
      institution: institution,
      role: assignedRole,
      status: 'active',
      invitedBy: invitedBy,
      requiresPasswordReset: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(userRecord.uid).set(profileData, { merge: true });

    await db.collection('invites').add({
      email, name, institution,
      status: 'completed',
      uid: userRecord.uid,
      invitedBy,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const inviteToken = require('crypto').randomBytes(32).toString('hex');
    await db.collection('tempInviteTokens').doc(inviteToken).set({
      email,
      password: generatedPassword,
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 1000 * 60 * 60 * 24)),
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const loginLink = `${frontendUrl}/login?inviteToken=${inviteToken}`;
    
    // Send email in background (non-blocking) to prevent UI hangs
    const senderEmail = process.env.EMAIL_USER;
    console.log(`DEBUG: Attempting to send invitation to: ${email} from ${senderEmail}`);
    transporter.sendMail({
      from: `"Smart League" <${senderEmail}>`,
      to: email,
      subject: `Account Ready: Join ${institution} on Smart League`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1c1e;">
          <div style="background: #002045; padding: 40px; text-align: center; border-radius: 20px 20px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Your Account is Ready</h1>
          </div>
          <div style="padding: 40px; border: 1px solid #e1e2ec; border-radius: 0 0 20px 20px;">
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your staff account for <strong>${institution}</strong> has been successfully created. You have been assigned the role of <strong>${assignedRole.toUpperCase()}</strong>.</p>
            
            <div style="background: #f0f0f7; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Login Email:</strong> ${email}</p>
              <p style="margin: 5px 0 0 0;"><strong>Temporary Password:</strong> ${generatedPassword}</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${loginLink}" style="background: #002045; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">Login to Dashboard</a>
            </div>
            
            <p style="margin-top: 40px; font-size: 12px; color: #74777f; border-top: 1px solid #e1e2ec; padding-top: 20px;">
              Welcome to the Smart League network!
            </p>
          </div>
        </div>
      `,
    }).catch(err => {
      console.error("CRITICAL: Background email failed to send!");
      console.error("Error Code:", err.code);
      console.error("Error Message:", err.message);
    });

    res.status(200).json({ message: 'Staff user created! Email is being sent in the background. ✅', uid: userRecord.uid });

  } catch (error) {
    console.error('Error creating staff (Auth/DB part):', error);
    res.status(500).json({ error: error.message || 'Failed to create staff user ❌' });
  }
});

// Delete User Completely
app.post('/delete-user-completely', async (req, res) => {
  if (!auth || !db) return res.status(500).json({ error: 'Firebase not initialized' });
  const { uid } = req.body;
  try {
    try {
      await auth.deleteUser(uid);
    } catch (authErr) {
      if (authErr.code !== 'auth/user-not-found') throw authErr;
    }
    await db.collection('users').doc(uid).delete();
    console.log(`User ${uid} successfully wiped from Auth and DB ✅`);
    res.status(200).json({ message: 'User wiped completely ✅' });
  } catch (error) {
    console.error('Deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/delete-user-by-email', async (req, res) => {
  if (!auth || !db) return res.status(500).json({ error: 'Firebase not initialized' });
  const { email } = req.body;
  try {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found') {
        return res.status(404).json({ error: 'User not found in Firebase Auth' });
      }
      throw authErr;
    }
    
    await auth.deleteUser(userRecord.uid);
    await db.collection('users').doc(userRecord.uid).delete();
    console.log(`User ${email} successfully wiped ✅`);
    res.status(200).json({ message: 'User wiped successfully ✅' });
  } catch (error) {
    console.error('Deletion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generic Email API
app.post('/send-email', async (req, res) => {
  const { to, subject, html } = req.body;
  try {
    await transporter.sendMail({
      from: `"Smart League" <${process.env.EMAIL_USER}>`,
      to, subject, html,
    });
    res.status(200).json({ message: 'Email sent successfully ✅' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send email ❌' });
  }
});

// Local Upload API
app.post('/upload-local', upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const baseUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000';
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
    res.status(200).json({ url: fileUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload file locally' });
  }
});

app.get('/', (req, res) => res.send('Smart League API is running...'));

// GLOBAL ERROR HANDLER - No more mysterious 500 errors!
app.use((err, req, res, next) => {
  console.error("SERVER CRASH PREVENTED:", err);
  res.status(500).json({ 
    error: "Internal Server Error", 
    details: err.message,
    code: err.code 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
