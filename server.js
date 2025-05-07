const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'mi-tv-secret',
  resave: false,
  saveUninitialized: true
}));

// Middleware to protect admin routes
function requireLogin(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect('/login.html');
}

// Load and save room data
function loadRooms() {
  return JSON.parse(fs.readFileSync('rooms.json', 'utf-8'));
}

function saveRooms(rooms) {
  fs.writeFileSync('rooms.json', JSON.stringify(rooms, null, 2));
}

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '1234') {
    req.session.loggedIn = true;
    res.redirect('/');
  } else {
    res.send('Invalid credentials. <a href="/login.html">Try again</a>');
  }
});

// Admin panel route (protected)
app.get('/', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API routes (protected)
app.get('/api/rooms', requireLogin, (req, res) => {
  const rooms = loadRooms();
  res.json(rooms);
});

app.post('/api/rooms', requireLogin, (req, res) => {
  const rooms = loadRooms();
  const { room, guest } = req.body;
  if (!room || !guest) return res.status(400).json({ error: "Missing room or guest" });
  if (rooms.find(r => r.room === room)) return res.status(400).json({ error: "Room already exists" });

  rooms.push({ room, guest });
  saveRooms(rooms);
  res.json({ message: "Room added" });
});

app.put('/api/rooms/:room', requireLogin, (req, res) => {
  const rooms = loadRooms();
  const roomNumber = parseInt(req.params.room);
  const index = rooms.findIndex(r => r.room === roomNumber);
  if (index === -1) return res.status(404).json({ error: "Room not found" });

  rooms[index].guest = req.body.guest;
  saveRooms(rooms);
  res.json({ message: "Guest updated" });
});

// Guest-facing welcome screen (public)
app.get('/room/:room', (req, res) => {
  const rooms = loadRooms();
  const room = parseInt(req.params.room);
  const guestInfo = rooms.find(r => r.room === room);

  if (!guestInfo) return res.status(404).send("Room not found");

  res.send(`<html><head><title>Welcome</title></head>
  <body style="font-family:sans-serif;text-align:center;margin-top:20%;">
    <h1>Welcome, ${guestInfo.guest}!</h1>
    <p>Room ${guestInfo.room}</p>
  </body></html>`);
});

app.listen(PORT, () => {
  console.log("Server running at http://localhost:" + PORT);
});
