const superagent = require('superagent')
const User = require('../models/users')
const jwt = require('jsonwebtoken')

const TOKEN_SERVER_URL = 'https://oauth2.googleapis.com/token'
const CLIENT_ID = '658078245679-9challjqn1drnapsmb4q2n27amg1u5sm.apps.googleusercontent.com'
const CLIENT_SECRET = process.env.GOOGLE_APP_CLIENT_SECRET
const API_SERVER = 'http://localhost:3000/oauth'

async function exchangeCodeForToken (code) {
  const response = await superagent
    .post(TOKEN_SERVER_URL)
    .send({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: API_SERVER
    })
  return response.body
}

async function getUser (username) {
  // do we already have the user created?
  const potentialUser = await User.findOne({ username })
  let user
  if (!potentialUser) {
    // create the user
    const newUser = new User({ username })
    user = await newUser.save()
  } else {
    user = potentialUser
  }
  const token = user.generateToken()
  return [user, token]
}

async function handleOauth (req, res, next) {
  try {
    const { code } = req.query
    console.log('(1) CODE:', code)
    const remoteToken = await exchangeCodeForToken(req.query.code)
    const userInfo = jwt.decode(remoteToken.id_token, { complete: true })
    console.log('User info: ', userInfo)
    console.log('(2) ACCESS TOKEN:', remoteToken.access_token)
    const remoteUsername = userInfo.payload.email
    console.log('(3) GOOGLE USER:', remoteUsername)
    const [user, token] = await getUser(remoteUsername)
    req.user = user
    req.token = token
    console.log('(4a) LOCAL USER:', user)
    console.log('(4b) USERS TOKEN:', token)
    next()
  } catch (err) {
    next(`ERROR: ${err.message}`)
  }
}

module.exports = handleOauth
