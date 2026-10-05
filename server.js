require ('dotenv').config();
const express = require("express");
const session = require("cookie-session")
const app = express();
const path = require("path")
const {MongoClient} = require('mongodb');

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"))
})

app.get("/index.html", (req, res) => {
  res.redirect("/")
})

app.use(express.static("public"));
app.use(express.urlencoded({extended: true}))
app.use(express.json())

app.use(session({
  name: 'vampire-game-session',
  keys: ['vampire-secret-key-1', 'vampire-secret-key-2'],
}))

const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@${process.env.HOST}`
const client = new MongoClient(uri)

let usersCollection = null
let scoresCollection = null

async function run(){
  try{
    await client.connect()
    const db = client.db('vampire_game')
    usersCollection = db.collection('users')
    scoresCollection = db.collection('scores')
    console.log("Successfully connected to MongoDB Atlas")
  }
  catch(err){
    console.log("Failed to connect to MongoDB Atlas: ", err)
  }
}
run()

app.use((req, res, next) => {
  if (usersCollection !== null && scoresCollection !== null) {
    next()
  } else {
    res.status(401).send('Server starting up, try again shortly')
  }
})

function requireAuth(req, res, next) {
  if (req.session && req.session.username) {
    next()
  } else {
    res.status(401).json({ error: 'Unauthorized. Please log in.' })
  }
}

app.post('/login', async(req, res) => {
  console.log("login attempt")
  const {username, password} = req.body

  if(!username || !password){
    return res.status(400).json({ error: 'Username or Password is required' })
  }

  try{
    const existingUser = await usersCollection.findOne({username})
    if(existingUser){
      if(existingUser.password === password){
        req.session.username = username
        return res.json({ success: true, message: 'Logged in successfully', username })
      }
      else{
        return res.status(401).json({ error: 'Incorrect password' })
      }
    }
    else{
      await usersCollection.insertOne({username: username, password: password})
      req.session.username = username
      return res.json({ success: true, message: 'Logged in successfully', username })
    }
  }
  catch(err){
    console.error('Login error:', err)
    res.status(500).json({ error: 'Server error during login' })
  }
})


app.post('/logout', (req, res) => {
  req.session = null
  res.json({ success: true, message: 'Logged out successfully' })
})


app.get('/api/user', (req, res) => {
  if(req.session && req.session.username){
    res.json({loggedIn: true, username: req.session.username})
  }
  else{
    res.json({loggedIn: false})
  }
})


app.get('/api/leaderboard', async (req, res) => {
  try{
    const topScores = await scoresCollection
        .find({})
        .sort({score: -1})
        .limit(10)
        .toArray()
    res.json(topScores)
  }
  catch(err){
    console.error('Leaderboard error:', err)
    res.status(500).json({error: 'Failed to fetch leaderboard'})
  }
})


app.post('/api/score', requireAuth, async(req, res) => {
  const {score} = req.body
  if(score === undefined || typeof score !== 'number'){
    return res.status(400).json({error: 'Invalid score'})
  }
  try{
    const scoreEntry = {
      username: req.session.username,
      score: score,
      date: new Date()
    }
    await scoresCollection.insertOne(scoreEntry)
    res.json({ success: true, message: 'Score saved successfully' })
  }
  catch(err){
    console.error('Score submission error:', err)
    res.status(500).json({ error: 'Failed to save score' })
  }
})


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
